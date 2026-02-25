import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { differenceInDays, parseISO } from "date-fns";
import type { AppData, Item, News } from "@shared/schema";

const RECENT_DAYS = 14;

export function useAppData() {
  return useQuery({
    queryKey: [api.data.get.path],
    queryFn: async () => {
      const res = await fetch(api.data.get.path, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch application data");
      }
      const data = await res.json();
      return api.data.get.responses[200].parse(data);
    },
  });
}

// Utility functions to process the data according to business rules
export function isRecentlyUpdated(dateString?: string): boolean {
  if (!dateString) return false;
  try {
    const date = parseISO(dateString);
    return differenceInDays(new Date(), date) <= RECENT_DAYS;
  } catch (e) {
    return false;
  }
}

export function getRecentUpdatesCount(items?: Item[]): number {
  if (!items) return 0;
  return items.filter((item) => isRecentlyUpdated(item.lastUpdated)).length;
}

export function getCategoryUpdatesCount(categoryId: string, items?: Item[]): number {
  if (!items) return 0;
  return items.filter(
    (item) => item.categoryId === categoryId && isRecentlyUpdated(item.lastUpdated)
  ).length;
}

export function searchItems(items: Item[], query: string): Item[] {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase().trim();
  
  return items.filter((item) => {
    const matchTitle = item.title.toLowerCase().includes(lowerQuery);
    const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
    const matchContent = item.content?.toLowerCase().includes(lowerQuery) || false;
    // Category searching would require joining the category title, 
    // but typically tags/title/content is sufficient for the item itself.
    return matchTitle || matchTags || matchContent;
  });
}
