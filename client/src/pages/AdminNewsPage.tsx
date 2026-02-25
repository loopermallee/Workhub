import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
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

function formatDate(iso: string) {
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

export default function AdminNewsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [authedPin, setAuthedPin] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("admin:authed");
    if (stored) setAuthedPin(stored);
  }, []);

  const { data, isLoading } = useQuery<NewsResponse>({
    queryKey: ["/api/news"],
    enabled: !!authedPin,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/news", {
        pin: authedPin,
        title,
        body,
        expiresAt,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Published", description: "News item posted successfully.", duration: 3000 });
      setTitle("");
      setBody("");
      setExpiresAt("");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to publish");
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

  const handlePublish = () => {
    if (!title.trim()) { setFormError("Title is required"); return; }
    if (!expiresAt) { setFormError("Expiry date is required"); return; }
    if (new Date(expiresAt) <= new Date()) { setFormError("Expiry must be in the future"); return; }
    setFormError("");
    publishMutation.mutate();
  };

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
          <h1 className="font-display font-bold text-lg text-foreground">Post News</h1>
        </div>

        <div className="px-4 space-y-6 mt-2">
          <div className="bg-background border border-border rounded-xl p-4 space-y-3 shadow-sm">
            <div>
              <label
                htmlFor="news-title"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="news-title"
                data-testid="input-news-title"
                placeholder="News headline..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="news-body"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                Body
              </label>
              <Textarea
                id="news-body"
                data-testid="input-news-body"
                placeholder="Additional details (optional)..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="news-expires"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                Expires at <span className="text-destructive">*</span>
              </label>
              <Input
                id="news-expires"
                data-testid="input-news-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {formError && (
              <p data-testid="text-form-error" className="text-xs text-destructive">
                {formError}
              </p>
            )}

            <Button
              data-testid="button-publish"
              className="w-full"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
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
                  const isExpired = new Date(item.expiresAt) <= new Date();
                  return (
                    <div
                      key={item.id}
                      data-testid={`card-admin-news-${item.id}`}
                      className="p-3 rounded-xl border border-border bg-background shadow-sm flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                          <Badge
                            variant={isExpired ? "outline" : "default"}
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            {isExpired ? "Expired" : "Active"}
                          </Badge>
                        </div>
                        {item.body && (
                          <p className="text-xs text-muted-foreground truncate">{item.body}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDate(item.createdAt)} · Expires {formatDate(item.expiresAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        data-testid={`button-delete-news-${item.id}`}
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </MobileLayout>
  );
}
