import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Search, FileText, FileSpreadsheet, Presentation,
  ExternalLink, Globe, X, BookOpen
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import type { LibraryItem } from "@shared/schema";
import { markLibraryRead, isLibraryRead } from "@/lib/readTracking";
import { queryClient } from "@/lib/queryClient";

const BUCKET_LABELS: Record<string, string> = {
  SOP: "SOPs",
  Protocols: "Protocols",
  Others: "Others",
};

function fileTypeIcon(fileType: string) {
  switch (fileType) {
    case "pdf": return <BookOpen className="w-4 h-4" />;
    case "docx": return <FileText className="w-4 h-4" />;
    case "xlsx": return <FileSpreadsheet className="w-4 h-4" />;
    case "pptx": return <Presentation className="w-4 h-4" />;
    case "google": return <Globe className="w-4 h-4" />;
    default: return <ExternalLink className="w-4 h-4" />;
  }
}

function fileTypeIconColor(fileType: string): string {
  switch (fileType) {
    case "pdf": return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    case "docx": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    case "xlsx": return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    case "pptx": return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400";
    case "google": return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
    default: return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
  }
}

function fileTypeLabel(fileType: string): string {
  switch (fileType) {
    case "pdf": return "PDF";
    case "docx": return "Word";
    case "xlsx": return "Excel";
    case "pptx": return "Slides";
    case "google": return "Google";
    default: return "Link";
  }
}

function PatientTypeBadge({ patientType }: { patientType: "adult" | "paed" | null | undefined }) {
  if (patientType === "adult") {
    return (
      <span
        data-testid="badge-patient-adult"
        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-blue-600 text-white dark:bg-blue-500"
      >
        Adult
      </span>
    );
  }
  if (patientType === "paed") {
    return (
      <span
        data-testid="badge-patient-paed"
        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-orange-500 text-white dark:bg-orange-400"
      >
        Paed
      </span>
    );
  }
  return (
    <span
      data-testid="badge-patient-protocol"
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 bg-secondary text-muted-foreground"
    >
      Protocol
    </span>
  );
}

function LibraryItemCard({
  item,
  onTap,
  isProtocols,
}: {
  item: LibraryItem;
  onTap: (item: LibraryItem) => void;
  isProtocols: boolean;
}) {
  const read = isLibraryRead(item.id);

  return (
    <button
      data-testid={`card-library-item-${item.id}`}
      onClick={() => onTap(item)}
      className="w-full flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${fileTypeIconColor(item.fileType)}`}>
        {fileTypeIcon(item.fileType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-primary leading-snug">
            {!read && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 mb-0.5 align-middle" />
            )}
            {item.title}
          </p>
          {isProtocols ? (
            <PatientTypeBadge patientType={item.patientType} />
          ) : (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${fileTypeIconColor(item.fileType)}`}>
              {fileTypeLabel(item.fileType)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          {item.version && (
            <span className="text-[11px] text-muted-foreground/70 font-medium">{item.version}</span>
          )}
          {item.lastUpdated && (
            <span className="text-[11px] text-muted-foreground/60">
              Updated {item.lastUpdated}
            </span>
          )}
        </div>

        {item.summary && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.summary}</p>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function LibraryBucketPage() {
  const { bucket } = useParams<{ bucket: string }>();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [, forceUpdate] = useState(0);

  const { data: allItems = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    staleTime: 30000,
  });

  const isProtocols = bucket === "Protocols";
  const bucketItems = allItems.filter((i) => i.bucket === bucket);

  const filtered = search.trim()
    ? bucketItems.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          (item.summary?.toLowerCase().includes(q) ?? false) ||
          (item.version?.toLowerCase().includes(q) ?? false)
        );
      })
    : bucketItems;

  const handleTap = (item: LibraryItem) => {
    markLibraryRead(item.id);
    forceUpdate((n) => n + 1);
    queryClient.invalidateQueries({ queryKey: ["/api/library"] });

    if (item.fileType === "pdf" && item.source === "upload") {
      setLocation(`/viewer/${item.id}`);
    } else {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  const label = BUCKET_LABELS[bucket] ?? bucket;

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            data-testid="button-back-library"
            onClick={() => setLocation("/library")}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            aria-label="Back to library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold font-display text-primary">{label}</h2>
            <p className="text-xs text-muted-foreground">{bucketItems.length} {bucketItems.length === 1 ? "document" : "documents"}</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            data-testid="input-library-search"
            type="text"
            placeholder="Search by title, tag, version…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No documents match your search" : "No documents in this bucket yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <LibraryItemCard key={item.id} item={item} onTap={handleTap} isProtocols={isProtocols} />
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
