import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const LS = {
  mode: "drug:mode",
  date: "drug:date",
  duty: "drug:duty",
  callSign: "drug:callsign",
  drugsUsed: "drug:drugsUsed",
};

type Mode = "create" | "update";
type Duty = "DD" | "ND";

interface ParsedDrug {
  name: string;
  count: number;
}

interface CallSignBlock {
  callSign: string;
  lines: string[];
}

interface ParsedHOTO {
  headerLine: string;
  dutyLine: string;
  blocks: CallSignBlock[];
  totals: { drug: string; count: string }[];
  trailingLines: string[];
}

function parseDrugs(text: string): ParsedDrug[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s+x(\d+)$/i);
      if (m) return { name: m[1].trim(), count: parseInt(m[2], 10) };
      return { name: l, count: 0 };
    });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function parseHOTO(text: string): ParsedHOTO | null {
  if (!text.trim()) return null;
  const lines = text.split("\n");

  let headerLine = "";
  let dutyLine = "";
  let headerIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("DAILY DRUGS HOTO")) {
      headerLine = lines[i];
      headerIdx = i;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          dutyLine = lines[j].trim();
          break;
        }
      }
      break;
    }
  }

  const callSignMarker = /^\*[A-Za-z0-9]+\*\s*$/;
  const totalLineRe = /^([A-Za-z ]+):\s*(\d+|-)\s*$/;

  const blocks: CallSignBlock[] = [];
  const totals: { drug: string; count: string }[] = [];
  const trailingLines: string[] = [];

  let i = headerIdx + 1;
  if (headerIdx === -1) i = 0;

  while (i < lines.length && !callSignMarker.test(lines[i].trim())) {
    i++;
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (callSignMarker.test(trimmed)) {
      const cs = trimmed.replace(/\*/g, "").trim();
      const blockLines: string[] = [lines[i]];
      i++;
      while (i < lines.length && !callSignMarker.test(lines[i].trim())) {
        const possible = lines[i].trim();
        const isTotalLine = totalLineRe.test(possible);
        const nextIsTotalsSection =
          isTotalLine &&
          i + 1 < lines.length &&
          (lines[i + 1].trim() === "" || totalLineRe.test(lines[i + 1].trim()));
        if (nextIsTotalsSection) break;
        blockLines.push(lines[i]);
        i++;
      }
      blocks.push({ callSign: cs, lines: blockLines });
    } else {
      break;
    }
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(/^([A-Za-z ]+):\s*(\d+|-)\s*$/);
    if (m) {
      totals.push({ drug: m[1].trim(), count: m[2].trim() });
    } else {
      trailingLines.push(lines[i]);
    }
    i++;
  }

  return { headerLine, dutyLine, blocks, totals, trailingLines };
}

function buildDrugBlock(callSign: string, drugs: ParsedDrug[]): string[] {
  const lines: string[] = [];
  lines.push(`*${callSign}*`);
  if (drugs.length > 0) {
    lines.push("Drugs used:");
    for (const d of drugs) {
      lines.push(`- ${d.name} x${d.count}`);
    }
  } else {
    lines.push("Drugs used:");
    lines.push("- Nil");
  }
  return lines;
}

