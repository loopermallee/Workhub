import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
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
import type { Category, Item } from "@shared/schema";

export default function Home() {
  const { data, isLoading, isError } = useAppData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedContentItem, setSelectedContentItem] = useState<Item | null>(null);
  const [badgeTick, setBadgeTick] = useState(0);

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
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h2>

              {searchResults.length > 0 ? (
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
              ) : (
                <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl bg-secondary/50">
                  <p className="text-sm font-medium text-foreground">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search terms</p>
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
      />

      <ContentDrawer
        item={selectedContentItem}
        isOpen={selectedContentItem !== null}
        onClose={() => setSelectedContentItem(null)}
      />
    </MobileLayout>
  );
}
