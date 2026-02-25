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
