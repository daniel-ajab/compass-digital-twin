import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPASS_TO_3D } from "@/lib/compass/constants";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import type { OverlayType } from "@/types/prediction";
import { cn } from "@/lib/utils";

const OVERLAY_TABS: { id: OverlayType; label: string }[] = [
  { id: "cancer", label: "csPCa" },
  { id: "ece", label: "ECE" },
  { id: "svi", label: "SVI" },
  { id: "psm", label: "PSM" },
];

function zVal(
  zoneId: string,
  overlay: string,
  zones: import("@/types/patient").ZoneMap,
  threeZones: import("@/types/prediction").ThreeZoneRuntime[],
): number {
  const pd = zones[zoneId as keyof typeof zones];
  const o = overlay as "cancer" | "ece" | "svi" | "psm";
  if (pd && (pd[o] ?? 0) > 0.03) return pd[o] ?? 0;
  const z3dId = COMPASS_TO_3D[zoneId];
  if (!z3dId) return 0;
  const z3d = threeZones.find((z) => z.id === z3dId);
  if (!z3d) return 0;
  return z3d[o] ?? 0;
}

function riskBg(v: number) {
  if (v >= 0.3) return "border-red-500/60 bg-red-500/10";
  if (v >= 0.15) return "border-amber-500/50 bg-amber-500/8";
  return "border-border/50 bg-muted/30";
}

function riskText(v: number) {
  if (v >= 0.3) return "text-red-500";
  if (v >= 0.15) return "text-amber-500";
  return "text-emerald-500";
}

function barColor(v: number) {
  if (v >= 0.3) return "bg-red-500";
  if (v >= 0.15) return "bg-amber-500";
  return "bg-emerald-500";
}

export function ZoneDiagram() {
  const patients   = usePatientStore((s) => s.patients);
  const activeId   = usePatientStore((s) => s.activeId);
  const threeZones = usePatientStore((s) => s.threeZones);
  const overlay    = useUiStore((s) => s.overlay);
  const setOverlay = useUiStore((s) => s.setOverlay);

  const entry = patients.find((p) => p.id === activeId);
  if (!entry) return null;

  const zones = entry.record.zones;

  const box = (id: string, short: string) => {
    const v = zVal(id, overlay, zones, threeZones);
    const pct = Math.round(v * 100);
    return (
      <div
        key={id}
        className={cn(
          "relative overflow-hidden rounded-lg border px-1 py-1.5 text-center",
          riskBg(v),
        )}
      >
        <div className="text-[10px] font-bold text-foreground/80">{short}</div>
        <div className={cn("text-[9px] font-semibold tabular-nums", riskText(v))}>{pct}%</div>
        <div
          className={cn("absolute bottom-0 left-0 h-0.5 opacity-80", barColor(v))}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border bg-muted/20 pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground">Zone map</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Anterior */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Anterior</div>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="grid grid-cols-6 gap-1">
            {box("4a", "RBs")}
            {box("5a", "RMd")}
            {box("6a", "RAp")}
            {box("1a", "LBs")}
            {box("2a", "LMd")}
            {box("3a", "LAp")}
          </div>
        </div>

        {/* Posterior */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border/40" />
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Posterior</div>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="mb-1 flex justify-between px-0.5 text-[9px] font-semibold text-muted-foreground">
            <span>← LEFT</span>
            <span>RIGHT →</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 gap-1">
              {box("1p", "LBm")}
              {box("2p", "LBl")}
              {box("3p", "LMm")}
              {box("4p", "LMl")}
              {box("5p", "LA")}
              <div />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {box("6p", "RBm")}
              {box("7p", "RBl")}
              {box("8p", "RMm")}
              {box("9p", "RMl")}
              {box("10p", "RA")}
              <div />
            </div>
          </div>
        </div>

        {/* Seminal vesicles */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border/40" />
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Seminal Vesicles</div>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="grid grid-cols-2 gap-1">
            {box("SV-L", "SV-L")}
            {box("SV-R", "SV-R")}
          </div>
        </div>

        {/* Legend + overlay tabs */}
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-emerald-500/50 bg-emerald-500/30" />Low</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-amber-500/50 bg-amber-500/20" />Moderate</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-red-500/50 bg-red-500/20" />High</span>
          </div>
          <div className="flex gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-0.5">
            {OVERLAY_TABS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOverlay(o.id)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
                  overlay === o.id
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
