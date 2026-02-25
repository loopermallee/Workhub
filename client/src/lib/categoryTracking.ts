import type { Item } from "@shared/schema";
import { isRecentlyUpdated } from "@/hooks/use-app-data";

const STORAGE_KEY = "category:seen";

function getSeenMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveSeenMap(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function markCategoryOpened(categoryId: string, items: Item[]): void {
  const map = getSeenMap();
  const categoryItems = items.filter((i) => i.categoryId === categoryId);
  const existingSeen = new Set(map[categoryId] ?? []);
  categoryItems.forEach((i) => existingSeen.add(i.id));
  map[categoryId] = Array.from(existingSeen);
  saveSeenMap(map);
}

export function getCategoryUnseenCount(categoryId: string, items: Item[]): number {
  const map = getSeenMap();
  const seen = new Set(map[categoryId] ?? []);
  return items.filter(
    (i) => i.categoryId === categoryId && isRecentlyUpdated(i.lastUpdated) && !seen.has(i.id)
  ).length;
}
