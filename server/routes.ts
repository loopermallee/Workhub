import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertNewsItemSchema } from "@shared/schema";

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
    const adminPin = process.env.REPLIT_NEWS_ADMIN_PIN;
    const { pin } = req.body;
    if (!adminPin) return res.status(500).json({ message: "Admin PIN not configured" });
    if (pin !== adminPin) return res.status(401).json({ message: "Invalid PIN" });
    return res.json({ ok: true });
  });

  app.post("/api/news", async (req, res) => {
    try {
      const adminPin = process.env.REPLIT_NEWS_ADMIN_PIN;
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
      const adminPin = process.env.REPLIT_NEWS_ADMIN_PIN;
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
      const adminPin = process.env.REPLIT_NEWS_ADMIN_PIN;
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

  return httpServer;
}
