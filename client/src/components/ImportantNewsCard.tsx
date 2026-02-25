import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  });
}

export function ImportantNewsCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);

  const tapTimestamps = useRef<number[]>([]);
  const [, setLocation] = useLocation();

  const { data } = useQuery<NewsResponse>({ queryKey: ["/api/news"] });

  const active = data?.active ?? [];
  const previewItems = isExpanded ? active : active.slice(0, 2);

  const handleHeaderTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current = tapTimestamps.current.filter((t) => now - t < 4000);
    tapTimestamps.current.push(now);
    if (tapTimestamps.current.length >= 7) {
      tapTimestamps.current = [];
      setShowPinModal(true);
    }
  }, []);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
    handleHeaderTap();
  };

  const handlePinSubmit = async () => {
    if (!pin.trim()) return;
    try {
      const res = await fetch("/api/news/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.status === 401) {
        setPinError("Incorrect PIN");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
        return;
      }
      if (res.ok) {
        sessionStorage.setItem("admin:authed", pin);
        setShowPinModal(false);
        setPin("");
        setPinError("");
        setLocation("/admin/news");
      } else {
        setPinError("An error occurred");
      }
    } catch {
      setPinError("An error occurred");
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handlePinSubmit();
  };

  return (
    <>
      <div className="mx-4 mt-4 bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/10 overflow-hidden">
        <button
          data-testid="button-news-toggle"
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-4 py-3 focus:outline-none select-none"
        >
          <div className="flex items-center space-x-2 font-display font-semibold text-sm">
            <AlertCircle className="w-4 h-4 text-primary-foreground/80" />
            <span>Important News</span>
          </div>
          <div className="p-1 bg-primary-foreground/10 rounded-full">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 max-h-64 overflow-y-auto space-y-2">
                {active.length === 0 ? (
                  <p
                    data-testid="text-no-updates"
                    className="text-sm text-primary-foreground/70 py-2"
                  >
                    No current updates
                  </p>
                ) : (
                  active.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`text-news-item-${item.id}`}
                      className="pt-2 border-t border-primary-foreground/10 first:border-0 first:pt-0"
                    >
                      <p className="text-[11px] text-primary-foreground/60 font-medium mb-0.5">
                        {formatDate(item.createdAt)}
                      </p>
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      {item.body && (
                        <p className="text-xs text-primary-foreground/75 mt-1 leading-relaxed">
                          {item.body}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 pb-3">
                <Link
                  href="/news"
                  data-testid="link-view-all-news"
                  className="flex items-center gap-1 text-xs font-semibold text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2">
                {previewItems.length === 0 ? (
                  <p
                    data-testid="text-no-updates-collapsed"
                    className="text-sm text-primary-foreground/70"
                  >
                    No current updates
                  </p>
                ) : (
                  previewItems.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`text-news-preview-${item.id}`}
                      className="pt-2 border-t border-primary-foreground/10 first:border-0 first:pt-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                        <p className="text-[11px] text-primary-foreground/60 font-medium shrink-0">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showPinModal} onOpenChange={(open) => { setShowPinModal(open); setPin(""); setPinError(""); }}>
        <DialogContent className="max-w-xs mx-auto rounded-xl p-6">
          <DialogTitle className="text-base font-semibold text-center">Enter PIN</DialogTitle>
          <DialogDescription className="sr-only">Enter your admin PIN to access admin features.</DialogDescription>
          <motion.div
            animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-3 mt-2"
          >
            <Input
              data-testid="input-admin-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(""); }}
              onKeyDown={handlePinKeyDown}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            {pinError && (
              <p data-testid="text-pin-error" className="text-xs text-destructive text-center">
                {pinError}
              </p>
            )}
            <Button
              data-testid="button-pin-submit"
              onClick={handlePinSubmit}
              className="w-full"
            >
              Unlock
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