function buildOutput(
  mode: Mode,
  dateIso: string,
  duty: Duty,
  callSign: string,
  drugsText: string,
  existingText: string
): string {
  const drugs = parseDrugs(drugsText);
  const dateStr = formatDate(dateIso);
  const cs = callSign.trim();

  if (mode === "create" || !existingText.trim()) {
    const lines: string[] = [];
    lines.push("DAILY DRUGS HOTO");
    lines.push(`${dateStr} ${duty}`);
    lines.push("");
    if (cs) {
      lines.push(...buildDrugBlock(cs, drugs));
      lines.push("");
    }
    if (drugs.length > 0) {
      lines.push("Drug totals:");
      for (const d of drugs) {
        lines.push(`${d.name}: -`);
      }
    }
    return lines.join("\n");
  }

  const parsed = parseHOTO(existingText);
  if (!parsed) {
    return buildOutput("create", dateIso, duty, callSign, drugsText, "");
  }

  const oldBlockIdx = parsed.blocks.findIndex(
    (b) => b.callSign.toLowerCase() === cs.toLowerCase()
  );

  const oldDrugs: ParsedDrug[] =
    oldBlockIdx !== -1
      ? parseDrugsFromBlock(parsed.blocks[oldBlockIdx].lines)
      : [];

  const newBlock = cs ? buildDrugBlock(cs, drugs) : [];

  const newBlocks = [...parsed.blocks];
  if (oldBlockIdx !== -1) {
    if (cs) {
      newBlocks[oldBlockIdx] = { callSign: cs, lines: newBlock };
    } else {
      newBlocks.splice(oldBlockIdx, 1);
    }
  } else if (cs) {
    newBlocks.push({ callSign: cs, lines: newBlock });
  }

  const newTotals = recalcTotals(parsed.totals, oldDrugs, drugs);

  const outLines: string[] = [];
  if (parsed.headerLine) outLines.push(parsed.headerLine);
  if (parsed.dutyLine) {
    outLines.push(parsed.dutyLine);
  }
  outLines.push("");

  for (const block of newBlocks) {
    outLines.push(...block.lines);
    outLines.push("");
  }

  if (newTotals.length > 0) {
    for (const t of newTotals) {
      outLines.push(`${t.drug}: ${t.count}`);
    }
  }

  for (const l of parsed.trailingLines) {
    outLines.push(l);
  }

  return outLines.join("\n").trimEnd();
}

function parseDrugsFromBlock(blockLines: string[]): ParsedDrug[] {
  const results: ParsedDrug[] = [];
  for (const line of blockLines) {
    const m = line.trim().match(/^-\s+(.+?)\s+x(\d+)$/i);
    if (m) results.push({ name: m[1].trim(), count: parseInt(m[2], 10) });
  }
  return results;
}

function recalcTotals(
  existingTotals: { drug: string; count: string }[],
  oldDrugs: ParsedDrug[],
  newDrugs: ParsedDrug[]
): { drug: string; count: string }[] {
  const result: { drug: string; count: string }[] = [...existingTotals];

  const allDrugNamesSet = new Set<string>([
    ...oldDrugs.map((d) => d.name.toLowerCase()),
    ...newDrugs.map((d) => d.name.toLowerCase()),
  ]);
  const allDrugNames = Array.from(allDrugNamesSet);

  for (const drugNameLower of allDrugNames) {
    const oldEntry = oldDrugs.find((d) => d.name.toLowerCase() === drugNameLower);
    const newEntry = newDrugs.find((d) => d.name.toLowerCase() === drugNameLower);
    const oldCount = oldEntry?.count ?? 0;
    const newCount = newEntry?.count ?? 0;

    const existingIdx = result.findIndex(
      (t) => t.drug.toLowerCase() === drugNameLower
    );

    const drugDisplayName =
      newEntry?.name ?? oldEntry?.name ?? drugNameLower;

    if (existingIdx !== -1) {
      const existing = result[existingIdx];
      if (existing.count === "-") {
        result[existingIdx] = { drug: existing.drug, count: "-" };
      } else {
        const parsed = parseInt(existing.count, 10);
        if (!isNaN(parsed)) {
          const updated = Math.max(0, parsed - oldCount + newCount);
          result[existingIdx] = { drug: existing.drug, count: String(updated) };
        }
      }
    } else {
      result.push({ drug: drugDisplayName, count: "-" });
    }
  }

  return result;
}

