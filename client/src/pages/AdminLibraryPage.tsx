import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, Plus, Pencil, Trash2, Upload, Link2,
  X, CheckCircle, AlertCircle, Loader2, BookOpen, Database
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LibraryItem } from "@shared/schema";
import { isAdminMode, getAdminPin, setAdminMode } from "@/lib/adminMode";
import { motion } from "framer-motion";

const BUCKETS = ["SOP", "Protocols", "Others"] as const;
const FILE_TYPES = ["pdf", "docx", "xlsx", "pptx", "google", "link"] as const;
type Bucket = typeof BUCKETS[number];
type FileType = typeof FILE_TYPES[number];

interface UploadResult {
  url: string;
  fileType: FileType;
  originalName: string;
  filename: string;
}

type PatientType = "adult" | "paed" | "";

interface ItemFormState {
  title: string;
  bucket: Bucket;
  fileType: FileType;
  version: string;
  lastUpdated: string;
  tags: string;
  summary: string;
  url: string;
  patientType: PatientType;
}

const defaultForm = (): ItemFormState => ({
  title: "",
  bucket: "SOP",
  fileType: "pdf",
  version: "",
  lastUpdated: new Date().toISOString().slice(0, 10),
  tags: "",
  summary: "",
  url: "",
  patientType: "",
});

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    try {
      const res = await fetch("/api/news/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setAdminMode(pin);
        onAuth();
      } else {
        setError("Incorrect PIN");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
      }
    } catch {
      setError("An error occurred");
    }
  };

  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center h-full px-8 gap-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground text-center">Enter admin PIN to manage the library</p>
        <motion.div
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <Input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button onClick={handleSubmit} className="w-full">Unlock</Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}

