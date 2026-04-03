import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PREDICTION_EXPLANATIONS } from "@/lib/compass/explainPrediction";
import { computePlndRecommendation } from "@/lib/compass/plnd";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import {
  deriveClinicalFromLesions,
  lesionsFromRows,
} from "@/lib/utils/normalization";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import { cn } from "@/lib/utils";
import type { NsSideDetail } from "@/types/prediction";

type Tab = "predictions" | "nerve" | "plnd";

// ── Colour helpers ────────────────────────────────────────────────────────────

function riskCls(v: number) {
  if (v < 0.15) return "text-emerald-500";
  if (v < 0.3) return "text-amber-500";
  return "text-red-500";
}

function riskBarCls(v: number) {
  if (v < 0.15) return "bg-emerald-500";
  if (v < 0.3) return "bg-amber-500";
  return "bg-red-500";
}

function nsTagCls(grade: number) {
  if (grade === 1)
    return "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400";
  if (grade === 2)
    return "rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400";
  return "rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400";
}

// ── Static data ───────────────────────────────────────────────────────────────

const ZONE_ROWS = [
  { k: "posterolateral", l: "Posterolateral" },
  { k: "base", l: "Base" },
  { k: "apex", l: "Apex" },
  { k: "anterior", l: "Anterior" },
  { k: "bladder_neck", l: "Bladder Neck" },
] as const;

const NSG_DATA: Record<
  number,
  { psm: number; bcrNo: number; bcrPsm: number; bcrAll: number; apexBcr: number; plBcr: number; baseBcr: number; antBcr: number; postBcr: number }
> = {
  1: { psm: 11.6, bcrNo: 3.4,  bcrPsm: 3.3,  bcrAll: 3.4,  apexBcr: 5,  plBcr: 0,  baseBcr: 0,  antBcr: 0,  postBcr: 0  },
  2: { psm: 12.0, bcrNo: 9.2,  bcrPsm: 16.0, bcrAll: 10.2, apexBcr: 20, plBcr: 8,  baseBcr: 23, antBcr: 6,  postBcr: 20 },
  3: { psm: 16.7, bcrNo: 21.6, bcrPsm: 27.6, bcrAll: 22.7, apexBcr: 15, plBcr: 25, baseBcr: 37, antBcr: 25, postBcr: 28 },
};

const STATION_FP: Record<string, { fp: number; note: string }> = {
  "external iliac":   { fp: 90, note: "Highest FP — mostly reactive in low-grade" },
  "internal iliac":   { fp: 20, note: "Low FP — high clinical significance" },
  "obturator":        { fp: 25, note: "Clinically significant when positive" },
  "common iliac":     { fp: 50, note: "Moderate concern, check SUVmax" },
  "perirectal":       { fp: 15, note: "Rare but highly concerning" },
  "presacral":        { fp: 30, note: "Moderate concern" },
  "paraaortic":       { fp: 40, note: "Extended field — may indicate higher stage" },
  "inguinal":         { fp: 70, note: "Often reactive" },
  "retroperitoneal":  { fp: 50, note: "Moderate concern, check SUVmax" },
};

