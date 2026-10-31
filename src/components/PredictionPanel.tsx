import { Button } from "@/components/ui/button";
import { MissingInputsNotice } from "@/components/MissingInputsNotice";
import { LegacyPredictionPanel } from "@/legacy/components/LegacyPredictionPanel";
import {
  Card,
  CardContent,
  CardDescription,
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
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import {
  deriveClinicalFromLesions,
  lesionsFromRows,
} from "@/lib/utils/normalization";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import { cn } from "@/lib/utils";
import { PSM_TIER_CUTOFFS, PSM_TIER_LABELS } from "@/lib/models/vnext/psmSide";
import { assignTier } from "@/lib/models/vnext/common";
import { bcrTier, type BcrHorizon } from "@/lib/models/vnext/bcrCox";

// NS Grade → PSM → BCR data from 5,003-side database
const NSG_DATA = {
  1: { psm: 11.6, bcr_no: 3.4, bcr_psm: 3.3, apex_psm: 3.0, apex_bcr: 5, pl_psm: 0.8, pl_bcr: 0, base_psm: 1.6, base_bcr: 0, ant_psm: 1.7, ant_bcr: 0, post_psm: 3.0, post_bcr: 0 },
  2: { psm: 12.0, bcr_no: 9.2, bcr_psm: 16.0, apex_psm: 2.5, apex_bcr: 20, pl_psm: 1.2, pl_bcr: 8, base_psm: 1.8, base_bcr: 23, ant_psm: 1.5, ant_bcr: 6, post_psm: 3.0, post_bcr: 20 },
  3: { psm: 16.7, bcr_no: 21.6, bcr_psm: 27.6, apex_psm: 1.8, apex_bcr: 15, pl_psm: 0.7, pl_bcr: 25, base_psm: 4.4, base_bcr: 37, ant_psm: 1.4, ant_bcr: 25, post_psm: 3.3, post_bcr: 28 },
} as const;

const STATION_FP: Record<string, { fp: number; note: string }> = {
  "external iliac": { fp: 90, note: "Highest FP rate — 90% benign. Predominantly low-grade patients." },
  "internal iliac": { fp: 20, note: "Low FP rate — high clinical significance." },
  "obturator": { fp: 25, note: "Low FP rate — clinically significant when positive." },
  "common iliac": { fp: 50, note: "Moderate FP rate. Concerning if high SUV." },
  "perirectal": { fp: 15, note: "Rare but concerning. Low FP rate." },
  "presacral": { fp: 30, note: "Moderate concern." },
  "paraaortic": { fp: 40, note: "Extended field. May indicate higher stage." },
  "inguinal": { fp: 70, note: "Often reactive." },
  "retroperitoneal": { fp: 50, note: "Moderate concern. Check SUVmax." },
};

function pctOrDash(v: number) {
  return Number.isFinite(v) ? `${Math.round(v * 100)}%` : "—";
}

function riskCls(v: number) {
  if (v < 0.15) return "text-emerald-500";
  if (v < 0.3) return "text-amber-500";
  return "text-red-500";
}

/** Approximate 90% CI on logit scale (SE ≈ 0.58 logit units, z = 1.64) */
function computeCI(p: number): { lo: number; hi: number } {
  if (p <= 0.001 || p >= 0.999) return { lo: p, hi: p };
  const L = Math.log(p / (1 - p));
  const lo = 1 / (1 + Math.exp(-(L - 0.951)));
  const hi = 1 / (1 + Math.exp(-(L + 0.951)));
  return { lo: Math.max(0.01, lo), hi: Math.min(0.99, hi) };
}

/** Side-specific PSM tiers: <3% very low, 3-<8% low, 8-<15% intermediate, >=15% high. */
function psmTier(v: number) {
  return Number.isFinite(v) ? assignTier(v, PSM_TIER_CUTOFFS, PSM_TIER_LABELS).label : "N/A";
}
function psmCls(v: number) {
  if (!Number.isFinite(v)) return "text-muted-foreground/50";
  if (v < 0.08) return "text-emerald-500";
  if (v < 0.15) return "text-amber-500";
  return "text-red-500";
}
function psmBarCls(v: number) {
  if (!Number.isFinite(v)) return "bg-muted-foreground/30";
  if (v < 0.08) return "bg-emerald-500";
  if (v < 0.15) return "bg-amber-500";
  return "bg-red-500";
}
const psmPct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "N/A");

