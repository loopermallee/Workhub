import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { X, FolderOpen, Plus, Link as LinkIcon, FileText, Loader2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ItemCard } from "./ItemCard";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAdminPin } from "@/lib/adminMode";
import { useToast } from "@/hooks/use-toast";
import type { Category, Item } from "@shared/schema";

interface CategoryDrawerProps {
  category: Category | null;
  items: Item[];
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: Item) => void;
  adminMode?: boolean;
}

export function CategoryDrawer({ category, items, isOpen, onClose, onItemClick, adminMode }: CategoryDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<"link" | "content">("link");
  const [addTitle, setAddTitle] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addTags, setAddTags] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [localItems, setLocalItems] = useState<Item[]>(items);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  if (!category) return null;

  const resetForm = () => {
    setAddType("link");
    setAddTitle("");
    setAddUrl("");
    setAddContent("");
    setAddTags("");
    setAddError("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleAddItem = async () => {
    if (!addTitle.trim()) { setAddError("Title is required"); return; }
    if (addType === "link" && !addUrl.trim()) { setAddError("URL is required"); return; }
    if (addType === "content" && !addContent.trim()) { setAddError("Content is required"); return; }

    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch("/api/data/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: getAdminPin(),
          categoryId: category.id,
          title: addTitle.trim(),
          type: addType,
          url: addType === "link" ? addUrl.trim() : undefined,
          content: addType === "content" ? addContent.trim() : undefined,
          tags: addTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.message ?? "Failed to add item");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/data"] });
      setShowAddDialog(false);
      resetForm();
      toast({ description: "Item added successfully" });
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/data/items/${item.id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": getAdminPin() },
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ description: data.message ?? "Failed to delete item", variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/data"] });
      toast({ description: "Item deleted" });
    } catch {
      toast({ description: "Network error", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = async (index: number, dir: "up" | "down") => {
    const newItems = [...localItems];
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]];
    const prev = localItems;
    setLocalItems(newItems);
    setMovingId(newItems[swapIdx].id);
    setTimeout(() => setMovingId(null), 400);
    try {
      const res = await fetch("/api/data/items/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: getAdminPin(),
          categoryId: category.id,
          itemIds: newItems.map((i) => i.id),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["/api/data"] });
    } catch {
      setLocalItems(prev);
      toast({ description: "Failed to save order", variant: "destructive" });
    }
  };

  return (
    <>
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
                      {localItems.length} Resource{localItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adminMode && (
                    <button
                      data-testid="button-add-category-item"
                      onClick={handleOpenAdd}
                      className="flex items-center gap-1 text-[11px] font-semibold bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  )}
                  <Drawer.Close className="shrink-0 p-2 -mr-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </Drawer.Close>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
              {localItems.length > 0 ? (
                <div className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  {localItems.map((item, index) => (
                    <div key={item.id} className="relative group">
                      {adminMode && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5">
                          <button
                            data-testid={`button-move-up-${item.id}`}
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0 || movingId === item.id}
                            className="w-6 h-6 flex items-center justify-center rounded bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all"
                            title="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            data-testid={`button-move-down-${item.id}`}
                            onClick={() => handleMove(index, "down")}
                            disabled={index === localItems.length - 1 || movingId === item.id}
                            className="w-6 h-6 flex items-center justify-center rounded bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all"
                            title="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className={adminMode ? "pl-8" : ""}>
                        <ItemCard item={item} onClick={onItemClick} />
                      </div>
                      {adminMode && (
                        <button
                          data-testid={`button-delete-item-${item.id}`}
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingId === item.id}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                          title="Delete item"
                        >
                          {deletingId === item.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center text-muted-foreground/30 mb-3 border border-border/50">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No resources found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {adminMode ? 'Tap "Add" above to add the first item.' : 'This category is currently empty.'}
                  </p>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Dialog open={showAddDialog} onOpenChange={(o) => { if (!o) { setShowAddDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-sm mx-auto rounded-xl p-5">
          <DialogTitle className="text-base font-semibold font-display">Add to {category.title}</DialogTitle>
          <DialogDescription className="sr-only">Add a new resource item to this category.</DialogDescription>

          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <button
                data-testid="button-add-type-link"
                onClick={() => setAddType("link")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  addType === "link"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Link
              </button>
              <button
                data-testid="button-add-type-content"
                onClick={() => setAddType("content")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  addType === "content"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Content
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-item-title" className="text-xs font-medium text-muted-foreground">Title *</Label>
              <Input
                id="add-item-title"
                data-testid="input-add-item-title"
                placeholder="Resource title"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="text-sm"
              />
            </div>

            {addType === "link" ? (
              <div className="space-y-1.5">
                <Label htmlFor="add-item-url" className="text-xs font-medium text-muted-foreground">URL *</Label>
                <Input
                  id="add-item-url"
                  data-testid="input-add-item-url"
                  placeholder="https://..."
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  className="text-sm"
                  type="url"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="add-item-content" className="text-xs font-medium text-muted-foreground">Content *</Label>
                <Textarea
                  id="add-item-content"
                  data-testid="input-add-item-content"
                  placeholder="Enter content text..."
                  value={addContent}
                  onChange={(e) => setAddContent(e.target.value)}
                  className="text-sm min-h-[100px] resize-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="add-item-tags" className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</Label>
              <Input
                id="add-item-tags"
                data-testid="input-add-item-tags"
                placeholder="roster, schedule, link"
                value={addTags}
                onChange={(e) => setAddTags(e.target.value)}
                className="text-sm"
              />
            </div>

            {addError && (
              <p data-testid="text-add-item-error" className="text-xs text-destructive">{addError}</p>
            )}

            <Button
              data-testid="button-add-item-submit"
              onClick={handleAddItem}
              disabled={addLoading}
              className="w-full"
            >
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {addLoading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
