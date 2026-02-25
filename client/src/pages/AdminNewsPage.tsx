import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Trash2, Pencil, Pin } from "lucide-react";
import { motion } from "framer-motion";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { NewsItem } from "@shared/schema";

interface NewsResponse {
  active: NewsItem[];
  expired: NewsItem[];
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PinModal({ onSuccess }: { onSuccess: (pin: string) => void }) {
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
      if (res.status === 401) {
        setError("Incorrect PIN");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
        return;
      }
      if (res.ok) {
        onSuccess(pin);
      } else {
        setError("An error occurred");
      }
    } catch {
      setError("An error occurred");
    }
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-xs mx-auto rounded-xl p-6" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="text-base font-semibold text-center">Admin Access</DialogTitle>
        <DialogDescription className="sr-only">Enter your admin PIN to access the news admin panel.</DialogDescription>
        <motion.div
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 mt-2"
        >
          <Input
            data-testid="input-admin-pin-page"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="••••"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          {error && (
            <p data-testid="text-pin-error-page" className="text-xs text-destructive text-center">
              {error}
            </p>
          )}
          <Button data-testid="button-pin-submit-page" onClick={handleSubmit} className="w-full">
            Unlock
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

interface NewsFormState {
  title: string;
  body: string;
  expiresAt: string;
  pinned: boolean;
}

function NewsForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
  error,
}: {
  initial: NewsFormState;
  onSubmit: (values: NewsFormState) => void;
  isPending: boolean;
  submitLabel: string;
  error: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt);
  const [pinned, setPinned] = useState(initial.pinned);
  const [localError, setLocalError] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) { setLocalError("Title is required"); return; }
    if (!pinned && !expiresAt) { setLocalError("Expiry date is required for non-pinned items"); return; }
    if (!pinned && new Date(expiresAt) <= new Date()) { setLocalError("Expiry must be in the future"); return; }
    setLocalError("");
    onSubmit({ title, body, expiresAt, pinned });
  };

  const displayError = localError || error;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          data-testid="input-news-title"
          placeholder="News headline..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Body
        </label>
        <Textarea
          data-testid="input-news-body"
          placeholder="Additional details (optional)..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="pinned-toggle"
          data-testid="input-news-pinned"
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
        <label htmlFor="pinned-toggle" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none">
          <Pin className="w-3 h-3" />
          Pinned (no expiry)
        </label>
      </div>

      {!pinned && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Expires at <span className="text-destructive">*</span>
          </label>
          <Input
            data-testid="input-news-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      )}

      {displayError && (
        <p data-testid="text-form-error" className="text-xs text-destructive">
          {displayError}
        </p>
      )}

      <Button
        data-testid="button-publish"
        className="w-full"
        onClick={handleSubmit}
        disabled={isPending}
      >
        {isPending ? `${submitLabel}...` : submitLabel}
      </Button>
    </div>
  );
}

export default function AdminNewsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [authedPin, setAuthedPin] = useState<string | null>(null);
  const [publishError, setPublishError] = useState("");
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("admin:authed");
    if (stored) setAuthedPin(stored);
  }, []);

  const { data, isLoading } = useQuery<NewsResponse>({
    queryKey: ["/api/news"],
    enabled: !!authedPin,
  });

  const publishMutation = useMutation({
    mutationFn: async (values: NewsFormState) => {
      const res = await apiRequest("POST", "/api/news", {
        pin: authedPin,
        title: values.title,
        body: values.body,
        expiresAt: values.pinned ? undefined : values.expiresAt,
        pinned: values.pinned,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published", description: "News item posted successfully.", duration: 3000 });
      setPublishError("");
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: (err: Error) => {
      setPublishError(err.message || "Failed to publish");
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: NewsFormState }) => {
      const res = await fetch(`/api/news/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: authedPin,
          title: values.title,
          body: values.body,
          expiresAt: values.pinned ? undefined : values.expiresAt,
          pinned: values.pinned,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "News item updated successfully.", duration: 3000 });
      setEditingItem(null);
      setEditError("");
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: (err: Error) => {
      setEditError(err.message || "Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/news/${id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": authedPin ?? "" },
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
  });

  const handlePinSuccess = (pin: string) => {
    sessionStorage.setItem("admin:authed", pin);
    setAuthedPin(pin);
  };

  const allItems = [...(data?.active ?? []), ...(data?.expired ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!authedPin) {
    return <PinModal onSuccess={handlePinSuccess} />;
  }

  return (
    <MobileLayout>
      <div className="pb-8">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            data-testid="button-back-admin"
            onClick={() => setLocation("/")}
            className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg text-foreground flex-1">Post News</h1>
          <button
            data-testid="button-goto-library-admin"
            onClick={() => setLocation("/admin/library")}
            className="text-[11px] font-semibold text-primary/70 hover:text-primary bg-secondary px-3 py-1.5 rounded-lg transition-colors"
          >
            Library Admin
          </button>
        </div>

        <div className="px-4 space-y-6 mt-2">
          <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
            <NewsForm
              initial={{ title: "", body: "", expiresAt: "", pinned: false }}
              onSubmit={(values) => publishMutation.mutate(values)}
              isPending={publishMutation.isPending}
              submitLabel="Publish"
              error={publishError}
            />
          </div>

          <section>
            <h2
              data-testid="section-admin-news-list"
              className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3"
            >
              All News Items
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : allItems.length === 0 ? (
              <div className="text-center py-6 px-4 border border-dashed border-border rounded-xl bg-secondary/30">
                <p className="text-sm font-medium text-muted-foreground">No news items yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allItems.map((item) => {
                  const isExpired = !item.pinned && item.expiresAt && new Date(item.expiresAt) <= new Date();
                  return (
                    <div
                      key={item.id}
                      data-testid={`card-admin-news-${item.id}`}
                      className="p-3 rounded-xl border border-border bg-background shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                            {item.pinned ? (
                              <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500 hover:bg-amber-500 text-white">
                                Pinned
                              </Badge>
                            ) : (
                              <Badge
                                variant={isExpired ? "outline" : "default"}
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                {isExpired ? "Expired" : "Active"}
                              </Badge>
                            )}
                          </div>
                          {item.body && (
                            <p className="text-xs text-muted-foreground truncate">{item.body}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDate(item.createdAt)}
                              {item.pinned ? " · No expiry" : item.expiresAt ? ` · Expires ${formatDate(item.expiresAt)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            data-testid={`button-edit-news-${item.id}`}
                            onClick={() => { setEditingItem(item); setEditError(""); }}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            data-testid={`button-delete-news-${item.id}`}
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditError(""); } }}>
        <DialogContent className="max-w-sm mx-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold">Edit News Item</DialogTitle>
          <DialogDescription className="sr-only">Edit the fields for this news item.</DialogDescription>
          {editingItem && (
            <div className="mt-2">
              <NewsForm
                initial={{
                  title: editingItem.title,
                  body: editingItem.body,
                  expiresAt: editingItem.expiresAt
                    ? new Date(editingItem.expiresAt).toISOString().slice(0, 16)
                    : "",
                  pinned: !!editingItem.pinned,
                }}
                onSubmit={(values) => editMutation.mutate({ id: editingItem.id, values })}
                isPending={editMutation.isPending}
                submitLabel="Save changes"
                error={editError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
