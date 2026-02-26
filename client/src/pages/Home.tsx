import { useState, useMemo } from "react";
import { Loader2, AlertCircle, BookOpen, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { ImportantNewsCard } from "@/components/ImportantNewsCard";
import { SearchBar } from "@/components/SearchBar";
import { CategoryCard } from "@/components/CategoryCard";
import { ItemCard } from "@/components/ItemCard";
import { ContentDrawer } from "@/components/ContentDrawer";
import { CategoryDrawer } from "@/components/CategoryDrawer";
import { useAppData, searchItems } from "@/hooks/use-app-data";
import { getCategoryColor } from "@/lib/categoryColors";
import { markCategoryOpened, getCategoryUnseenCount, markItemsSeen } from "@/lib/categoryTracking";
import { isAdminMode } from "@/lib/adminMode";
import { isLibraryRead, markLibraryRead } from "@/lib/readTracking";
import type { Category, Item, LibraryItem } from "@shared/schema";

function extractSnippet(text: string, query: string, contextLen = 100): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - contextLen);
  const end = Math.min(text.length, idx + query.length + contextLen);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm px-0.5 font-semibold not-italic">
            {part}
          </mark>
        ) : part
      )}
    </>
  );
}

function fileTypeIconColor(fileType: string): string {
  switch (fileType) {
    case "pdf": return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    case "docx": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    case "xlsx": return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    case "pptx": return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400";
    default: return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
  }
}

function fileTypeLabel(fileType: string): string {
  switch (fileType) {
    case "pdf": return "PDF";
    case "docx": return "Word";
    case "xlsx": return "Excel";
    case "pptx": return "Slides";
    default: return "Link";
  }
}

export default function Home() {
  const { data, isLoading, isError } = useAppData();
  const { data: libraryData } = useQuery<LibraryItem[]>({ queryKey: ["/api/library"], staleTime: 60000 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedContentItem, setSelectedContentItem] = useState<Item | null>(null);
  const [badgeTick, setBadgeTick] = useState(0);
  const [, setLocation] = useLocation();

  const libraryItems = libraryData ?? [];

  const { libraryNameMatches, libraryKeywordMatches } = useMemo(() => {
    if (!searchQuery.trim() || libraryItems.length === 0) {
      return { libraryNameMatches: [] as LibraryItem[], libraryKeywordMatches: [] as LibraryItem[] };
    }
    const q = searchQuery.toLowerCase().trim();
    const nameMatches = libraryItems.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      (item.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
      (item.summary ?? "").toLowerCase().includes(q)
    );
    const nameMatchIds = new Set(nameMatches.map((i) => i.id));
    const keywordMatches = libraryItems.filter(
      (item) => !nameMatchIds.has(item.id) && item.searchText?.toLowerCase().includes(q)
    );
    return { libraryNameMatches: nameMatches, libraryKeywordMatches: keywordMatches };
  }, [searchQuery, libraryItems]);

  const handleLibraryItemClick = (item: LibraryItem, query?: string) => {
    markLibraryRead(item.id);
    if (item.fileType === "pdf" && item.source === "upload") {
      const path = query ? `/viewer/${item.id}?q=${encodeURIComponent(query)}` : `/viewer/${item.id}`;
      setLocation(path);
    } else {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-medium text-sm text-muted-foreground animate-pulse">Loading resources...</p>
        </div>
      </MobileLayout>
    );
  }

  if (isError || !data) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full px-6 text-center space-y-3">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-2">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">Unable to load data</h2>
          <p className="text-sm text-muted-foreground">Please check your connection and try again later.</p>
        </div>
      </MobileLayout>
    );
  }

  const { categories, items } = data;
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching ? searchItems(items, searchQuery) : [];
  const totalDocResults = libraryNameMatches.length + libraryKeywordMatches.length;
  const totalResults = searchResults.length + totalDocResults;

  const handleItemClick = (item: Item) => {
    if (item.type === "content") {
      setSelectedContentItem(item);
    }
  };

  const handleCategoryClick = (category: Category) => {
    markCategoryOpened(category.id, items);
    markItemsSeen(items.filter((i) => i.categoryId === category.id).map((i) => i.id));
    setBadgeTick((t) => t + 1);
    setSelectedCategory(category);
  };

  return (
    <MobileLayout>
      <div className="pb-8">
        {!isSearching && <ImportantNewsCard />}

        <div className={isSearching ? "" : "mt-2"}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="px-4 mt-4">
          {isSearching ? (
            <div className="space-y-5">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Search Results ({totalResults})
              </h2>

              {/* Resources section */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    Resources ({searchResults.length})
                  </p>
                  <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
                    {searchResults.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={handleItemClick}
                        categoryColor={getCategoryColor(item.categoryId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Library documents — by file name */}
              {libraryNameMatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    Documents — By Title ({libraryNameMatches.length})
                  </p>
                  <div className="space-y-2">
                    {libraryNameMatches.map((item) => {
                      const read = isLibraryRead(item.id);
                      return (
                        <button
                          key={item.id}
                          data-testid={`card-doc-name-${item.id}`}
                          onClick={() => handleLibraryItemClick(item)}
                          className="w-full flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${fileTypeIconColor(item.fileType)}`}>
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm text-primary leading-snug">
                                {!read && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 mb-0.5 align-middle" />
                                )}
                                <HighlightedText text={item.title} query={searchQuery.trim()} />
                              </p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${fileTypeIconColor(item.fileType)}`}>
                                  {fileTypeLabel(item.fileType)}
                                </span>
                                {item.fileType !== "pdf" && <ExternalLink className="w-3 h-3 text-muted-foreground/50" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{item.bucket}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Library documents — by keyword inside document */}
              {libraryKeywordMatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    Documents — Inside Text ({libraryKeywordMatches.length})
                  </p>
                  <div className="space-y-2">
                    {libraryKeywordMatches.map((item) => {
                      const snippet = item.searchText ? extractSnippet(item.searchText, searchQuery.trim()) : "";
                      const read = isLibraryRead(item.id);
                      return (
                        <button
                          key={item.id}
                          data-testid={`card-doc-keyword-${item.id}`}
                          onClick={() => handleLibraryItemClick(item, searchQuery.trim())}
                          className="w-full flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left"
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${fileTypeIconColor(item.fileType)}`}>
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm text-primary leading-snug">
                                {!read && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 mb-0.5 align-middle" />
                                )}
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${fileTypeIconColor(item.fileType)}`}>
                                  {fileTypeLabel(item.fileType)}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{item.bucket}</p>
                            {snippet && (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">
                                <HighlightedText text={snippet} query={searchQuery.trim()} />
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No results at all */}
              {totalResults === 0 && (
                <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-secondary/50">
                  <p className="text-sm font-medium text-foreground">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try different keywords, or index PDFs in admin panel for full-text search</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider ml-1">
                Browse Resources
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <CategoryCard
                    key={`${category.id}-${badgeTick}`}
                    category={category}
                    updatesCount={getCategoryUnseenCount(category.id, items)}
                    onClick={() => handleCategoryClick(category)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CategoryDrawer
        category={selectedCategory}
        items={items.filter(i => i.categoryId === selectedCategory?.id)}
        isOpen={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
        onItemClick={handleItemClick}
        adminMode={isAdminMode()}
      />

      <ContentDrawer
        item={selectedContentItem}
        isOpen={selectedContentItem !== null}
        onClose={() => setSelectedContentItem(null)}
      />
    </MobileLayout>
  );
}
