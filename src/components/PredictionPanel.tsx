import { Button } from "@/components/ui/button";
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
import { computePlndRecommendation } from "@/lib/compass/plnd";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import {
  deriveClinicalFromLesions,
  lesionsFromRows,
} from "@/lib/utils/normalization";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import { cn } from "@/lib/utils";

function riskCls(v: number) {
  if (v < 0.15) return "text-emerald-500";
  if (v < 0.3) return "text-amber-500";
  return "text-red-500";
}

export function PredictionPanel() {
  const predictions = usePatientStore((s) => s.predictions);
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const entry = patients.find((p) => p.id === activeId);
  const setExplainKey = useUiStore((s) => s.setExplainKey);

  if (!predictions || !entry) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/10">
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a patient in the roster to run COMPASS models.
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

  const preds = [
    { k: "ECE", v: predictions.ece },
    { k: "SVI", v: predictions.svi },
    { k: "Upgrade", v: predictions.upgrade },
    { k: "PSM", v: predictions.psm },
    { k: "BCR", v: predictions.bcr },
    { k: "LNI", v: predictions.lni },
  ] as const;

  const plndTone =
    plnd.tone === "success"
      ? "border-l-emerald-500 text-emerald-600 dark:text-emerald-400"
      : plnd.tone === "warning"
        ? "border-l-amber-500 text-amber-600 dark:text-amber-400"
        : "border-l-red-500 text-red-600 dark:text-red-400";

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent pb-4 dark:from-muted/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-foreground">
                COMPASS predictions
              </CardTitle>
              <CardDescription>
                Calibrated outcome risks for the active case.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-xs"
              onClick={() => setExplainKey("overview")}
            >
              Explain
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {preds.map((p) => (
              <Tooltip key={p.k}>
                <TooltipTrigger asChild>
                  <div className="rounded-xl border border-border/70 bg-card px-2 py-3 text-center shadow-sm transition-shadow hover:shadow-md">
                    <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {p.k}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        riskCls(p.v),
                      )}
                    >
                      {Math.round(p.v * 100)}%
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  {PREDICTION_EXPLANATIONS[p.k] ?? p.k}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Risk breakdown mini visualization */}
          <div className="rounded-md border border-border/80 bg-muted/20 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Outcome profile
            </div>
            <div className="space-y-2">
              {preds.map((p) => (
                <div key={p.k} className="flex items-center gap-2 text-[11px]">
                  <span className="w-8 shrink-0 text-muted-foreground">{p.k}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        p.v < 0.15
                          ? "bg-emerald-500"
                          : p.v < 0.3
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${Math.min(100, p.v * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 tabular-nums text-right font-medium">
                    {Math.round(p.v * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Nerve sparing — 5-zone
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium" />
                  <th className="py-1 px-1 font-medium">Left</th>
                  <th className="py-1 px-1 font-medium">Right</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-1 font-medium">Side ECE</td>
                  <td className={cn("py-1", riskCls(predictions.eceL))}>
                    {Math.round(predictions.eceL * 100)}%
                  </td>
                  <td className={cn("py-1", riskCls(predictions.eceR))}>
                    {Math.round(predictions.eceR * 100)}%
                  </td>
                </tr>
                {predictions.ece >= 0.05 && (
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <td className="py-1">If ECE</td>
                    <td colSpan={2} className="py-1">
                      <span className="text-emerald-500">
                        {Math.round((1 - predictions.extensive) * 100)}% focal
                      </span>
                      {" · "}
                      <span
                        className={
                          predictions.extensive >= 0.5
                            ? "text-red-500"
                            : "text-amber-500"
                        }
                      >
                        {Math.round(predictions.extensive * 100)}% extensive
                      </span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 font-bold">NS grade</td>
                  <td className="py-2">
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                      G{predictions.nsL}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                      G{predictions.nsR}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              PLND decision
            </div>
            <div
              className={cn(
                "rounded-md border border-border border-l-4 bg-muted/30 p-3 text-[11px] leading-relaxed",
                plndTone,
              )}
            >
              <div className="text-sm font-bold">
                {plnd.icon} {plnd.title}
              </div>
              <p className="mt-1 text-muted-foreground">{plnd.detail}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
