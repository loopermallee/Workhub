import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, Home, FileText, Sun, CloudSun, Sunset, Moon, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getRecentUpdatesCount, useAppData } from "@/hooks/use-app-data";
import { isAdminMode, clearAdminMode } from "@/lib/adminMode";
import { getUnreadNewsCount, getUnreadLibraryCount } from "@/lib/readTracking";
import type { NewsItem, LibraryItem } from "@shared/schema";

interface MobileLayoutProps {
  children: React.ReactNode;
}

interface GreetingInfo {
  text: string;
  icon: React.ReactNode;
}

function getSingaporeHolidayGreeting(now: Date): string | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const isNear = (m: number, d: number) => {
    const target = new Date(now.getFullYear(), m - 1, d);
    const diff = Math.abs(now.getTime() - target.getTime()) / 86400000;
    return diff <= 3;
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

function getGreeting(): GreetingInfo {
  const now = new Date();
  const hour = now.getHours();

  const holiday = getSingaporeHolidayGreeting(now);
  if (holiday) {
    return { text: holiday, icon: <Sun className="w-3.5 h-3.5" /> };
  }

  if (hour >= 5 && hour < 12) {
    return { text: "Good morning", icon: <Sun className="w-3.5 h-3.5" /> };
  } else if (hour >= 12 && hour < 17) {
    return { text: "Good afternoon", icon: <CloudSun className="w-3.5 h-3.5" /> };
  } else if (hour >= 17 && hour < 21) {
    return { text: "Good evening", icon: <Sunset className="w-3.5 h-3.5" /> };
  } else {
    return { text: "Good night", icon: <Moon className="w-3.5 h-3.5" /> };
  }
}

interface NewsResponse {
  active: NewsItem[];
  expired: NewsItem[];
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const [adminActive, setAdminActive] = useState(isAdminMode());

  const { data } = useAppData();
  const totalRecentUpdates = getRecentUpdatesCount(data?.items);
  const greeting = getGreeting();

  const { data: newsData } = useQuery<NewsResponse>({
    queryKey: ["/api/news"],
    staleTime: 30000,
  });

  const { data: libraryData } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
    staleTime: 30000,
  });

  const unreadNews = getUnreadNewsCount(newsData?.active ?? []);
  const unreadLibrary = getUnreadLibraryCount(libraryData ?? []);
  const totalUnread = unreadNews + unreadLibrary;

  const isHome = location === "/";
  const isLibrary = location.startsWith("/library");

  const handleHomeClick = () => setLocation("/");
  const handleProtocolsClick = () => setLocation("/library");

  const handleExitAdmin = () => {
    clearAdminMode();
    setAdminActive(false);
    setLocation("/");
  };

  useEffect(() => {
    setAdminActive(isAdminMode());
  }, [location]);

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background overflow-hidden relative shadow-2xl sm:border-x sm:border-border">

      {/* Top Header */}
      <header
        className={`flex-shrink-0 pt-safe bg-background z-10 border-b border-border/50 ${adminActive ? "rainbow-border-bottom" : ""}`}
      >
        <div className="flex items-center justify-between px-5 h-[60px]">
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold text-primary font-display tracking-tight leading-tight">
              Station 44 Hub
            </h1>
            <div className="flex items-center gap-1 text-muted-foreground">
              {greeting.icon}
              <span className="text-[11px] font-medium">{greeting.text}</span>
            </div>
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
              className="relative p-2 -mr-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2.5} />
              {totalUnread > 0 ? (
                <span
                  data-testid="badge-bell-count"
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full px-0.5 border border-background"
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              ) : totalRecentUpdates > 0 ? (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background shadow-sm" />
              ) : null}
            </button>
          </div>
        </div>
      </header>

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
  );
}
