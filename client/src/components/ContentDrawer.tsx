import { useState } from "react";
import { Drawer } from "vaul";
import { X, Copy, CheckCircle2, Clock, Hash } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Item } from "@shared/schema";

interface ContentDrawerProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentDrawer({ item, isOpen, onClose }: ContentDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopy = async () => {
    if (item.content) {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = item.lastUpdated 
    ? format(parseISO(item.lastUpdated), "MMMM d, yyyy") 
    : "";

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto shadow-2xl border-t border-border">
          <div className="p-4 bg-background rounded-t-[20px] shrink-0 border-b border-border/50">
            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted-foreground/20 mb-4" />
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display font-bold text-xl text-foreground leading-tight">
                {item.title}
              </h2>
              <Drawer.Close className="shrink-0 p-2 -mr-2 -mt-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </Drawer.Close>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground font-medium">
              <div className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/70" />
                Updated {formattedDate}
              </div>
            </div>
            
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-secondary text-primary rounded-sm border border-border/50">
                    <Hash className="w-2.5 h-2.5 mr-0.5 opacity-50" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto no-scrollbar bg-secondary/20">
            <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-display prose-a:text-primary">
              {/* If this was markdown or HTML, we'd render it differently. 
                  Assuming plain text with line breaks for this schema. */}
              {item.content?.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 text-foreground/90 text-[15px]">{paragraph}</p>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-background border-t border-border pb-safe">
            <button
              onClick={handleCopy}
              disabled={copied}
              className={`w-full flex items-center justify-center space-x-2 py-3.5 rounded-lg font-semibold transition-all duration-200 ${
                copied 
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.98]"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Content</span>
                </>
              )}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
