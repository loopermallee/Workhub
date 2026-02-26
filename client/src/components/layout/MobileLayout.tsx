import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Bell, Home, FileText, Sun, CloudSun, Sunset, Moon, LogOut, X, Pin, BookOpen, ExternalLink, CheckCheck, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAppData } from "@/hooks/use-app-data";
import { isAdminMode, clearAdminMode, setAdminMode } from "@/lib/adminMode";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getUnreadNewsCount, getUnreadLibraryCount,
  getUnreadNewsItems, getUnreadLibraryItems,
  markNewsRead, markLibraryRead,
  markAllNewsRead, markAllLibraryRead,
} from "@/lib/readTracking";
import type { NewsItem, LibraryItem } from "@shared/schema";

interface MobileLayoutProps {
  children: React.ReactNode;
}

function getSingaporeHolidayGreeting(now: Date): string | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isNear = (m: number, d: number) => {
    const target = new Date(now.getFullYear(), m - 1, d);
    return Math.abs(now.getTime() - target.getTime()) / 86400000 <= 3;
  };
  if (isNear(1, 1)) return "Happy New Year!";
  if (isNear(2, 10) || isNear(2, 11)) return "Happy Chinese New Year!";
  if (isNear(4, 18)) return "Happy Good Friday!";
  if (isNear(5, 1)) return "Happy Labour Day!";
  if (isNear(8, 9)) return "Happy National Day!";
  if (isNear(10, 20) || isNear(10, 31)) return "Happy Deepavali!";
  if (isNear(12, 25)) return "Merry Christmas!";
  if ((month === 3 || month === 4) && day <= 15) return "Ramadan Mubarak!";
  return null;
}

