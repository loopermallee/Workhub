import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { News } from "@shared/schema";

interface NewsBannerProps {
  news: News[];
}

export function NewsBanner({ news }: NewsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!news || news.length === 0) return null;

  // Show only top 1 if collapsed, all if expanded
  const displayNews = isExpanded ? news : [news[0]];

  return (
    <div className="mx-4 mt-4 bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/10 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 focus:outline-none"
      >
        <div className="flex items-center space-x-2 font-display font-semibold text-sm">
          <AlertCircle className="w-4 h-4 text-primary-foreground/80" />
          <span>Important News</span>
        </div>
        {news.length > 1 && (
          <div className="p-1 bg-primary-foreground/10 rounded-full">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      <AnimatePresence initial={false}>
        <motion.div
          key="content"
          initial="collapsed"
          animate="open"
          exit="collapsed"
          variants={{
            open: { opacity: 1, height: "auto" },
            collapsed: { opacity: 1, height: "auto" } // We just animate the list changes
          }}
          transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
        >
          <div className="px-4 pb-3 space-y-3">
            {displayNews.map((item) => (
              <div key={item.id} className="pt-2 border-t border-primary-foreground/10 first:border-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {item.isNew && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-sm">
                          New
                        </span>
                      )}
                      <span className="text-[11px] text-primary-foreground/60 font-medium">
                        {item.date}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium leading-snug">{item.title}</h3>
                  </div>
                  {item.link && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 p-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
