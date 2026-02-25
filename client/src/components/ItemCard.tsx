import { FileText, ExternalLink, ChevronRight, Clock } from "lucide-react";
import { isRecentlyUpdated } from "@/hooks/use-app-data";
import { format, parseISO } from "date-fns";
import type { Item } from "@shared/schema";

interface ItemCardProps {
  item: Item;
  onClick?: (item: Item) => void;
  categoryColor?: string;
}

export function ItemCard({ item, onClick, categoryColor }: ItemCardProps) {
  const isRecent = isRecentlyUpdated(item.lastUpdated);
  const isLink = item.type === "link";

  const handleClick = () => {
    if (isLink && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else if (onClick) {
      onClick(item);
    }
  };

  const formattedDate = item.lastUpdated
    ? format(parseISO(item.lastUpdated), "MMM d, yyyy")
    : "";

  const tagClass = categoryColor
    ? `px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded-[2px] border ${categoryColor}`
    : "px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-secondary text-muted-foreground rounded-[2px] border border-border/50";

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-4 bg-card border-b border-border/50 hover:bg-secondary/50 transition-colors active:bg-secondary flex items-start space-x-3 group first:rounded-t-lg last:border-b-0 last:rounded-b-lg"
    >
      <div className="mt-0.5 text-muted-foreground/60 group-hover:text-primary transition-colors">
        {isLink ? (
          <ExternalLink className="w-5 h-5" strokeWidth={2} />
        ) : (
          <FileText className="w-5 h-5" strokeWidth={2} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground leading-snug truncate whitespace-normal line-clamp-2">
            {item.title}
          </h4>
          {isRecent && (
            <span className="shrink-0 inline-block w-2 h-2 mt-1.5 rounded-full bg-primary" />
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2 mt-2">
          <div className="flex items-center text-[10px] text-muted-foreground font-medium">
            <Clock className="w-3 h-3 mr-1" />
            {formattedDate}
          </div>

          {item.tags.slice(0, 2).map(tag => (
            <span key={tag} className={tagClass}>
              {tag}
            </span>
          ))}
          {item.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground/50 font-medium">
              +{item.tags.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 self-center pl-2 text-muted-foreground/30 group-hover:text-primary transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}
