import { Drawer } from "vaul";
import { X, FolderOpen } from "lucide-react";
import { ItemCard } from "./ItemCard";
import type { Category, Item } from "@shared/schema";

interface CategoryDrawerProps {
  category: Category | null;
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: Item) => void;
}

export function CategoryDrawer({ category, items, isOpen, onClose, onItemClick }: CategoryDrawerProps) {
  if (!category) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content className="bg-secondary flex flex-col rounded-t-[20px] h-[90vh] mt-24 fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto shadow-2xl border-t border-border">
          <div className="p-4 bg-background rounded-t-[20px] shrink-0 border-b border-border/50 shadow-sm">
            <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted-foreground/20 mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/5 rounded-lg text-primary">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">
                    {category.title}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    {items.length} Resource{items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Drawer.Close className="shrink-0 p-2 -mr-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </Drawer.Close>
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
            {items.length > 0 ? (
              <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} onClick={onItemClick} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center text-muted-foreground/30 mb-3 border border-border/50">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">No resources found</p>
                <p className="text-xs text-muted-foreground mt-1">This category is currently empty.</p>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
