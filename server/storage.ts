import fs from "fs/promises";
import path from "path";
import { type AppData, type NewsItem, type LibraryItem, type Item } from "@shared/schema";

export interface IStorage {
  getAppData(): Promise<AppData>;
  addAppDataItem(item: Item): Promise<void>;
  deleteAppDataItem(id: string): Promise<Item | null>;
  reorderAppDataItems(categoryId: string, itemIds: string[]): Promise<void>;
  getNewsItems(): Promise<NewsItem[]>;
  saveNewsItem(item: NewsItem): Promise<void>;
  saveAllNewsItems(items: NewsItem[]): Promise<void>;
  deleteNewsItem(id: string): Promise<void>;
  getLibraryItems(): Promise<LibraryItem[]>;
  saveLibraryItem(item: LibraryItem): Promise<void>;
  updateLibraryItem(id: string, updates: Partial<LibraryItem>): Promise<LibraryItem | null>;
  deleteLibraryItem(id: string): Promise<LibraryItem | null>;
  reorderLibraryItems(bucket: string, itemIds: string[]): Promise<void>;
}

export class FileStorage implements IStorage {
  async getAppData(): Promise<AppData> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as AppData;
  }

  async addAppDataItem(item: Item): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const appData = await this.getAppData();
    appData.items.push(item);
    await fs.writeFile(filePath, JSON.stringify(appData, null, 2), "utf-8");
  }

  async deleteAppDataItem(id: string): Promise<Item | null> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const appData = await this.getAppData();
    const item = appData.items.find((i) => i.id === id);
    if (!item) return null;
    appData.items = appData.items.filter((i) => i.id !== id);
    await fs.writeFile(filePath, JSON.stringify(appData, null, 2), "utf-8");
    return item;
  }

  async reorderAppDataItems(categoryId: string, itemIds: string[]): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const appData = await this.getAppData();
    const nonCategory = appData.items.filter((i) => i.categoryId !== categoryId);
    const categoryItems = appData.items.filter((i) => i.categoryId === categoryId);
    const idToItem = new Map(categoryItems.map((i) => [i.id, i]));
    const reordered = itemIds.map((id) => idToItem.get(id)).filter(Boolean) as Item[];
    const remaining = categoryItems.filter((i) => !itemIds.includes(i.id));
    appData.items = [...nonCategory, ...reordered, ...remaining];
    await fs.writeFile(filePath, JSON.stringify(appData, null, 2), "utf-8");
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

  async saveAllNewsItems(items: NewsItem[]): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/newsData.json");
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
  }

  async deleteNewsItem(id: string): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/newsData.json");
    const items = await this.getNewsItems();
    const filtered = items.filter((item) => item.id !== id);
    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf-8");
  }

  async getLibraryItems(): Promise<LibraryItem[]> {
    const filePath = path.resolve(process.cwd(), "shared/libraryData.json");
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as LibraryItem[];
    } catch {
      return [];
    }
  }

  async saveLibraryItem(item: LibraryItem): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/libraryData.json");
    const items = await this.getLibraryItems();
    items.unshift(item);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
  }

  async updateLibraryItem(id: string, updates: Partial<LibraryItem>): Promise<LibraryItem | null> {
    const filePath = path.resolve(process.cwd(), "shared/libraryData.json");
    const items = await this.getLibraryItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, id, updatedAt: new Date().toISOString() };
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
    return items[idx];
  }

  async deleteLibraryItem(id: string): Promise<LibraryItem | null> {
    const filePath = path.resolve(process.cwd(), "shared/libraryData.json");
    const items = await this.getLibraryItems();
    const item = items.find((i) => i.id === id);
    if (!item) return null;
    const filtered = items.filter((i) => i.id !== id);
    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf-8");
    return item;
  }

  async reorderLibraryItems(bucket: string, itemIds: string[]): Promise<void> {
    const filePath = path.resolve(process.cwd(), "shared/libraryData.json");
    const items = await this.getLibraryItems();
    const nonBucket = items.filter((i) => i.bucket !== bucket);
    const bucketItems = items.filter((i) => i.bucket === bucket);
    const idToItem = new Map(bucketItems.map((i) => [i.id, i]));
    const reordered = itemIds.map((id) => idToItem.get(id)).filter(Boolean) as LibraryItem[];
    const remaining = bucketItems.filter((i) => !itemIds.includes(i.id));
    const newItems = [...nonBucket, ...reordered, ...remaining];
    await fs.writeFile(filePath, JSON.stringify(newItems, null, 2), "utf-8");
  }
}

export const storage = new FileStorage();
