import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, CheckCircle, Pin } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsItem } from "@shared/schema";

interface NewsResponse {
  active: NewsItem[];
  expired: NewsItem[];
}

const READ_KEY = "news:read";

function getReadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
}

function markRead(id: string) {
  const ids = getReadIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  }
}

function formatDate(iso: string | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NewsItemCardProps {
  item: NewsItem;
  isExpired?: boolean;
}

function NewsItemCard({ item, isExpired }: NewsItemCardProps) {
  const [isRead, setIsRead] = useState(() => getReadIds().includes(item.id));

  const handleTap = () => {
    markRead(item.id);
    setIsRead(true);
  };

  return (
    <div
      data-testid={`card-news-${item.id}`}
      onClick={handleTap}
      className={`p-4 rounded-xl border transition-colors cursor-pointer ${
        isExpired
          ? "bg-muted/40 border-border/50 opacity-70"
          : isRead
          ? "bg-secondary/40 border-border"
          : "bg-background border-border shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3
            data-testid={`text-news-title-${item.id}`}
            className={`text-sm font-semibold leading-snug ${
              isExpired ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {item.title}
          </h3>
          {item.pinned && !isExpired && (
            <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isRead && !isExpired && (
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
          )}
          {isExpired && (
            <Badge
              data-testid={`badge-expired-${item.id}`}
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30"
            >
              Expired
            </Badge>
          )}
        </div>
      </div>
      {item.body && (
        <p
          data-testid={`text-news-body-${item.id}`}
          className={`text-xs leading-relaxed mt-1 ${
            isExpired ? "text-muted-foreground/70" : "text-muted-foreground"
          }`}
        >
          {item.body}
        </p>
      )}
      <div className="flex items-center gap-1 mt-2">
        <Clock className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[11px] text-muted-foreground/60">
          {formatDate(item.createdAt)}
        </span>
        {isExpired && item.expiresAt && (
          <span className="text-[11px] text-muted-foreground/50 ml-2">
            · Expired {formatDate(item.expiresAt)}
          </span>
        )}
        {!isExpired && item.pinned && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-2 font-medium">
            · Pinned
          </span>
        )}
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<NewsResponse>({ queryKey: ["/api/news"] });

  const active = data?.active ?? [];
  const expired = data?.expired ?? [];

  return (
    <MobileLayout>
      <div className="pb-8">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/")}
            className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg text-foreground">News</h1>
        </div>

        <div className="px-4 space-y-6 mt-2">
          <section>
            <h2
              data-testid="section-active-news"
              className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3"
            >
              Current
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-secondary/30">
                <p className="text-sm font-medium text-muted-foreground">No active news</p>
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((item) => (
                  <NewsItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2
              data-testid="section-expired-news"
              className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3"
            >
              Past
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : expired.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-secondary/30">
                <p className="text-sm font-medium text-muted-foreground">No past news</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expired.map((item) => (
                  <NewsItemCard key={item.id} item={item} isExpired />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MobileLayout>
  );
}