function getGreetingText(): string {
  const now = new Date();
  const holiday = getSingaporeHolidayGreeting(now);
  if (holiday) return holiday;
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
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

interface NewsResponse {
  active: NewsItem[];
  expired: NewsItem[];
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const [adminActive, setAdminActive] = useState(isAdminMode());
  const [showNotifications, setShowNotifications] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animColor, setAnimColor] = useState<"white" | "black">("white");
  const [, forceUpdate] = useState(0);
  const queryClient = useQueryClient();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const homeTapTimestamps = useRef<number[]>([]);
  const { toast } = useToast();

  const { theme, toggleTheme } = useTheme();

  useAppData();

  const { data: newsData } = useQuery<NewsResponse>({
    queryKey: ["/api/news"],
    staleTime: 30000,
  });

  const { data: libraryData } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    staleTime: 30000,
  });

  const activeNews = newsData?.active ?? [];
  const allLibrary = libraryData ?? [];

  const unreadNews = getUnreadNewsCount(activeNews);
  const unreadLibrary = getUnreadLibraryCount(allLibrary);
  const totalUnread = unreadNews + unreadLibrary;

  const unreadNewsItems = getUnreadNewsItems(activeNews);
  const unreadLibraryItems = getUnreadLibraryItems(allLibrary);

  const isHome = location === "/";
  const isLibrary = location.startsWith("/library");

  const greetingText = getGreetingText();

  const handleHomeClick = () => {
    setShowNotifications(false);
    setLocation("/");
    const now = Date.now();
    homeTapTimestamps.current = homeTapTimestamps.current.filter((t) => now - t < 4000);
    homeTapTimestamps.current.push(now);
    if (homeTapTimestamps.current.length >= 6) {
      homeTapTimestamps.current = [];
      if (isAdminMode()) {
        toast({ description: "You are already in admin mode" });
      } else {
        setPin("");
        setPinError("");
        setShowPinModal(true);
      }
    }
  };

  const handlePinSubmit = async () => {
    if (!pin.trim()) return;
    setPinLoading(true);
    try {
      const res = await fetch("/api/news/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.status === 401) {
        setPinError("Incorrect PIN");
        setPinShake(true);
        setTimeout(() => setPinShake(false), 500);
        setPin("");
        return;
      }
      if (res.ok) {
        setAdminMode(pin);
        setAdminActive(true);
        setShowPinModal(false);
        setPin("");
        setPinError("");
        toast({ description: "Admin mode activated" });
      } else {
        setPinError("An error occurred");
      }
    } catch {
      setPinError("An error occurred");
    } finally {
      setPinLoading(false);
    }
  };
  const handleProtocolsClick = () => { setShowNotifications(false); setLocation("/library"); };

  const handleExitAdmin = () => {
    clearAdminMode();
    setAdminActive(false);
    setLocation("/");
  };

  const handleThemeToggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setAnimColor(next === "dark" ? "black" : "white");
    setAnimating(true);
    toggleTheme();
    setTimeout(() => setAnimating(false), 600);
  };

  const handleMarkAllRead = () => {
    markAllNewsRead(activeNews);
    markAllLibraryRead(allLibrary);
    queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    queryClient.invalidateQueries({ queryKey: ["/api/library"] });
    forceUpdate((n) => n + 1);
    setShowNotifications(false);
  };

  const handleNewsItemClick = (item: NewsItem) => {
    markNewsRead(item.id);
    forceUpdate((n) => n + 1);
    setShowNotifications(false);
    setLocation("/news");
  };

  const handleLibraryItemClick = (item: LibraryItem) => {
    markLibraryRead(item.id);
    forceUpdate((n) => n + 1);
    setShowNotifications(false);
    if (item.fileType === "pdf" && item.source === "upload") {
      setLocation(`/viewer/${item.id}`);
    } else {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    setAdminActive(isAdminMode());
  }, [location]);

  useEffect(() => {
    if (showNotifications) {
      forceUpdate((n) => n + 1);
    }
  }, [showNotifications]);

  const ThemeIcon = theme === "dark" ? Moon : (greetingText.startsWith("Good morning") ? Sun : greetingText.startsWith("Good afternoon") ? CloudSun : greetingText.startsWith("Good evening") ? Sunset : Moon);

  return (
    <>
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background overflow-hidden relative shadow-2xl sm:border-x sm:border-border">

      {/* Full-screen theme transition overlay */}
      <AnimatePresence>
        {animating && (
          <motion.div
            key="theme-overlay"
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{ backgroundColor: animColor }}
          />
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header
        className={`flex-shrink-0 pt-safe bg-background z-20 border-b border-border/50 ${adminActive ? "rainbow-border-bottom" : ""}`}
      >
        <div className="flex items-center justify-between px-5 h-[60px]">
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold text-primary font-display tracking-tight leading-tight">
              Station 44 Hub
            </h1>
            <button
              data-testid="button-theme-toggle"
              onClick={handleThemeToggle}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors focus:outline-none group -ml-0.5 w-fit"
            >
              <ThemeIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">{greetingText}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {adminActive && (
              <button
                data-testid="button-exit-admin"
                onClick={handleExitAdmin}
                className="flex items-center gap-1 text-[10px] font-semibold text-destructive/80 hover:text-destructive bg-destructive/10 hover:bg-destructive/15 px-2 py-1 rounded-full transition-colors mr-1"
                aria-label="Exit admin mode"
              >
                <LogOut className="w-3 h-3" />
                Exit Admin
              </button>
            )}
            <button
              data-testid="button-bell"
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 -mr-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2.5} />
              {totalUnread > 0 && (
                <span
                  data-testid="badge-bell-count"
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full px-0.5 border border-background"
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Panel + Backdrop */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              key="notif-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 z-10 bg-black/30"
              style={{ top: 60 }}
            />

            <motion.div
              key="notif-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="absolute left-0 right-0 z-20 bg-background border-b border-border shadow-xl"
              style={{ top: 60 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <span className="text-sm font-semibold font-display text-primary">
                  Notifications
                  {totalUnread > 0 && (
                    <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                      {totalUnread} unread
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {totalUnread > 0 && (
                    <button
                      data-testid="button-mark-all-read"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary/70 hover:text-primary transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    data-testid="button-close-notifications"
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[55dvh] overflow-y-auto no-scrollbar">
                {totalUnread === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                    <Bell className="w-8 h-8 mb-2" strokeWidth={1.5} />
                    <p className="text-sm">All caught up</p>
                  </div>
                ) : (
                  <>
                    {unreadNewsItems.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          News
                        </p>
                        {unreadNewsItems.map((item) => (
                          <button
                            key={item.id}
                            data-testid={`notif-news-${item.id}`}
                            onClick={() => handleNewsItemClick(item)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 active:bg-secondary transition-colors text-left border-t border-border/30 first:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bell className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-primary leading-snug line-clamp-2">
                                  {item.title}
                                </p>
                                {item.pinned && <Pin className="w-3 h-3 text-muted-foreground/50 flex-shrink-0 mt-0.5" />}
                              </div>
                              {item.body && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.body}</p>
                              )}
                              <p className="text-[11px] text-muted-foreground/50 mt-0.5">{formatDate(item.createdAt)}</p>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0 mt-2" />
                          </button>
                        ))}
                      </div>
                    )}

                    {unreadLibraryItems.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          Library
                        </p>
                        {unreadLibraryItems.map((item) => (
                          <button
                            key={item.id}
                            data-testid={`notif-library-${item.id}`}
                            onClick={() => handleLibraryItemClick(item)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 active:bg-secondary transition-colors text-left border-t border-border/30 first:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-primary leading-snug line-clamp-2">
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground uppercase">
                                    {fileTypeLabel(item.fileType)}
                                  </span>
                                  {(item.fileType !== "pdf" || item.source !== "upload") && (
                                    <ExternalLink className="w-3 h-3 text-muted-foreground/50" />
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                {item.bucket}{item.version ? ` · ${item.version}` : ""}
                              </p>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0 mt-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative bg-background">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-background border-t border-border pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          <button
            data-testid="button-nav-home"
            onClick={handleHomeClick}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors focus:outline-none ${
              isHome ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
          >
            <Home className="w-6 h-6" strokeWidth={isHome ? 2.5 : 2} />
            <span className={`text-[10px] ${isHome ? "font-semibold" : "font-medium"}`}>Home</span>
          </button>

          <button
            data-testid="button-nav-protocols"
            onClick={handleProtocolsClick}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors focus:outline-none relative ${
              isLibrary ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
          >
            <div className="relative">
              <FileText className="w-6 h-6" strokeWidth={isLibrary ? 2.5 : 2} />
              {unreadLibrary > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold bg-destructive text-destructive-foreground rounded-full px-0.5">
                  {unreadLibrary > 99 ? "99+" : unreadLibrary}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isLibrary ? "font-semibold" : "font-medium"}`}>Protocols/SOP</span>
          </button>
        </div>
      </nav>

    </div>

    <Dialog open={showPinModal} onOpenChange={(open) => { setShowPinModal(open); setPin(""); setPinError(""); }}>
      <DialogContent className="max-w-xs mx-auto rounded-2xl p-6">
        <DialogTitle className="text-base font-semibold font-display text-center">Admin Access</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
          Enter your admin PIN to activate admin mode.
        </DialogDescription>
        <div className="mt-4 space-y-3">
          <motion.div animate={pinShake ? { x: [-6, 6, -6, 6, 0] } : {}} transition={{ duration: 0.3 }}>
            <Input
              data-testid="input-home-admin-pin"
              type="password"
              inputMode="numeric"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </motion.div>
          {pinError && (
            <p data-testid="text-home-pin-error" className="text-xs text-destructive text-center">{pinError}</p>
          )}
          <Button
            data-testid="button-home-pin-submit"
            onClick={handlePinSubmit}
            disabled={pinLoading}
            className="w-full"
          >
            {pinLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {pinLoading ? "Verifying..." : "Unlock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
