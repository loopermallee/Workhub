import { useLocation } from "wouter";
import { ArrowLeft, HeartPulse, Pill, ChevronRight } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";

const TEMPLATES = [
  {
    id: "ohca",
    path: "/templates/ohca",
    icon: HeartPulse,
    iconColor: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-100 dark:border-rose-900/50",
    title: "OHCA Report Generator",
    subtitle: "Format cardiac arrest report text",
  },
  {
    id: "drug-usage",
    path: "/templates/drug-usage",
    icon: Pill,
    iconColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-100 dark:border-amber-900/50",
    title: "Daily Drugs HOTO",
    subtitle: "Create or update drug handover message",
  },
];

export default function TemplatesPage() {
  const [, setLocation] = useLocation();

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            data-testid="button-back-home"
            onClick={() => setLocation("/")}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold font-display text-primary">Templates</h2>
            <p className="text-xs text-muted-foreground">Quick formatting tools</p>
          </div>
        </div>

        <div className="space-y-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                data-testid={`button-template-${t.id}`}
                onClick={() => setLocation(t.path)}
                className={`w-full flex items-center gap-4 p-4 bg-card border ${t.borderColor} rounded-xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-primary font-display">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
