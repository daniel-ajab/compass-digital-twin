import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitZoomNudge } from "@/lib/three/zoomBridge";
import { useUiStore } from "@/store/uiStore";
import type { OverlayType } from "@/types/prediction";
import { cn } from "@/lib/utils";

const VIEWS = [
  "anterior",
  "posterior",
  "base",
  "apex",
  "left",
  "right",
] as const;

const OVERLAYS: { id: OverlayType; label: string; cls?: string }[] = [
  { id: "cancer", label: "csPCa", cls: "border-red-500/50 text-red-400" },
  { id: "ece", label: "ECE", cls: "border-amber-500/50 text-amber-400" },
  { id: "svi", label: "SVI", cls: "border-purple-500/50 text-purple-400" },
  { id: "psm", label: "PSM", cls: "border-sky-500/50 text-sky-400" },
];

const LEGEND: Record<OverlayType, { title: string; gradient: string }> = {
  cancer: {
    title: "csPCa risk (GG ≥ 2)",
    gradient: "linear-gradient(to right,#22c55e,#eab308,#ef4444)",
  },
  ece: {
    title: "ECE risk",
    gradient: "linear-gradient(to right,#22c55e,#f59e0b,#ef4444)",
  },
  svi: {
    title: "SVI risk",
    gradient: "linear-gradient(to right,#4060a0,#a855f7,#ef4444)",
  },
  psm: {
    title: "PSM risk",
    gradient: "linear-gradient(to right,#3080c0,#60a0e0,#ef4444)",
  },
};

export function ControlsOverlay() {
  const overlay = useUiStore((s) => s.overlay);
  const heatmapVisible = useUiStore((s) => s.heatmapVisible);
  const labelsVisible = useUiStore((s) => s.labelsVisible);
  const lesionsOnly = useUiStore((s) => s.lesionsOnly);
  const setOverlay = useUiStore((s) => s.setOverlay);
  const toggleHeatmap = useUiStore((s) => s.toggleHeatmap);
  const toggleLabels = useUiStore((s) => s.toggleLabels);
  const toggleLesionsOnly = useUiStore((s) => s.toggleLesionsOnly);
  const setView = useUiStore((s) => s.setView);
  const leg = LEGEND[overlay];

  return (
    <>
      <div className="pointer-events-auto absolute left-2 top-2 z-10 flex max-w-[min(100%,11rem)] flex-wrap gap-1 sm:max-w-[45%]">
        {VIEWS.map((v) => (
          <Button
            key={v}
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 min-h-8 border border-border/80 bg-black/60 px-2 text-[10px] backdrop-blur sm:h-7 sm:min-h-7"
            onClick={() => setView(v)}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>
      <div className="pointer-events-auto absolute right-2 top-2 z-10 flex max-w-[min(100%,14rem)] flex-wrap justify-end gap-1 sm:max-w-[53%]">
        {OVERLAYS.map((o) => (
          <Button
            key={o.id}
            type="button"
            variant="secondary"
            size="sm"
            className={cn(
              "h-8 min-h-8 border bg-black/60 px-2 text-[10px] backdrop-blur sm:h-7 sm:min-h-7",
              overlay === o.id ? o.cls : "border-border/60 text-muted-foreground",
            )}
            onClick={() => setOverlay(o.id)}
          >
            {o.label}
          </Button>
        ))}
        <div className="mx-0.5 self-stretch border-l border-border/50" aria-hidden />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(
            "h-8 min-h-8 border bg-black/60 px-2 text-[10px] backdrop-blur sm:h-7 sm:min-h-7",
            heatmapVisible && "border-primary text-primary",
          )}
          onClick={() => toggleHeatmap()}
        >
          Heatmap
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(
            "h-8 min-h-8 border bg-black/60 px-2 text-[10px] backdrop-blur sm:h-7 sm:min-h-7",
            labelsVisible && "border-primary text-primary",
          )}
          onClick={() => toggleLabels()}
        >
          Labels
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(
            "h-8 min-h-8 border bg-black/60 px-2 text-[10px] backdrop-blur sm:h-7 sm:min-h-7",
            lesionsOnly && "border-primary text-primary",
          )}
          onClick={() => toggleLesionsOnly()}
        >
          Lesions only
        </Button>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute left-2 z-10 rounded-lg border border-border/60 bg-black/70 px-2.5 py-2 backdrop-blur sm:left-3 sm:px-3 lg:bottom-3",
          "max-lg:bottom-[calc(0.75rem+7.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className="text-[11px] font-semibold text-primary">{leg.title}</div>
        <div
          className="mt-1 h-2 w-[140px] rounded"
          style={{ background: leg.gradient }}
        />
        <div className="mt-0.5 flex w-[140px] justify-between text-[9px] text-muted-foreground">
          <span>Low</span>
          <span className="text-amber-400/80">Med</span>
          <span className="text-red-400/80">High</span>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-auto absolute right-2 z-20 flex flex-col gap-1 lg:hidden",
          "bottom-[calc(0.5rem+4rem+env(safe-area-inset-bottom,0px))]",
        )}
        role="group"
        aria-label="3D zoom"
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-10 w-10 border border-border/80 bg-black/70 shadow-md backdrop-blur"
          aria-label="Zoom in"
          onClick={() => emitZoomNudge(-0.45)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-10 w-10 border border-border/80 bg-black/70 shadow-md backdrop-blur"
          aria-label="Zoom out"
          onClick={() => emitZoomNudge(0.45)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <p className="max-w-[4.5rem] text-center text-[8px] font-medium leading-tight text-muted-foreground">
          Drag to rotate · pinch
        </p>
      </div>
    </>
  );
}
