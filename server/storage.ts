import fs from "fs/promises";
import path from "path";
import { type AppData } from "@shared/schema";

export interface IStorage {
  getAppData(): Promise<AppData>;
}

export class FileStorage implements IStorage {
  async getAppData(): Promise<AppData> {
    const filePath = path.resolve(process.cwd(), "shared/appData.json");
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as AppData;
  }
}

export const storage = new FileStorage();
