import type { Express } from "express";
import { type Server } from "http";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertNewsItemSchema, insertLibraryItemSchema } from "@shared/schema";

function getAdminPin(): string {
  return process.env.REPLIT_ADMIN_PIN ?? process.env.REPLIT_NEWS_ADMIN_PIN ?? "";
}

function inferFileType(mimetype: string, originalname: string): "pdf" | "docx" | "xlsx" | "pptx" | "link" {
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || originalname.endsWith(".docx")) return "docx";
  if (mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || originalname.endsWith(".xlsx")) return "xlsx";
  if (mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || originalname.endsWith(".pptx")) return "pptx";
  return "link";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.data.get.path, async (req, res) => {
    try {
      const data = await storage.getAppData();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load app data" });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const items = await storage.getNewsItems();
      const now = new Date();
      const active = items.filter(
        (item) => item.pinned === true || !item.expiresAt || new Date(item.expiresAt) > now
      );
      const expired = items.filter(
        (item) => !item.pinned && item.expiresAt && new Date(item.expiresAt) <= now
      );
      res.json({ active, expired });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load news" });
    }
  });

  app.post("/api/news/verify-pin", async (req, res) => {
    const adminPin = getAdminPin();
    const { pin } = req.body;
    if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
    if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });
    return res.json({ ok: true });
  });

  app.post("/api/news", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const { pin, ...body } = req.body;

      if (!adminPin) {
        return res.status(500).json({ message: "Admin PIN not configured" });
      }
      if (pin !== adminPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const parsed = insertNewsItemSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }

      const { title, expiresAt, pinned } = parsed.data;
      if (!title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!pinned) {
        if (!expiresAt) {
          return res.status(400).json({ message: "Expiry date is required for non-pinned items" });
        }
        const expiresDate = new Date(expiresAt);
        if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
          return res.status(400).json({ message: "Expiry must be a valid future datetime" });
        }
      }

      const newItem = {
        id: Date.now().toString(),
        title: parsed.data.title.trim(),
        body: parsed.data.body ?? "",
        createdAt: new Date().toISOString(),
        ...(pinned ? { pinned: true } : { expiresAt: parsed.data.expiresAt }),
      };

      await storage.saveNewsItem(newItem);
      res.status(201).json(newItem);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to save news item" });
    }
  });

  app.put("/api/news/:id", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const { pin, title, body, expiresAt, pinned } = req.body;

      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });
      if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });

      if (!pinned) {
        if (!expiresAt) return res.status(400).json({ message: "Expiry date is required for non-pinned items" });
        const expiresDate = new Date(expiresAt);
        if (isNaN(expiresDate.getTime())) return res.status(400).json({ message: "Invalid expiry date" });
      }

      const items = await storage.getNewsItems();
      const idx = items.findIndex((i) => i.id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: "News item not found" });

      const updated = {
        ...items[idx],
        title: title.trim(),
        body: body ?? "",
        ...(pinned ? { pinned: true, expiresAt: undefined } : { pinned: false, expiresAt }),
      };
      items[idx] = updated;
      await storage.saveAllNewsItems(items);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update news item" });
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const pin = req.headers["x-admin-pin"] as string;

      if (!adminPin) {
        return res.status(500).json({ message: "Admin PIN not configured" });
      }
      if (pin !== adminPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      await storage.deleteNewsItem(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete news item" });
    }
  });

  app.get("/api/library", async (req, res) => {
    try {
      const items = await storage.getLibraryItems();
      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json(sorted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to load library" });
    }
  });

  app.post("/api/library", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const { pin, ...body } = req.body;

      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });

      const parsed = insertLibraryItemSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }

      const now = new Date().toISOString();
      const newItem = {
        ...parsed.data,
        id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
        tags: parsed.data.tags ?? [],
      };

      await storage.saveLibraryItem(newItem);
      res.status(201).json(newItem);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to save library item" });
    }
  });

  app.put("/api/library/:id", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const { pin, ...updates } = req.body;

      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });

      const updated = await storage.updateLibraryItem(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: "Library item not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update library item" });
    }
  });

  app.delete("/api/library/:id", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const pin = req.headers["x-admin-pin"] as string;

      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });

      const deleted = await storage.deleteLibraryItem(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Library item not found" });

      if (deleted.source === "upload" && deleted.url) {
        const filePath = path.resolve(process.cwd(), deleted.url.replace(/^\//, ""));
        try {
          await fs.unlink(filePath);
        } catch {
          // file may not exist, ignore
        }
      }

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete library item" });
    }
  });

  app.post("/api/library/:id/index", async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const pin = req.headers["x-admin-pin"] as string;
      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });

      const items = await storage.getLibraryItems();
      const item = items.find((i) => i.id === req.params.id);
      if (!item) return res.status(404).json({ message: "Library item not found" });
      if (item.fileType !== "pdf") return res.status(400).json({ message: "Only PDF items can be indexed" });
      if (item.source !== "upload") return res.status(400).json({ message: "Only uploaded PDFs can be indexed (URL-based PDFs not supported)" });

      const filePath = path.resolve(process.cwd(), item.url.replace(/^\//, ""));
      const buffer = await fs.readFile(filePath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      const searchText = data.text.replace(/\s+/g, " ").trim();

      await storage.updateLibraryItem(item.id, { searchText } as any);
      res.json({ ok: true, chars: searchText.length });
    } catch (err: any) {
      console.error("PDF index error:", err);
      res.status(500).json({ message: err?.message ?? "Failed to extract PDF text" });
    }
  });

  app.post("/api/upload", upload.array("files", 20), async (req, res) => {
    try {
      const adminPin = getAdminPin();
      const pin = req.headers["x-admin-pin"] as string;

      if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
      if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const results = files.map((file) => ({
        url: `/uploads/${file.filename}`,
        fileType: inferFileType(file.mimetype, file.originalname),
        originalName: file.originalname,
        filename: file.filename,
      }));

      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  return httpServer;
}
