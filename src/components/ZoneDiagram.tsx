import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPASS_TO_3D } from "@/lib/compass/constants";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

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

function cls(v: number) {
  if (v >= 0.3) return "border-red-500/80 bg-red-500/10";
  if (v >= 0.15) return "border-amber-500/80 bg-amber-500/10";
  return "border-emerald-600/50 bg-emerald-500/5";
}

function barColor(v: number) {
  if (v >= 0.3) return "bg-red-500";
  if (v >= 0.15) return "bg-amber-500";
  return "bg-emerald-500";
}

export function ZoneDiagram() {
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const threeZones = usePatientStore((s) => s.threeZones);
  const overlay = useUiStore((s) => s.overlay);
  const entry = patients.find((p) => p.id === activeId);
  if (!entry) return null;

  const zones = entry.record.zones;
  const label =
    overlay === "cancer"
      ? "Cancer"
      : overlay === "ece"
        ? "ECE"
        : overlay === "svi"
          ? "SVI"
          : "PSM";

  const box = (id: string, short: string) => {
    const v = zVal(id, overlay, zones, threeZones);
    const pct = Math.round(v * 100);
    return (
      <div
        key={id}
        className={cn(
          "relative overflow-hidden rounded border px-1 py-1 text-center",
          cls(v),
        )}
      >
        <div className="text-[10px] font-bold">{short}</div>
        <div className="text-[9px] text-muted-foreground">{pct}%</div>
        <div
          className={cn("absolute bottom-0 left-0 h-0.5", barColor(v))}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent pb-3 dark:from-muted/25">
        <CardTitle className="text-sm font-semibold text-foreground">
          Zone map — {label}
        </CardTitle>
        <CardDescription>
          Matches the overlay selected in the 3D viewer (csPCa, ECE, SVI, PSM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-[10px]">
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            Anterior
          </div>
          <div className="grid grid-cols-4 gap-1">
            {box("4a", "RBase")}
            {box("5a", "RMid")}
            {box("6a", "RApex")}
            {box("1a", "LBase")}
            {box("2a", "LMid")}
            {box("3a", "LApex")}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[9px] font-semibold text-muted-foreground">
            <span>LEFT</span>
            <span>RIGHT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid grid-cols-2 gap-1">
              {box("1p", "LBm")}
              {box("2p", "LBl")}
              {box("3p", "LMm")}
              {box("4p", "LMl")}
              {box("5p", "LA")}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {box("6p", "RBm")}
              {box("7p", "RBl")}
              {box("8p", "RMm")}
              {box("9p", "RMl")}
              {box("10p", "RA")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