export default function DrugUsagePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(LS.mode) as Mode) ?? "create"
  );
  const [dateIso, setDateIso] = useState(
    () => localStorage.getItem(LS.date) ?? new Date().toISOString().slice(0, 10)
  );
  const [duty, setDuty] = useState<Duty>(
    () => (localStorage.getItem(LS.duty) as Duty) ?? "DD"
  );
  const [callSign, setCallSign] = useState(
    () => localStorage.getItem(LS.callSign) ?? ""
  );
  const [drugsUsed, setDrugsUsed] = useState(
    () => localStorage.getItem(LS.drugsUsed) ?? ""
  );
  const [existingHOTO, setExistingHOTO] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { localStorage.setItem(LS.mode, mode); }, [mode]);
  useEffect(() => { localStorage.setItem(LS.date, dateIso); }, [dateIso]);
  useEffect(() => { localStorage.setItem(LS.duty, duty); }, [duty]);
  useEffect(() => { localStorage.setItem(LS.callSign, callSign); }, [callSign]);
  useEffect(() => { localStorage.setItem(LS.drugsUsed, drugsUsed); }, [drugsUsed]);

  const output = useMemo(
    () => buildOutput(mode, dateIso, duty, callSign, drugsUsed, existingHOTO),
    [mode, dateIso, duty, callSign, drugsUsed, existingHOTO]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ description: "Copy failed. Please copy manually.", variant: "destructive" });
    });
  };

  const handleClear = () => {
    setDrugsUsed("");
    setExistingHOTO("");
    localStorage.removeItem(LS.drugsUsed);
  };

  const toggleBtnBase = "flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all";
  const activeBtn = "bg-primary text-primary-foreground border-primary";
  const inactiveBtn = "bg-background text-muted-foreground border-border hover:border-muted-foreground/40";

  const dutyBtnBase = "flex-1 py-2 rounded-lg border text-sm font-bold transition-all";
  const dutyActive = "bg-primary text-primary-foreground border-primary";
  const dutyInactive = "bg-background text-muted-foreground border-border hover:border-muted-foreground/40";

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
            <h2 className="text-xl font-bold font-display text-primary">Daily Drugs HOTO</h2>
            <p className="text-xs text-muted-foreground">Create or update drug handover</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Mode</p>
            <div className="flex gap-2">
              <button
                data-testid="button-drug-mode-create"
                onClick={() => setMode("create")}
                className={`${toggleBtnBase} ${mode === "create" ? activeBtn : inactiveBtn}`}
              >
                Create
              </button>
              <button
                data-testid="button-drug-mode-update"
                onClick={() => setMode("update")}
                className={`${toggleBtnBase} ${mode === "update" ? activeBtn : inactiveBtn}`}
              >
                Update existing
              </button>
            </div>
          </div>

          {/* Date + Duty row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
              <input
                data-testid="input-drug-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duty</label>
              <div className="flex gap-1.5">
                <button
                  data-testid="button-drug-duty-dd"
                  onClick={() => setDuty("DD")}
                  className={`${dutyBtnBase} px-4 ${duty === "DD" ? dutyActive : dutyInactive}`}
                >
                  DD
                </button>
                <button
                  data-testid="button-drug-duty-nd"
                  onClick={() => setDuty("ND")}
                  className={`${dutyBtnBase} px-4 ${duty === "ND" ? dutyActive : dutyInactive}`}
                >
                  ND
                </button>
              </div>
            </div>
          </div>

          {/* Call sign */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call Sign</label>
            <Input
              data-testid="input-drug-callsign"
              placeholder="e.g. A441D"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              className="text-base h-11"
            />
          </div>

          {/* Drugs used */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Drugs Used <span className="normal-case font-normal text-muted-foreground/60">(one per line)</span>
            </label>
            <Textarea
              data-testid="input-drug-drugsused"
              placeholder={"Morphine x2\nMidazolam x1"}
              value={drugsUsed}
              onChange={(e) => setDrugsUsed(e.target.value)}
              className="text-sm min-h-[100px] resize-none font-mono"
            />
          </div>

          {/* Existing HOTO (update mode only) */}
          {mode === "update" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Existing HOTO text
              </label>
              <Textarea
                data-testid="input-drug-existing"
                placeholder="Paste the current HOTO message here…"
                value={existingHOTO}
                onChange={(e) => setExistingHOTO(e.target.value)}
                className="text-sm min-h-[160px] resize-none font-mono"
              />
            </div>
          )}
        </div>

        {/* Output */}
        <div className="mt-6 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Output</p>
          <textarea
            data-testid="text-drug-output"
            readOnly
            value={output}
            className="w-full p-4 bg-muted border border-border rounded-xl font-mono text-sm text-foreground leading-relaxed resize-none min-h-[200px] focus:outline-none"
            rows={Math.max(8, output.split("\n").length + 1)}
          />
        </div>

        {/* Buttons */}
        <div className="mt-4 space-y-2.5">
          <Button
            data-testid="button-drug-copy"
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
            data-testid="button-drug-clear"
            onClick={handleClear}
            variant="outline"
            className="w-full h-11 text-sm font-semibold"
          >
            Clear drugs &amp; existing text
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
