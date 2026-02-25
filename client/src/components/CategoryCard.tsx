import { Folder, ChevronRight } from "lucide-react";
import type { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
  updatesCount: number;
  onClick: () => void;
}

export function CategoryCard({ category, updatesCount, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card p-4 rounded-lg border border-border/60 shadow-sm shadow-black/[0.02] hover:shadow-md hover:border-primary/20 transition-all duration-200 active:scale-[0.98] group flex items-start justify-between"
    >
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Folder className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-base">
            {category.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap to view resources
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-end space-y-2">
        {updatesCount > 0 ? (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-sm">
            {updatesCount} New
          </span>
        ) : (
          <div className="h-4" /> /* Spacer to keep alignment */
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}
