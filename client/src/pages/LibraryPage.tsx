import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, BookOpen, Shield, FolderOpen, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import type { LibraryItem } from "@shared/schema";
import { getUnreadLibraryCountForBucket } from "@/lib/readTracking";

const BUCKETS = [
  {
    id: "SOP",
    label: "SOPs",
    description: "Standard Operating Procedures",
    icon: BookOpen,
    color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  {
    id: "Protocols",
    label: "Protocols",
    description: "Clinical & operational protocols",
    icon: Shield,
    color: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    border: "border-rose-100 dark:border-rose-900/50",
  },
  {
    id: "Others",
    label: "Others",
    description: "Reference documents & links",
    icon: FolderOpen,
    color: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/50",
  },
] as const;

export default function LibraryPage() {
  const [, setLocation] = useLocation();

  const { data: items = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    staleTime: 30000,
  });

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            data-testid="button-back-home"
            onClick={() => setLocation("/")}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold font-display text-primary">Library</h2>
            <p className="text-xs text-muted-foreground">Protocols, SOPs & References</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {BUCKETS.map((bucket) => {
              const bucketItems = items.filter((i) => i.bucket === bucket.id);
              const unread = getUnreadLibraryCountForBucket(items, bucket.id);
              const Icon = bucket.icon;

              return (
                <button
                  key={bucket.id}
                  data-testid={`button-bucket-${bucket.id}`}
                  onClick={() => setLocation(`/library/${bucket.id}`)}
                  className={`w-full flex items-center gap-4 p-4 bg-card border ${bucket.border} rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bucket.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-primary font-display">{bucket.label}</p>
                      {unread > 0 && (
                        <span
                          data-testid={`badge-unread-${bucket.id}`}
                          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full"
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{bucket.description}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {bucketItems.length} {bucketItems.length === 1 ? "document" : "documents"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