function stationFpCls(fp: number) {
  if (fp >= 60) return "text-emerald-500";
  if (fp >= 30) return "text-amber-500";
  return "text-red-500";
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface LnNode { location?: string; side?: string; suv?: number; assessment?: string }

function PlndStationAnalysis({ nodes }: { nodes: LnNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        PSMA LN+ Station Analysis
      </div>
      {nodes.map((ln, i) => {
        const loc = (ln.location ?? "").toLowerCase();
        const side = ln.side === "L" ? "Left" : ln.side === "R" ? "Right" : "Bilateral";
        const suv = ln.suv ?? 0;
        const matchedKey = Object.keys(STATION_FP).find((k) => loc.includes(k));
        const fpData = matchedKey ? STATION_FP[matchedKey]! : { fp: 50, note: "Station not characterized" };
        const suvAssess =
          suv > 6   ? { label: "Likely true positive", cls: "text-red-500" } :
          suv >= 3.5 ? { label: "Indeterminate", cls: "text-amber-500" } :
          suv > 0    ? { label: "Likely reactive", cls: "text-emerald-500" } : null;
        return (
          <div key={i} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{(matchedKey ?? loc) || "Unknown station"}</span>
              <span className="text-muted-foreground">({side})</span>
            </div>
            {suvAssess && (
              <div className="mt-1">
                SUV <span className="font-bold">{suv}</span>
                {" — "}
                <span className={suvAssess.cls}>{suvAssess.label}</span>
              </div>
            )}
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-muted-foreground">Station FP:</span>
              <span className={cn("font-semibold", stationFpCls(fpData.fp))}>{fpData.fp}%</span>
              <span className="text-muted-foreground">· {fpData.note}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ZoneRow({ label, lv, rv, lHasZones, rHasZones }: {
  label: string; lv: number; rv: number; lHasZones: boolean; rHasZones: boolean;
}) {
  const dash = <span className="text-muted-foreground">—</span>;
  const fmt = (v: number, has: boolean) => {
    if (!has) return dash;
    if (v > 0 && v < 0.005) return <span className="text-muted-foreground">&lt;1%</span>;
    return <span className={riskCls(v)}>{Math.round(v * 100)}%</span>;
  };
  return (
    <tr className="border-b border-border/30">
      <td className="py-1.5 pr-2 text-muted-foreground">{label}</td>
      <td className="py-1.5 px-1 font-medium tabular-nums">{fmt(lv, lHasZones)}</td>
      <td className="py-1.5 px-1 font-medium tabular-nums">{fmt(rv, rHasZones)}</td>
    </tr>
  );
}

function Alerts({ detailL, detailR }: { detailL: NsSideDetail; detailR: NsSideDetail }) {
  const all = [
    ...detailL.alerts.map((a) => ({ s: "L", a })),
    ...detailR.alerts.map((a) => ({ s: "R", a })),
  ];
  if (all.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {all.map(({ s, a }, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-[11px] leading-snug",
            a.severity === "high"
              ? "border-red-500 bg-red-500/5 text-red-500"
              : "border-amber-500 bg-amber-500/5 text-amber-500",
          )}
        >
          <span className="mt-px shrink-0 font-bold">{s}</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}

function NsConsequence({ nsL, nsR, detailL, detailR }: {
  nsL: number; nsR: number; detailL: NsSideDetail; detailR: NsSideDetail;
}) {
  const grades =
    nsL === nsR
      ? [{ grade: nsL, label: `Grade ${nsL}`, detail: detailL }]
      : [
          { grade: nsL, label: `L — Grade ${nsL}`, detail: detailL },
          { grade: nsR, label: `R — Grade ${nsR}`, detail: detailR },
        ];

  return (
    <div className="space-y-3">
      {grades.map(({ grade, label, detail }) => {
        const gd = NSG_DATA[grade];
        if (!gd) return null;
        const apexConcern  = detail.alerts.some((a) => a.type === "apex") || (detail.zones.apex ?? 0) >= 0.08;
        const baseConcern  = detail.alerts.some((a) => a.type === "base" || a.type === "bladder_neck") || (detail.zones.base ?? 0) >= 0.08;
        const locRows = [
          { name: "Apex",               bcr: gd.apexBcr, concern: apexConcern },
          { name: "Posterolateral (NVB)", bcr: gd.plBcr,  concern: false },
          { name: "Posterior",           bcr: gd.postBcr, concern: false },
          { name: "Base / Bladder Neck", bcr: gd.baseBcr, concern: baseConcern },
          { name: "Anterior",            bcr: gd.antBcr,  concern: false },
        ];
        return (
          <div key={grade} className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Grade header */}
            <div className={cn(
              "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide",
              grade === 1 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : grade === 2 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
            )}>
              Surgical Consequence — {label}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
              {[
                { label: "PSM Rate", value: `${gd.psm}%`, cls: "text-amber-500" },
                { label: "BCR if PSM−", value: `${gd.bcrNo}%`, cls: gd.bcrNo < 10 ? "text-emerald-500" : gd.bcrNo < 20 ? "text-amber-500" : "text-red-500" },
                { label: "BCR if PSM+", value: `${gd.bcrPsm}%`, cls: gd.bcrPsm < 10 ? "text-emerald-500" : gd.bcrPsm < 20 ? "text-amber-500" : "text-red-500" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="px-3 py-2.5 text-center">
                  <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className={cn("mt-0.5 text-base font-bold tabular-nums", cls)}>{value}</div>
                </div>
              ))}
            </div>

            {/* BCR by location */}
            <div className="px-4 py-3">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">BCR by margin location</div>
              <div className="space-y-1.5">
                {locRows.map((loc) => (
                  <div key={loc.name} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px]", loc.concern && "bg-amber-500/5")}>
                    <span className={cn("flex-1", loc.concern && "font-semibold")}>
                      {loc.name}{loc.concern ? " ⚠" : ""}
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", loc.bcr === 0 ? "bg-emerald-500" : loc.bcr < 15 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${Math.min(100, loc.bcr * 2)}%` }}
                      />
                    </div>
                    <span className={cn("w-8 text-right font-semibold tabular-nums", loc.bcr === 0 ? "text-emerald-500" : loc.bcr < 15 ? "text-amber-500" : "text-red-500")}>
                      {loc.bcr}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PredictionPanel() {
  const [tab, setTab] = useState<Tab>("predictions");

  const predictions = usePatientStore((s) => s.predictions);
  const patients    = usePatientStore((s) => s.patients);
  const activeId    = usePatientStore((s) => s.activeId);
  const entry       = patients.find((p) => p.id === activeId);
  const setExplainKey = useUiStore((s) => s.setExplainKey);

  if (!predictions || !entry) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/10">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a patient to run COMPASS predictions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const record = { ...entry.record, lesions: entry.lesionRows };
  const S = deriveClinicalFromLesions(
    clinicalStateFromRecord(record),
    lesionsFromRows(entry.lesionRows),
  );
  const plnd = computePlndRecommendation(S.psa, S.gg, S.psma_ln, predictions.lni);
  const isHighRisk = S.gg >= 4 || S.psa > 20;

  const rawLnPsma = entry.record.staging.lymph_nodes_psma;
  const lnNodes: LnNode[] = Array.isArray(rawLnPsma) ? (rawLnPsma as LnNode[]) : [];

  const preds = [
    { k: "ECE",     v: predictions.ece },
    { k: "SVI",     v: predictions.svi },
    { k: "Upgrade", v: predictions.upgrade },
    { k: "PSM",     v: predictions.psm },
    { k: "BCR",     v: predictions.bcr },
    { k: "LNI",     v: predictions.lni },
  ] as const;

  const plndToneCls =
    plnd.tone === "success" ? "border-l-emerald-500 bg-emerald-500/5"
    : plnd.tone === "warning" ? "border-l-amber-500 bg-amber-500/5"
    : "border-l-red-500 bg-red-500/5";

  const plndTextCls =
    plnd.tone === "success" ? "text-emerald-600 dark:text-emerald-400"
    : plnd.tone === "warning" ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";

  const { nsDetailL: detailL, nsDetailR: detailR } = predictions;

  let lHasZones = detailL.has_zone_data;
  let rHasZones = detailR.has_zone_data;
  for (const k of Object.keys(detailL.zones)) {
    if ((detailL.zones[k] ?? 0) > 0) lHasZones = true;
    if ((detailR.zones[k] ?? 0) > 0) rHasZones = true;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "predictions", label: "Predictions" },
    { id: "nerve",       label: "Nerve Sparing" },
    { id: "plnd",        label: "PLND" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="overflow-hidden border-border">
        <CardHeader className="border-b border-border bg-muted/20 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              COMPASS Predictions
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setExplainKey("overview")}
            >
              About models
            </Button>
          </div>

          {/* Tab bar */}
          <div className="mt-2 flex gap-0.5 rounded-lg bg-muted/50 p-0.5">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all",
                  tab === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* ── Tab: Predictions ── */}
          {tab === "predictions" && (
            <div className="space-y-4">
              {/* 6-tile grid */}
              <div className="grid grid-cols-3 gap-2">
                {preds.map((p) => (
                  <Tooltip key={p.k}>
                    <TooltipTrigger asChild>
                      <div className="cursor-default rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
                        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {p.k}
                        </div>
                        <div className={cn("mt-0.5 text-xl font-black tabular-nums", riskCls(p.v))}>
                          {Math.round(p.v * 100)}%
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-[11px]">
                      {PREDICTION_EXPLANATIONS[p.k] ?? p.k}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Horizontal bar chart */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outcome profile
                </div>
                <div className="space-y-2.5">
                  {preds.map((p) => (
                    <div key={p.k} className="flex items-center gap-3">
                      <span className="w-[4.5rem] shrink-0 text-[11px] font-medium text-muted-foreground">
                        {p.k}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", riskBarCls(p.v))}
                          style={{ width: `${Math.min(100, p.v * 100)}%` }}
                        />
                      </div>
                      <span className={cn("w-9 shrink-0 text-right text-[12px] font-bold tabular-nums", riskCls(p.v))}>
                        {Math.round(p.v * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side-specific ECE + Focal/Extensive */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Side-specific
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "ECE Left",  v: predictions.eceL },
                    { label: "ECE Right", v: predictions.eceR },
                    { label: "SVI Left",  v: predictions.sviL },
                    { label: "SVI Right", v: predictions.sviR },
                  ].map(({ label, v }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <span className={cn("text-sm font-bold tabular-nums", riskCls(v))}>
                        {Math.round(v * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
                {predictions.ece >= 0.05 && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px]">
                    <span className="text-muted-foreground">If ECE:</span>
                    <span className="text-emerald-500 font-medium">{Math.round((1 - predictions.extensive) * 100)}% focal</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={cn("font-medium", predictions.extensive >= 0.5 ? "text-red-500" : "text-amber-500")}>
                      {Math.round(predictions.extensive * 100)}% extensive
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Nerve Sparing ── */}
          {tab === "nerve" && (
            <div className="space-y-4">
              {/* NS grade summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { side: "Left", grade: predictions.nsL, detail: detailL },
                  { side: "Right", grade: predictions.nsR, detail: detailR },
                ].map(({ side, grade, detail }) => (
                  <div key={side} className={cn(
                    "rounded-lg border p-3 text-center",
                    grade === 1 ? "border-emerald-500/30 bg-emerald-500/5"
                    : grade === 2 ? "border-amber-500/30 bg-amber-500/5"
                    : "border-red-500/30 bg-red-500/5",
                  )}>
                    <div className="text-[10px] font-medium text-muted-foreground">{side}</div>
                    <div className="mt-1">
                      <span className={nsTagCls(grade)}>Grade {grade}</span>
                    </div>
                    <div className="mt-1.5 text-[9px] text-muted-foreground leading-snug">
                      {detail.reason}
                    </div>
                  </div>
                ))}
              </div>

              {/* 5-zone table */}
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">Zone</th>
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Left</th>
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Right</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ZONE_ROWS.map(({ k, l }) => (
                      <ZoneRow
                        key={k}
                        label={l}
                        lv={detailL.zones[k] ?? 0}
                        rv={detailR.zones[k] ?? 0}
                        lHasZones={lHasZones}
                        rHasZones={rHasZones}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Surgical alerts */}
              <Alerts detailL={detailL} detailR={detailR} />

              {/* NS consequence chain */}
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  PSM &amp; BCR by NS Grade
                </div>
                <NsConsequence
                  nsL={predictions.nsL}
                  nsR={predictions.nsR}
                  detailL={detailL}
                  detailR={detailR}
                />
              </div>
            </div>
          )}

          {/* ── Tab: PLND ── */}
          {tab === "plnd" && (
            <div className="space-y-4">
              {/* Stat tiles */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">LNI Risk</div>
                  <div className={cn("mt-1 text-xl font-black tabular-nums", riskCls(predictions.lni))}>
                    {Math.round(predictions.lni * 100)}%
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">NCCN Risk</div>
                  <div className={cn("mt-1 text-sm font-black", isHighRisk ? "text-red-500" : "text-emerald-500")}>
                    {isHighRisk ? "High" : "Non-High"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">PSMA LN</div>
                  <div className={cn("mt-1 text-sm font-black", S.psma_ln ? "text-red-500" : "text-emerald-500")}>
                    {S.psma_ln ? "Positive" : "Negative"}
                  </div>
                </div>
              </div>

              {/* Recommendation card */}
              <div className={cn(
                "rounded-lg border border-l-4 p-4",
                plndToneCls,
              )}>
                <div className={cn("text-sm font-bold", plndTextCls)}>
                  {plnd.icon} {plnd.title}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {plnd.detail}
                </p>
              </div>

              {/* Station analysis */}
              {S.psma_ln === 1 && lnNodes.length > 0 && (
                <PlndStationAnalysis nodes={lnNodes} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
