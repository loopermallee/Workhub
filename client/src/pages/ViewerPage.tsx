import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { LibraryItem } from "@shared/schema";

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: items = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
  });

  const item = items.find((i) => i.id === id);

  useEffect(() => {
    if (!isLoading && item && item.fileType !== "pdf") {
      window.open(item.url, "_blank", "noopener,noreferrer");
      setLocation("/library");
    }
  }, [item, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background flex-shrink-0">
          <button onClick={() => setLocation(-1 as any)} className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-4 bg-secondary animate-pulse rounded w-40" />
        </div>
        <div className="flex-1 bg-secondary animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background items-center justify-center px-6">
        <p className="text-muted-foreground text-sm mb-4">Document not found.</p>
        <button
          onClick={() => setLocation("/library")}
          className="text-sm font-medium text-primary underline"
        >
          Back to Library
        </button>
      </div>
    );
  }

  if (item.fileType !== "pdf") {
    return (
      <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background items-center justify-center px-6">
        <ExternalLink className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center mb-4">Opening in your browser…</p>
        <button
          onClick={() => setLocation("/library")}
          className="text-sm font-medium text-primary underline"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background flex-shrink-0 z-10">
        <button
          data-testid="button-viewer-back"
          onClick={() => setLocation(-1 as any)}
          className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="flex-1 text-sm font-semibold text-primary truncate font-display">{item.title}</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-open-external"
          className="p-2 -mr-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <iframe
        data-testid="iframe-pdf-viewer"
        src={item.url}
        className="flex-1 w-full border-0"
        title={item.title}
        allow="fullscreen"
      />
    </div>
  );
}