/** BCR Cox tiers per horizon: Low / Intermediate / High. */
function bcrHTier(h: BcrHorizon, v: number) {
  return Number.isFinite(v) ? bcrTier(h, v).label : "N/A";
}
function bcrHCls(h: BcrHorizon, v: number) {
  if (!Number.isFinite(v)) return "text-muted-foreground/50";
  const i = bcrTier(h, v).index;
  return i === 1 ? "text-emerald-500" : i === 2 ? "text-amber-500" : "text-red-500";
}
function bcrHBarCls(h: BcrHorizon, v: number) {
  if (!Number.isFinite(v)) return "bg-muted-foreground/30";
  const i = bcrTier(h, v).index;
  return i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-red-500";
}
const bcrPct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "N/A");

function bcrColor(pct: number) {
  if (pct === 0) return "text-emerald-500";
  if (pct < 15) return "text-amber-500";
  return "text-red-500";
}

interface LnNode {
  location?: string;
  suv?: number;
  side?: string;
}

function NsGradeTag({ grade }: { grade: number }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-sm font-bold",
        grade === 1
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : grade === 2
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            : "bg-red-500/15 text-red-600 dark:text-red-400",
      )}
    >
      Grade {grade}
    </span>
  );
}

export function PredictionPanel() {
  const predictions = usePatientStore((s) => s.predictions);
  const missingRequired = usePatientStore((s) => s.missingRequired);
  const computeEntryPredictions = usePatientStore((s) => s.computeEntryPredictions);
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const entry = patients.find((p) => p.id === activeId);
  const setExplainKey = useUiStore((s) => s.setExplainKey);
  const modelSet = usePatientStore((s) => s.modelSet);

  // Original (v22) engine: Daniel's May 13 predictions panel, reading the v22 output.
  if (modelSet === "v22") return <LegacyPredictionPanel />;

  if (!predictions && entry && missingRequired.length > 0) {
    return <MissingInputsNotice />;
  }

  if (!predictions || !entry) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/10">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a patient to run COMPASS models.
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

  const isHighRisk = S.gg >= 4 || S.psa > 20;
  const psmaLn = S.psma_ln || 0;
  const lniRisk = predictions.lni;

  // SVI: only colour when ≥ 10%
  const sviNeutral = predictions.svi < 0.10;

  const preds = [
    { k: "ECE",     v: predictions.ece,     neutral: false },
    { k: "SVI",     v: predictions.svi,     neutral: sviNeutral },
    { k: "Upgrade", v: predictions.upgrade, neutral: !Number.isFinite(predictions.upgrade) },
    { k: "PSM",     v: Math.max(predictions.psmL, predictions.psmR), neutral: false,
      sub: `L ${pctOrDash(predictions.psmL)} · R ${pctOrDash(predictions.psmR)}` },
    { k: "BCR",     v: predictions.bcr36,   neutral: false, sub: "36-month" },
    { k: "LNI",     v: predictions.lni,     neutral: false },
  ] as { k: string; v: number; neutral: boolean; sub?: string }[];

  // NS zone detail
  const L = predictions.nsDetailL ?? { nsGrade: predictions.nsL, zones: {}, alerts: [], has_zone_data: false };
  const R = predictions.nsDetailR ?? { nsGrade: predictions.nsR, zones: {}, alerts: [], has_zone_data: false };
  const zones5 = [
    { k: "posterolateral", l: "Posterolateral" },
    { k: "base", l: "Base" },
    { k: "apex", l: "Apex" },
    { k: "anterior", l: "Anterior" },
    { k: "bladder_neck", l: "Bladder Neck" },
  ];
  let lHasZones = L.has_zone_data;
  let rHasZones = R.has_zone_data;
  zones5.forEach((z) => {
    if ((L.zones?.[z.k] ?? 0) > 0) lHasZones = true;
    if ((R.zones?.[z.k] ?? 0) > 0) rHasZones = true;
  });

  const gradesToShow =
    predictions.nsL === predictions.nsR
      ? [{ grade: predictions.nsL, label: `Grade ${predictions.nsL}`, isLeft: true }]
      : [
          { grade: predictions.nsL, label: `L Grade ${predictions.nsL}`, isLeft: true },
          { grade: predictions.nsR, label: `R Grade ${predictions.nsR}`, isLeft: false },
        ];

  let plndTitle: string, plndColor: string;
  if (!isHighRisk && !psmaLn) {
    plndTitle = "Consider Omitting PLND";
    plndColor = "border-l-emerald-500";
  } else if (!isHighRisk && psmaLn) {
    plndTitle = "Limited PLND";
    plndColor = "border-l-amber-500";
  } else if (isHighRisk && !psmaLn) {
    plndTitle = "Extended PLND Recommended";
    plndColor = "border-l-amber-500";
  } else {
    plndTitle = "Extended PLND — High Priority";
    plndColor = "border-l-red-500";
  }

  const lymphNodes = (entry.record.staging?.lymph_nodes_psma ?? null) as LnNode[] | null;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent pb-4 dark:from-muted/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">
                COMPASS predictions
              </CardTitle>
              <CardDescription>
                Preoperative outcome predictions at time of radical prostatectomy.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-sm"
              onClick={() => setExplainKey("overview")}
            >
              Explain
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* 6 prediction value cards — extra top margin so floating overlays
              (e.g. CSPCA-by-zone popout from the 3D canvas) don't overlap. */}
          <div className="mb-4 mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {preds.map((p) => {
              const ci = computeCI(p.v);
              if (p.k === "PSM") {
                const sides = [
                  { s: "L", v: predictions.psmL },
                  { s: "R", v: predictions.psmR },
                ];
                return (
                  <Tooltip key={p.k}>
                    <TooltipTrigger asChild>
                      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card px-2 py-2 text-center shadow-sm transition-shadow hover:shadow-md cursor-default sm:px-3 sm:py-3">
                        <div className="absolute inset-x-0 top-0 flex h-[3px]">
                          {sides.map((x) => (
                            <div key={x.s} className={cn("h-full w-1/2", psmBarCls(x.v))} />
                          ))}
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">PSM</div>
                        <div className="grid grid-cols-2 gap-1">
                          {sides.map((x) => (
                            <div key={x.s}>
                              <div className="text-[10px] font-semibold text-muted-foreground/70 sm:text-xs">{x.s === "L" ? "Left" : "Right"}</div>
                              <div className={cn("text-base font-bold tabular-nums sm:text-xl lg:text-2xl", psmCls(x.v))}>{psmPct(x.v)}</div>
                              <div className="text-[10px] leading-tight text-muted-foreground/60 sm:text-xs">{psmTier(x.v)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 flex h-1 w-full gap-0.5 overflow-hidden rounded-full">
                          {sides.map((x) => (
                            <div key={x.s} className="h-full w-1/2 bg-muted/60">
                              <div
                                className={cn("h-full rounded-full transition-all", psmBarCls(x.v))}
                                style={{ width: `${Number.isFinite(x.v) ? Math.min(100, Math.round(x.v * 100 * 5)) : 0}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      {PREDICTION_EXPLANATIONS[p.k] ?? p.k}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              if (p.k === "BCR") {
                const rows: { h: BcrHorizon; v: number }[] = [
                  { h: 12, v: predictions.bcr12 },
                  { h: 24, v: predictions.bcr24 },
                  { h: 36, v: predictions.bcr36 },
                ];
                return (
                  <Tooltip key={p.k}>
                    <TooltipTrigger asChild>
                      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card px-2 py-2 text-center shadow-sm transition-shadow hover:shadow-md cursor-default sm:px-3 sm:py-3">
                        <div className="absolute inset-x-0 top-0 flex h-[3px]">
                          {rows.map((x) => (
                            <div key={x.h} className={cn("h-full w-1/3", bcrHBarCls(x.h, x.v))} />
                          ))}
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">BCR</div>
                        <div className="space-y-0.5">
                          {rows.map((x) => (
                            <div key={x.h} className="flex items-baseline justify-between gap-1">
                              <span className="text-[10px] font-semibold text-muted-foreground/70 sm:text-xs">{x.h} mo</span>
                              <span className="text-right">
                                <span className={cn("text-sm font-bold tabular-nums sm:text-base lg:text-lg", bcrHCls(x.h, x.v))}>{bcrPct(x.v)}</span>
                                <span className="block text-[10px] leading-tight text-muted-foreground/60 sm:text-xs">{bcrHTier(x.h, x.v)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      {PREDICTION_EXPLANATIONS[p.k] ?? p.k}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Tooltip key={p.k}>
                  <TooltipTrigger asChild>
                    <div className="rounded-xl border border-border/70 bg-card px-2 py-2 text-center shadow-sm transition-shadow hover:shadow-md cursor-default sm:px-3 sm:py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">{p.k}</div>
                      <div className={cn("text-xl font-bold tabular-nums sm:text-2xl lg:text-3xl", p.neutral ? "text-muted-foreground/50" : riskCls(p.v))}>
                        {Number.isFinite(p.v) ? `${Math.round(p.v * 100)}%` : "N/A"}
                      </div>
                      {p.neutral
                        ? <div className="text-[10px] leading-tight text-muted-foreground/40 sm:text-xs">{Number.isFinite(p.v) ? "low" : "not applicable"}</div>
                        : p.sub
                        ? <div className="text-[10px] leading-tight text-muted-foreground/60 sm:text-xs">{p.sub}</div>
                        : Number.isFinite(p.v)
                        ? <div className="text-[10px] leading-tight text-muted-foreground/35 sm:text-xs">{Math.round(ci.lo * 100)}–{Math.round(ci.hi * 100)}%</div>
                        : null
                      }
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    {PREDICTION_EXPLANATIONS[p.k] ?? p.k}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Two-column layout: NS (left) + Surgical Consequence + PLND (right) — stacks on narrow */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Left: Nerve Sparing 5-zone */}
            <div>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Nerve sparing — 5-zone</div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium" />
                    <th className="px-2 py-1.5 font-medium">Left</th>
                    <th className="px-2 py-1.5 font-medium">Right</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-1.5 font-medium">Side ECE</td>
                    <td className={cn("py-1.5 px-2", riskCls(predictions.eceL))}>{pctOrDash(predictions.eceL)}</td>
                    <td className={cn("py-1.5 px-2", riskCls(predictions.eceR))}>{pctOrDash(predictions.eceR)}</td>
                  </tr>
                  {predictions.ece >= 0.05 && (
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <td className="py-1.5">If ECE</td>
                      <td colSpan={2} className="px-2 py-1.5">
                        <span className="text-emerald-500">{Math.round((1 - predictions.extensive) * 100)}% focal</span>
                        {" · "}
                        <span className={predictions.extensive >= 0.5 ? "text-red-500" : "text-amber-500"}>{pctOrDash(predictions.extensive)} extensive</span>
                      </td>
                    </tr>
                  )}
                  {zones5.map((z) => {
                    const lv = (L.zones?.[z.k] ?? 0) as number;
                    const rv = (R.zones?.[z.k] ?? 0) as number;
                    return (
                      <tr key={z.k} className="border-b border-border/40 text-muted-foreground">
                        <td className="py-1.5">{z.l}</td>
                        <td className={cn("px-2 py-1.5", lHasZones ? riskCls(lv) : "")}>
                          {lHasZones ? (lv > 0 && lv < 0.005 ? "< 1%" : `${Math.round(lv * 100)}%`) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className={cn("px-2 py-1.5", rHasZones ? riskCls(rv) : "")}>
                          {rHasZones ? (rv > 0 && rv < 0.005 ? "< 1%" : `${Math.round(rv * 100)}%`) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-1.5 font-bold">NS grade</td>
                    <td className="px-2 py-1.5"><NsGradeTag grade={predictions.nsL} /></td>
                    <td className="px-2 py-1.5"><NsGradeTag grade={predictions.nsR} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Surgical Consequence + PLND Decision */}
            <div>
              {gradesToShow.map((gs, idx) => {
                const g = gs.grade as 1 | 2 | 3;
                if (g < 1 || g > 3) return null;
                const gd = NSG_DATA[g];
                return (
                  <div key={gs.label} className={cn(idx > 0 && "mt-3 border-t border-border pt-3")}>
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Surgical Consequence — {gs.label}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded border border-border bg-muted/30 p-2 text-center">
                        <div className="text-xs text-muted-foreground">PSM Rate</div>
                        <div className="text-base font-bold text-amber-500">{gd.psm}%</div>
                      </div>
                      <div className="rounded border border-border bg-muted/30 p-2 text-center">
                        <div className="text-xs text-muted-foreground">BCR if PSM−</div>
                        <div className={cn("text-base font-bold", bcrColor(gd.bcr_no))}>{gd.bcr_no}%</div>
                      </div>
                      <div className="rounded border border-border bg-muted/30 p-2 text-center">
                        <div className="text-xs text-muted-foreground">BCR if PSM+</div>
                        <div className={cn("text-base font-bold", bcrColor(gd.bcr_psm))}>{gd.bcr_psm}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className={cn(
                "mb-2 text-sm font-semibold uppercase tracking-wide text-primary",
                gradesToShow.length > 0 && "mt-3 border-t border-border pt-3",
              )}>PLND decision</div>
              <div className={cn("mb-3 rounded-md border border-border border-l-4 bg-muted/30 p-3", plndColor)}>
                <div className="text-base font-bold">{plndTitle}</div>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">LNI Risk</div>
                  <div className={cn("text-lg font-bold", lniRisk < 0.05 ? "text-emerald-500" : lniRisk < 0.15 ? "text-amber-500" : "text-red-500")}>{Math.round(lniRisk * 100)}%</div>
                </div>
                <div className="rounded border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">NCCN Risk</div>
                  <div className={cn("text-lg font-bold", isHighRisk ? "text-red-500" : "text-emerald-500")}>{isHighRisk ? "High" : "Non-High"}</div>
                </div>
                <div className="rounded border border-border bg-muted/30 p-2.5 text-center">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">PSMA LN</div>
                  <div className={cn("text-lg font-bold", psmaLn ? "text-red-500" : "text-emerald-500")}>{psmaLn ? "Positive" : "Negative"}</div>
                </div>
              </div>

              {psmaLn > 0 && Array.isArray(lymphNodes) && lymphNodes.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">PSMA LN+ Station Analysis</div>
                  <div className="space-y-2">
                    {lymphNodes.map((ln, i) => {
                      const loc = (ln.location ?? "").toLowerCase();
                      const suv = ln.suv ?? 0;
                      const side = ln.side === "L" ? "Left" : ln.side === "R" ? "Right" : "Bilateral";
                      const matchedKey = Object.keys(STATION_FP).find((k) => loc.includes(k));
                      const fpData = (matchedKey ? STATION_FP[matchedKey] : null) ?? { fp: 50, note: "Station not characterized." };
                      let suvLabel: string, suvCls: string;
                      if (suv > 6) { suvLabel = "Likely true positive"; suvCls = "text-red-500"; }
                      else if (suv >= 3.5) { suvLabel = "Indeterminate"; suvCls = "text-amber-500"; }
                      else if (suv > 0) { suvLabel = "Likely reactive"; suvCls = "text-emerald-500"; }
                      else { suvLabel = "No SUV data"; suvCls = "text-muted-foreground"; }
                      return (
                        <div key={i} className="rounded border border-border bg-muted/30 p-2 text-sm">
                          <div className="font-semibold capitalize">{matchedKey ?? loc} <span className="font-normal text-muted-foreground">({side})</span></div>
                          {suv > 0 && <div className="mt-0.5">SUV: <span className={cn("font-bold", suvCls)}>{suv}</span> — {suvLabel}</div>}
                          <div className="mt-0.5 text-muted-foreground">Station FP: <span className={cn("font-bold", fpData.fp >= 30 ? "text-amber-500" : "text-emerald-500")}>{fpData.fp}%</span></div>
                          <div className="mt-0.5 text-xs text-muted-foreground/70">{fpData.note}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Multi-case comparison */}
          {patients.length > 1 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none select-none items-center justify-between rounded-md px-1 py-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                <span>Multi-case comparison ({patients.length} cases)</span>
                <svg className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="mt-1 overflow-x-auto rounded-lg border border-border/50 bg-muted/20">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pl-2 pr-1 font-medium">Case</th>
                      <th className="px-1 py-1.5 text-center font-medium">ECE</th>
                      <th className="px-1 py-1.5 text-center font-medium">SVI</th>
                      <th className="px-1 py-1.5 text-center font-medium">LNI</th>
                      <th className="px-1 py-1.5 pr-2 text-center font-medium">BCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((pat) => {
                      const isActive = pat.id === activeId;
                      const { predictions: pp } = computeEntryPredictions(pat);
                      const { ece, svi, lni, bcr36: bcr } = pp;
                      return (
                        <tr
                          key={pat.id}
                          className={cn(
                            "border-b border-border/30 last:border-0",
                            isActive && "bg-primary/5",
                          )}
                        >
                          <td className="max-w-[72px] truncate py-1.5 pl-2 pr-1">
                            <span className={cn("font-medium", isActive && "text-primary")}>
                              {isActive && <span className="mr-0.5">▶</span>}{pat.name}
                            </span>
                          </td>
                          <td className={cn("px-1 py-1.5 text-center font-bold tabular-nums", riskCls(ece))}>
                            {pctOrDash(ece)}
                          </td>
                          <td className={cn("px-1 py-1.5 text-center font-bold tabular-nums", svi < 0.1 ? "text-muted-foreground/40" : riskCls(svi))}>
                            {pctOrDash(svi)}
                          </td>
                          <td className={cn("px-1 py-1.5 text-center font-bold tabular-nums", riskCls(lni))}>
                            {pctOrDash(lni)}
                          </td>
                          <td className={cn("px-1 py-1.5 pr-2 text-center font-bold tabular-nums", riskCls(bcr))}>
                            {pctOrDash(bcr)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
