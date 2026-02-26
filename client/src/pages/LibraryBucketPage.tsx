import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Search, FileText, FileSpreadsheet, Presentation,
  ExternalLink, Globe, X, BookOpen, Plus, Upload,
  CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileLayout } from "@/components/layout/MobileLayout";
import type { LibraryItem } from "@shared/schema";
import { markLibraryRead, isLibraryRead } from "@/lib/readTracking";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isAdminMode, getAdminPin } from "@/lib/adminMode";

const BUCKET_LABELS: Record<string, string> = {
  SOP: "SOPs",
  Protocols: "Protocols",
  Others: "Others",
};

type Bucket = "SOP" | "Protocols" | "Others";
type PatientType = "adult" | "paed" | "";

interface UploadResult {
  url: string;
  fileType: string;
  originalName: string;
  filename: string;
}

interface QuickUploadForm {
  version: string;
  lastUpdated: string;
  tags: string;
  summary: string;
  patientType: PatientType;
}

const defaultQuickForm = (): QuickUploadForm => ({
  version: "",
  lastUpdated: new Date().toISOString().slice(0, 10),
  tags: "",
  summary: "",
  patientType: "",
});

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
      <span data-testid="badge-patient-adult" className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-blue-600 text-white dark:bg-blue-500">
        Adult
      </span>
    );
  }
  if (patientType === "paed") {
    return (
      <span data-testid="badge-patient-paed" className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-orange-500 text-white dark:bg-orange-400">
        Paed
      </span>
    );
  }
  return (
    <span data-testid="badge-patient-protocol" className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 bg-secondary text-muted-foreground">
      Protocol
    </span>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSnippet(text: string, query: string, radius = 70): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 160) + (text.length > 160 ? "…" : "");
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
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
          {item.version && <span className="text-[11px] text-muted-foreground/70 font-medium">{item.version}</span>}
          {item.lastUpdated && <span className="text-[11px] text-muted-foreground/60">Updated {item.lastUpdated}</span>}
        </div>
        {item.summary && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.summary}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function KeywordResultCard({
  item,
  query,
  onTap,
  isProtocols,
}: {
  item: LibraryItem;
  query: string;
  onTap: (item: LibraryItem, query: string) => void;
  isProtocols: boolean;
}) {
  const read = isLibraryRead(item.id);
  const snippet = item.searchText ? extractSnippet(item.searchText, query) : "";

  return (
    <button
      data-testid={`card-keyword-item-${item.id}`}
      onClick={() => onTap(item, query)}
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {item.version && <span className="text-[11px] text-muted-foreground/70 font-medium">{item.version}</span>}
          {item.lastUpdated && <span className="text-[11px] text-muted-foreground/60">Updated {item.lastUpdated}</span>}
        </div>
        {snippet && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">
            <HighlightedText text={snippet} query={query} />
          </p>
        )}
      </div>
    </button>
  );
}

