import { z } from "zod";

export const newsSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  isNew: z.boolean().optional(),
  link: z.string().optional()
});

export const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  pinned: z.boolean().optional(),
});

export const insertNewsItemSchema = newsItemSchema.omit({ id: true, createdAt: true });
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;

export const categorySchema = z.object({
  id: z.string(),
  title: z.string()
});

export const itemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  title: z.string(),
  type: z.enum(["link", "content"]),
  url: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()),
  lastUpdated: z.string()
});

export const appDataSchema = z.object({
  news: z.array(newsSchema),
  categories: z.array(categorySchema),
  items: z.array(itemSchema)
});

export type News = z.infer<typeof newsSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Item = z.infer<typeof itemSchema>;
export type AppData = z.infer<typeof appDataSchema>;

export const libraryItemSchema = z.object({
  id: z.string(),
  bucket: z.enum(["SOP", "Protocols", "Others"]),
  title: z.string(),
  fileType: z.enum(["pdf", "docx", "xlsx", "pptx", "google", "link"]),
  source: z.enum(["upload", "url"]),
  url: z.string(),
  version: z.string().optional(),
  lastUpdated: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  summary: z.string().optional(),
  patientType: z.enum(["adult", "paed"]).nullable().optional(),
  searchText: z.string().optional(),
});

export const insertLibraryItemSchema = libraryItemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLibraryItem = z.infer<typeof insertLibraryItemSchema>;
export type LibraryItem = z.infer<typeof libraryItemSchema>;
