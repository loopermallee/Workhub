import fs from "fs/promises";
import path from "path";
import { type AppData, type NewsItem } from "@shared/schema";

export interface IStorage {
  getAppData(): Promise<AppData>;
  getNewsItems(): Promise<NewsItem[]>;
  saveNewsItem(item: NewsItem): Promise<void>;
  deleteNewsItem(id: string): Promise<void>;
}

export class FileStorage implements IStorage {
  async getAppData(): Promise<AppData> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as AppData;
  }

  async getNewsItems(): Promise<NewsItem[]> {
    const filePath = path.resolve(process.cwd(), "shared/newsData.json");
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as NewsItem[];
    } catch {
      return [];
    }
  }

  async saveNewsItem(item: NewsItem): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/newsData.json");
    const items = await this.getNewsItems();
    items.unshift(item);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
  }

  async deleteNewsItem(id: string): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/newsData.json");
    const items = await this.getNewsItems();
    const filtered = items.filter((item) => item.id !== id);
    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf-8");
  }
}

export const storage = new FileStorage();
