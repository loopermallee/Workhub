export const categoryColorMap: Record<string, string> = {
  roster: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50",
  ambulance: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/50",
  training: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/50",
  admin: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/50",
};

export function getCategoryColor(categoryId: string): string {
  return categoryColorMap[categoryId] ?? "bg-secondary text-muted-foreground border-border/50";
}