export default function AdminLibraryPage() {
  const [, setLocation] = useLocation();
  const [authed, setAuthed] = useState(isAdminMode());

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"upload" | "url">("upload");
  const [form, setForm] = useState<ItemFormState>(defaultForm());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editItem, setEditItem] = useState<LibraryItem | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(defaultForm());
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null);
  const [indexStatus, setIndexStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  const { data: items = [], isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    enabled: authed,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/${id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": getAdminPin() },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      setDeleteTarget(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: { id: string; payload: object }) =>
      apiRequest("PUT", `/api/library/${data.id}`, {
        pin: getAdminPin(),
        ...data.payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      setEditItem(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: object) =>
      apiRequest("POST", "/api/library", { pin: getAdminPin(), ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
    },
  });

  const indexablePdfItems = items.filter(
    (i) => i.source === "upload" && i.fileType === "pdf"
  );
  const anyIndexing = Object.values(indexStatus).some((s) => s === "loading");

  const handleIndex = async (item: LibraryItem) => {
    setIndexStatus((prev) => ({ ...prev, [item.id]: "loading" }));
    try {
      const res = await fetch(`/api/library/${item.id}/index`, {
        method: "POST",
        headers: { "x-admin-pin": getAdminPin() },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Index failed" }));
        throw new Error(err.message);
      }
      setIndexStatus((prev) => ({ ...prev, [item.id]: "done" }));
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
    } catch {
      setIndexStatus((prev) => ({ ...prev, [item.id]: "error" }));
    }
  };

  const handleIndexAll = async () => {
    for (const item of indexablePdfItems) {
      const status = item.searchText ? "done" : (indexStatus[item.id] ?? "idle");
      if (status !== "done") {
        await handleIndex(item);
      }
    }
  };

  const getItemIndexStatus = (item: LibraryItem): "idle" | "loading" | "done" | "error" => {
    if (indexStatus[item.id]) return indexStatus[item.id];
    if (item.searchText) return "done";
    return "idle";
  };

  if (!authed) {
    return <PinGate onAuth={() => setAuthed(true)} />;
  }

  const parseTags = (s: string) =>
    s.split(",").map((t) => t.trim()).filter(Boolean);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files ?? []));
    setUploadResults([]);
    setUploadError("");
  };

  const handleMassUpload = async () => {
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
          title: form.title || nameWithoutExt,
          bucket: form.bucket,
          fileType: result.fileType,
          source: "upload",
          url: result.url,
          version: form.version || undefined,
          lastUpdated: form.lastUpdated,
          tags: parseTags(form.tags),
          summary: form.summary || undefined,
          patientType: form.bucket === "Protocols" && form.patientType ? form.patientType : null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      setSelectedFiles([]);
      setUploadResults([]);
      setForm(defaultForm());
      setShowAddForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!form.url.trim() || !form.title.trim()) return;
    await createMutation.mutateAsync({
      title: form.title,
      bucket: form.bucket,
      fileType: form.fileType,
      source: "url",
      url: form.url,
      version: form.version || undefined,
      lastUpdated: form.lastUpdated,
      tags: parseTags(form.tags),
      summary: form.summary || undefined,
      patientType: form.bucket === "Protocols" && form.patientType ? form.patientType : null,
    });
    setForm(defaultForm());
    setShowAddForm(false);
  };

  const openEdit = (item: LibraryItem) => {
    setEditItem(item);
    setEditForm({
      title: item.title,
      bucket: item.bucket,
      fileType: item.fileType,
      version: item.version ?? "",
      lastUpdated: item.lastUpdated,
      tags: item.tags.join(", "),
      summary: item.summary ?? "",
      url: item.url,
      patientType: (item.patientType as PatientType) ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    await editMutation.mutateAsync({
      id: editItem.id,
      payload: {
        title: editForm.title,
        bucket: editForm.bucket,
        fileType: editForm.fileType,
        version: editForm.version || undefined,
        lastUpdated: editForm.lastUpdated,
        tags: parseTags(editForm.tags),
        summary: editForm.summary || undefined,
        url: editForm.url,
        patientType: editForm.bucket === "Protocols" && editForm.patientType ? editForm.patientType : null,
      },
    });
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button
            data-testid="button-back-admin-news"
            onClick={() => setLocation("/admin/news")}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold font-display text-primary">Library Admin</h2>
            <p className="text-xs text-muted-foreground">{items.length} documents</p>
          </div>
          <div className="flex items-center gap-2">
            {indexablePdfItems.length > 0 && (
              <Button
                data-testid="button-index-all-pdfs"
                size="sm"
                variant="outline"
                onClick={handleIndexAll}
                disabled={anyIndexing}
                className="flex items-center gap-1.5 text-xs"
              >
                {anyIndexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Index All
              </Button>
            )}
            <Button
              data-testid="button-add-library-item"
              size="sm"
              onClick={() => { setShowAddForm(true); setForm(defaultForm()); setSelectedFiles([]); setUploadResults([]); setUploadError(""); }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No library items yet. Click Add to get started.</div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`card-admin-library-${item.id}`}
                className="flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{item.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground">{item.bucket}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground uppercase">{item.fileType}</span>
                    {item.version && <span className="text-[10px] text-muted-foreground/60">{item.version}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {item.source === "upload" && item.fileType === "pdf" && (() => {
                    const status = getItemIndexStatus(item);
                    return (
                      <button
                        data-testid={`button-index-library-${item.id}`}
                        onClick={() => handleIndex(item)}
                        disabled={status === "loading" || status === "done"}
                        title="Index PDF for keyword search"
                        className={`p-1.5 rounded-lg transition-colors ${
                          status === "done"
                            ? "text-green-500 cursor-default"
                            : status === "error"
                            ? "text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:bg-secondary hover:text-primary"
                        }`}
                      >
                        {status === "loading" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : status === "done" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : status === "error" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Database className="w-4 h-4" />
                        )}
                      </button>
                    );
                  })()}
                  <button
                    data-testid={`button-edit-library-${item.id}`}
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    data-testid={`button-delete-library-${item.id}`}
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddForm} onOpenChange={(o) => !isUploading && setShowAddForm(o)}>
        <DialogContent className="max-w-sm mx-auto max-h-[90dvh] overflow-y-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold font-display">Add Library Item</DialogTitle>
          <DialogDescription className="sr-only">Add a new document to the library.</DialogDescription>

          <div className="space-y-3 mt-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setAddMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${addMode === "upload" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              >
                <Upload className="w-4 h-4" /> Upload Files
              </button>
              <button
                onClick={() => setAddMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${addMode === "url" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
              >
                <Link2 className="w-4 h-4" /> URL
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bucket</label>
              <select
                value={form.bucket}
                onChange={(e) => setForm((f) => ({ ...f, bucket: e.target.value as Bucket, patientType: "" }))}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
              >
                {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {form.bucket === "Protocols" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Patient Type</label>
                <div className="flex gap-2">
                  {(["", "adult", "paed"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      data-testid={`button-patient-type-add-${pt || "none"}`}
                      onClick={() => setForm((f) => ({ ...f, patientType: pt }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        form.patientType === pt
                          ? pt === "adult"
                            ? "bg-blue-600 text-white border-blue-600"
                            : pt === "paed"
                            ? "bg-orange-500 text-white border-orange-500"
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

            {addMode === "url" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
                  <Input
                    data-testid="input-library-title"
                    placeholder="Document title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">URL *</label>
                  <Input
                    data-testid="input-library-url"
                    placeholder="https://…"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">File Type</label>
                  <select
                    value={form.fileType}
                    onChange={(e) => setForm((f) => ({ ...f, fileType: e.target.value as FileType }))}
                    className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                  >
                    {FILE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
              </>
            )}

            {addMode === "upload" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title (optional — filename used if blank)</label>
                <Input
                  data-testid="input-library-upload-title"
                  placeholder="Custom title (optional)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                <Input
                  data-testid="input-library-version"
                  placeholder="e.g. v1.2"
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Updated</label>
                <Input
                  data-testid="input-library-last-updated"
                  type="date"
                  value={form.lastUpdated}
                  onChange={(e) => setForm((f) => ({ ...f, lastUpdated: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
              <Input
                data-testid="input-library-tags"
                placeholder="fire, triage, SOP"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Summary</label>
              <textarea
                data-testid="input-library-summary"
                placeholder="Brief description of this document"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {addMode === "upload" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Files</label>
                <input
                  ref={fileInputRef}
                  data-testid="input-file-upload"
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
                {uploadError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {uploadError}
                  </p>
                )}
                {uploadResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadResults.map((r) => (
                      <p key={r.filename} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {r.originalName}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddForm(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              {addMode === "upload" ? (
                <Button
                  data-testid="button-upload-submit"
                  className="flex-1"
                  onClick={handleMassUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1" />Uploading…</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-1" />Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}</>
                  )}
                </Button>
              ) : (
                <Button
                  data-testid="button-url-submit"
                  className="flex-1"
                  onClick={handleUrlSubmit}
                  disabled={!form.url.trim() || !form.title.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-sm mx-auto max-h-[90dvh] overflow-y-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold font-display">Edit Document</DialogTitle>
          <DialogDescription className="sr-only">Edit metadata for this library document.</DialogDescription>

          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input
                data-testid="input-edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
              <Input
                data-testid="input-edit-url"
                value={editForm.url}
                onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bucket</label>
                <select
                  value={editForm.bucket}
                  onChange={(e) => setEditForm((f) => ({ ...f, bucket: e.target.value as Bucket, patientType: "" }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                >
                  {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">File Type</label>
                <select
                  value={editForm.fileType}
                  onChange={(e) => setEditForm((f) => ({ ...f, fileType: e.target.value as FileType }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                >
                  {FILE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {editForm.bucket === "Protocols" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Patient Type</label>
                <div className="flex gap-2">
                  {(["", "adult", "paed"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      data-testid={`button-patient-type-edit-${pt || "none"}`}
                      onClick={() => setEditForm((f) => ({ ...f, patientType: pt }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        editForm.patientType === pt
                          ? pt === "adult"
                            ? "bg-blue-600 text-white border-blue-600"
                            : pt === "paed"
                            ? "bg-orange-500 text-white border-orange-500"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                <Input
                  data-testid="input-edit-version"
                  placeholder="e.g. v1.2"
                  value={editForm.version}
                  onChange={(e) => setEditForm((f) => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Updated</label>
                <Input
                  data-testid="input-edit-last-updated"
                  type="date"
                  value={editForm.lastUpdated}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastUpdated: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated)</label>
              <Input
                data-testid="input-edit-tags"
                value={editForm.tags}
                onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Summary</label>
              <textarea
                data-testid="input-edit-summary"
                value={editForm.summary}
                onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button
                data-testid="button-save-edit"
                className="flex-1"
                onClick={handleEditSave}
                disabled={!editForm.title.trim() || editMutation.isPending}
              >
                {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-xs mx-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold">Delete Document?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            "{deleteTarget?.title}" will be permanently removed.
            {deleteTarget?.source === "upload" && " The uploaded file will also be deleted."}
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-delete"
              variant="destructive"
              className="flex-1"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
