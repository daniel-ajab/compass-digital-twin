import { useUiStore } from "@/store/uiStore";
import { usePatientStore } from "@/store/patientStore";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "A-RB": "R Ant Base",
  "A-LB": "L Ant Base",
  "A-RM": "R Ant Mid",
  "A-LM": "L Ant Mid",
  "A-RA": "R Ant Apex",
  "A-LA": "L Ant Apex",
  "P-RB-L": "R Base Lat",
  "P-RB-M": "R Base Med",
  "P-LB-M": "L Base Med",
  "P-LB-L": "L Base Lat",
  "P-RM-L": "R Mid Lat",
  "P-RM-M": "R Mid Med",
  "P-LM-M": "L Mid Med",
  "P-LM-L": "L Mid Lat",
  "P-RA": "R Apex",
  "P-LA": "L Apex",
};

export function ZoneLabelsOverlay() {
  const overlay = useUiStore((s) => s.overlay);
  const labelsVisible = useUiStore((s) => s.labelsVisible);
  const heatmapVisible = useUiStore((s) => s.heatmapVisible);
  const threeZones = usePatientStore((s) => s.threeZones);
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const entry = patients.find((p) => p.id === activeId);
  const mlobe = entry?.record.prostate.median_lobe_grade ?? 0;

  if (!heatmapVisible || !labelsVisible) return null;

  const overlayName =
    overlay === "cancer"
      ? "csPCa"
      : overlay === "ece"
        ? "ECE"
        : overlay === "svi"
          ? "SVI"
          : "PSM";

  const items = threeZones
    .map((z) => {
      const val =
        overlay === "cancer"
          ? z.cancer
          : overlay === "ece"
            ? z.ece
            : overlay === "svi"
              ? z.svi
              : z.psm;
      return {
        name: LABELS[z.id] ?? z.id,
        pct: Math.round((val ?? 0) * 100),
        v: val ?? 0,
      };
    })
    .filter((x) => x.v > 0.05)
    .sort((a, b) => b.v - a.v);

  return (
    <div className="pointer-events-none absolute right-3 top-20 z-10 min-w-[180px] rounded-lg border border-border/80 bg-black/80 p-3 text-[11px] text-foreground shadow-lg backdrop-blur">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {overlayName} by zone
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No zones above 5%</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item.name}
              className="flex justify-between gap-3 border-b border-border/30 py-0.5 last:border-0"
            >
              <span className="text-muted-foreground">{item.name}</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  item.v < 0.15
                    ? "text-emerald-400"
                    : item.v < 0.3
                      ? "text-amber-400"
                      : "text-red-400",
                )}
              >
                {item.pct}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {mlobe > 0 && (
        <div className="mt-2 border-t border-border/40 pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Median lobe</span>
            <span className="font-bold text-amber-400">Grade {mlobe}</span>
          </div>
        </div>
      )}
    </div>
  );
}
