import { useState } from "react";
import { Bell, Home, FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRecentUpdatesCount, useAppData } from "@/hooks/use-app-data";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const { toast } = useToast();
  const { data } = useAppData();
  
  const totalRecentUpdates = getRecentUpdatesCount(data?.items);

  const handleProtocolsClick = () => {
    toast({
      title: "Coming Soon",
      description: "Protocols and SOPs are currently being updated.",
      duration: 3000,
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background overflow-hidden relative shadow-2xl sm:border-x sm:border-border">
      
      {/* Top Header */}
      <header className="flex-shrink-0 pt-safe bg-background z-10 border-b border-border/50">
        <div className="flex items-center justify-between px-5 h-16">
          <h1 className="text-xl font-bold text-primary font-display tracking-tight">
            HQ Resources
          </h1>
          <button 
            className="relative p-2 -mr-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" strokeWidth={2.5} />
            {totalRecentUpdates > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background shadow-sm" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative bg-background">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-background border-t border-border pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          <button className="flex flex-col items-center justify-center w-full h-full space-y-1 text-primary focus:outline-none">
            <Home className="w-6 h-6" strokeWidth={2.5} />
            <span className="text-[10px] font-semibold">Home</span>
          </button>
          
          <button 
            onClick={handleProtocolsClick}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
          >
            <FileText className="w-6 h-6" strokeWidth={2} />
            <span className="text-[10px] font-medium">Protocols/SOP</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
}