export default function LibraryBucketPage() {
  const { bucket } = useParams<{ bucket: string }>();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, forceUpdate] = useState(0);
  const adminMode = isAdminMode();

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickUploadForm>(defaultQuickForm());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allItems = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: object) =>
      apiRequest("POST", "/api/library", { pin: getAdminPin(), ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
    },
  });

  const isProtocols = bucket === "Protocols";
  const bucketItems = allItems.filter((i) => i.bucket === bucket);

  const { fileNameMatches, keywordMatches } = useMemo(() => {
    if (!debouncedSearch) return { fileNameMatches: bucketItems, keywordMatches: [] as LibraryItem[] };
    const q = debouncedSearch.toLowerCase();

    const fnMatches = bucketItems.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      (item.version?.toLowerCase().includes(q) ?? false) ||
      (item.summary?.toLowerCase().includes(q) ?? false)
    );
    const fnIds = new Set(fnMatches.map((i) => i.id));

    const kwMatches = bucketItems.filter(
      (item) =>
        !fnIds.has(item.id) &&
        item.searchText &&
        item.searchText.toLowerCase().includes(q)
    );

    return { fileNameMatches: fnMatches, keywordMatches: kwMatches };
  }, [debouncedSearch, bucketItems]);

  const isSearching = debouncedSearch.length > 0;
  const hasResults = fileNameMatches.length > 0 || keywordMatches.length > 0;

  const handleTap = (item: LibraryItem, searchQ?: string) => {
    markLibraryRead(item.id);
    forceUpdate((n) => n + 1);
    queryClient.invalidateQueries({ queryKey: ["/api/library"] });

    const q = searchQ ?? debouncedSearch;
    const qParam = q ? `?q=${encodeURIComponent(q)}` : "";

    if (item.fileType === "pdf" && item.source === "upload") {
      setLocation(`/viewer/${item.id}${qParam}`);
    } else {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files ?? []));
    setUploadResults([]);
    setUploadError("");
  };

  const parseTags = (s: string) =>
    s.split(",").map((t) => t.trim()).filter(Boolean);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-admin-pin": getAdminPin() },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setUploadError(err.message ?? "Upload failed");
        return;
      }

      const results: UploadResult[] = await res.json();
      setUploadResults(results);

      for (const result of results) {
        const nameWithoutExt = result.originalName.replace(/\.[^/.]+$/, "");
        await createMutation.mutateAsync({
          title: nameWithoutExt,
          bucket: bucket as Bucket,
          fileType: result.fileType,
          source: "upload",
          url: result.url,
          version: quickForm.version || undefined,
          lastUpdated: quickForm.lastUpdated,
          tags: parseTags(quickForm.tags),
          summary: quickForm.summary || undefined,
          patientType: isProtocols && quickForm.patientType ? quickForm.patientType : null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setTimeout(() => {
        setShowUpload(false);
        setUploadResults([]);
        setQuickForm(defaultQuickForm());
      }, 1200);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseUpload = () => {
    if (isUploading) return;
    setShowUpload(false);
    setSelectedFiles([]);
    setUploadResults([]);
    setUploadError("");
    setQuickForm(defaultQuickForm());
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          <div className="flex-1">
            <h2 className="text-xl font-bold font-display text-primary">{label}</h2>
            <p className="text-xs text-muted-foreground">{bucketItems.length} {bucketItems.length === 1 ? "document" : "documents"}</p>
          </div>
          {adminMode && (
            <button
              data-testid="button-bucket-upload"
              onClick={() => setShowUpload(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
              aria-label={`Upload to ${label}`}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            data-testid="input-library-search"
            type="text"
            placeholder="Search by title, tag, or keyword inside document…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); }}
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
        ) : !isSearching ? (
          /* Normal list — no search active */
          bucketItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents in this bucket yet</p>
              {adminMode && (
                <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-primary font-medium hover:underline">
                  Upload the first document
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {bucketItems.map((item) => (
                <LibraryItemCard key={item.id} item={item} onTap={handleTap} isProtocols={isProtocols} />
              ))}
            </div>
          )
        ) : !hasResults ? (
          /* Search active, no results */
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No results for "{debouncedSearch}"</p>
            <p className="text-xs text-muted-foreground mt-1">Try different keywords or index PDFs for full-text search</p>
          </div>
        ) : (
          /* Dual-category search results */
          <div className="space-y-5">
            {fileNameMatches.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 ml-0.5">
                  By File Name ({fileNameMatches.length})
                </p>
                <div className="space-y-2.5">
                  {fileNameMatches.map((item) => (
                    <LibraryItemCard key={item.id} item={item} onTap={handleTap} isProtocols={isProtocols} />
                  ))}
                </div>
              </div>
            )}

            {keywordMatches.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 ml-0.5">
                  By Keyword — Inside Document ({keywordMatches.length})
                </p>
                <div className="space-y-2.5">
                  {keywordMatches.map((item) => (
                    <KeywordResultCard
                      key={item.id}
                      item={item}
                      query={debouncedSearch}
                      onTap={handleTap}
                      isProtocols={isProtocols}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(o) => !o && handleCloseUpload()}>
        <DialogContent className="max-w-sm mx-auto max-h-[90dvh] overflow-y-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold font-display">Upload to {label}</DialogTitle>
          <DialogDescription className="sr-only">
            Upload files to the {label} bucket. Filenames are used as document titles.
          </DialogDescription>

          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <span className="text-xs text-muted-foreground font-medium">Bucket:</span>
              <span className="text-xs font-semibold text-primary">{bucket}</span>
            </div>

            {isProtocols && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Patient Type</label>
                <div className="flex gap-2">
                  {(["", "adult", "paed"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      data-testid={`button-patient-type-upload-${pt || "none"}`}
                      onClick={() => setQuickForm((f) => ({ ...f, patientType: pt }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        quickForm.patientType === pt
                          ? pt === "adult" ? "bg-blue-600 text-white border-blue-600"
                            : pt === "paed" ? "bg-orange-500 text-white border-orange-500"
                            : "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {pt === "" ? "None" : pt === "adult" ? "Adult" : "Paed"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Select Files <span className="text-muted-foreground/50">(filenames used as titles)</span>
              </label>
              <input
                ref={fileInputRef}
                data-testid="input-bucket-file-upload"
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt"
                onChange={handleFileChange}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                <Input
                  data-testid="input-bucket-upload-version"
                  placeholder="e.g. v1.2"
                  value={quickForm.version}
                  onChange={(e) => setQuickForm((f) => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Updated</label>
                <Input
                  data-testid="input-bucket-upload-date"
                  type="date"
                  value={quickForm.lastUpdated}
                  onChange={(e) => setQuickForm((f) => ({ ...f, lastUpdated: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags <span className="text-muted-foreground/50">(comma separated)</span></label>
              <Input
                data-testid="input-bucket-upload-tags"
                placeholder="cardiac, protocol, paed"
                value={quickForm.tags}
                onChange={(e) => setQuickForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Summary <span className="text-muted-foreground/50">(optional)</span></label>
              <textarea
                data-testid="input-bucket-upload-summary"
                placeholder="Brief description…"
                value={quickForm.summary}
                onChange={(e) => setQuickForm((f) => ({ ...f, summary: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {uploadError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> {uploadError}
              </p>
            )}

            {uploadResults.length > 0 && (
              <div className="space-y-1">
                {uploadResults.map((r) => (
                  <p key={r.filename} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" /> {r.originalName}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleCloseUpload} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                data-testid="button-bucket-upload-submit"
                className="flex-1"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" />Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" />Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
