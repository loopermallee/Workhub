import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, Check, Copy } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const LS_KEYS = {
  callSign: "ohca:callsign",
  rank: "ohca:rank",
  name: "ohca:name",
  codeReview: "ohca:codeReview",
};

export default function OHCAPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [incidentNumber, setIncidentNumber] = useState("");
  const [callSign, setCallSign] = useState(() => localStorage.getItem(LS_KEYS.callSign) ?? "");
  const [rank, setRank] = useState(() => localStorage.getItem(LS_KEYS.rank) ?? "");
  const [name, setName] = useState(() => localStorage.getItem(LS_KEYS.name) ?? "");
  const [codeReview, setCodeReview] = useState<"done" | "not_done">(
    () => (localStorage.getItem(LS_KEYS.codeReview) as "done" | "not_done") ?? "not_done"
  );
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { localStorage.setItem(LS_KEYS.callSign, callSign); }, [callSign]);
  useEffect(() => { localStorage.setItem(LS_KEYS.rank, rank); }, [rank]);
  useEffect(() => { localStorage.setItem(LS_KEYS.name, name); }, [name]);
  useEffect(() => { localStorage.setItem(LS_KEYS.codeReview, codeReview); }, [codeReview]);

  const line1 = [incidentNumber, callSign].filter(Boolean).join(" ");
  const line2 = [rank, name].filter(Boolean).join(" ");
  const line3 = codeReview === "done" ? "CodeReview: ✅" : "CodeReview: ❌";
  const line4 = "Sharepoint: ❌";
  const outputText = [line1, line2, line3, line4].join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ description: "Copy failed. Please copy manually.", variant: "destructive" });
    });
  };

  const handleClear = () => {
    setIncidentNumber("");
    setCallSign("");
    setRank("");
    setName("");
    setCodeReview("not_done");
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            data-testid="button-back-templates"
            onClick={() => setLocation("/templates")}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            aria-label="Back to templates"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold font-display text-primary">OHCA Generator</h2>
            <p className="text-xs text-muted-foreground">Format cardiac arrest report</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Incident No.</label>
            <Input
              data-testid="input-ohca-incident"
              placeholder="e.g. 20250211/0781"
              value={incidentNumber}
              onChange={(e) => setIncidentNumber(e.target.value)}
              className="text-base h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call Sign</label>
            <Input
              data-testid="input-ohca-callsign"
              placeholder="e.g. A441D"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              className="text-base h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rank</label>
            <Input
              data-testid="input-ohca-rank"
              placeholder="e.g. WO1, CPL, SGT"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="text-base h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
            <Input
              data-testid="input-ohca-name"
              placeholder="e.g. Lavitz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code Review</label>
            <div className="flex gap-2">
              <button
                data-testid="button-ohca-codereview-done"
                onClick={() => setCodeReview("done")}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  codeReview === "done"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40"
                }`}
              >
                ✅ Done
              </button>
              <button
                data-testid="button-ohca-codereview-notdone"
                onClick={() => setCodeReview("not_done")}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  codeReview === "not_done"
                    ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40"
                }`}
              >
                ❌ Not Done
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-secondary border border-border">
            <Lock className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Sharepoint: ❌</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wide">Fixed</span>
          </div>
        </div>

        <div className="mt-6 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Output</p>
          <textarea
            data-testid="text-ohca-output"
            readOnly
            value={outputText}
            className="w-full p-4 bg-muted border border-border rounded-xl font-mono text-sm text-foreground leading-relaxed min-h-[96px] resize-none focus:outline-none"
            rows={4}
          />
        </div>

        <div className="mt-4 space-y-2.5">
          <Button
            data-testid="button-ohca-copy"
            onClick={handleCopy}
            className="w-full h-11 text-sm font-semibold"
          >
            {copied ? (
              <><Check className="w-4 h-4 mr-2" />Copied!</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" />Copy</>
            )}
          </Button>
          <Button
            data-testid="button-ohca-clear"
            onClick={handleClear}
            variant="outline"
            className="w-full h-11 text-sm font-semibold"
          >
            Clear
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
