import type { Item } from "@shared/schema";
import { isRecentlyUpdated } from "@/hooks/use-app-data";

const CATEGORY_SEEN_KEY = "category:seen";
const ITEMS_SEEN_KEY = "items:seen";

function getSeenMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(CATEGORY_SEEN_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveSeenMap(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(CATEGORY_SEEN_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getSeenItemsSet(): Set<string> {
  try {
    const raw = localStorage.getItem(ITEMS_SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeenItemsSet(set: Set<string>): void {
  try {
    localStorage.setItem(ITEMS_SEEN_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function isItemSeen(itemId: string): boolean {
  return getSeenItemsSet().has(itemId);
}

export function markItemSeen(itemId: string): void {
  const set = getSeenItemsSet();
  set.add(itemId);
  saveSeenItemsSet(set);
}

export function markItemsSeen(itemIds: string[]): void {
  const set = getSeenItemsSet();
  itemIds.forEach((id) => set.add(id));
  saveSeenItemsSet(set);
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
