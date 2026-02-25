import type { NewsItem, LibraryItem } from "@shared/schema";

const NEWS_KEY = "news:read";
const LIBRARY_KEY = "library:read";

function getReadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReadSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function markNewsRead(id: string): void {
  const set = getReadSet(NEWS_KEY);
  set.add(id);
  saveReadSet(NEWS_KEY, set);
}

export function isNewsRead(id: string): boolean {
  return getReadSet(NEWS_KEY).has(id);
}

export function getUnreadNewsCount(items: NewsItem[]): number {
  const read = getReadSet(NEWS_KEY);
  return items.filter((i) => !read.has(i.id)).length;
}

export function markLibraryRead(id: string): void {
  const set = getReadSet(LIBRARY_KEY);
  set.add(id);
  saveReadSet(LIBRARY_KEY, set);
}

export function isLibraryRead(id: string): boolean {
  return getReadSet(LIBRARY_KEY).has(id);
}

export function getUnreadLibraryCount(items: LibraryItem[]): number {
  const read = getReadSet(LIBRARY_KEY);
  return items.filter((i) => !read.has(i.id)).length;
}

export function getUnreadLibraryCountForBucket(items: LibraryItem[], bucket: string): number {
  const read = getReadSet(LIBRARY_KEY);
  return items.filter((i) => i.bucket === bucket && !read.has(i.id)).length;
}
