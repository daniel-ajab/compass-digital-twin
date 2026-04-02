import { PredictionPanel } from "@/components/PredictionPanel";
import { ZoneDiagram } from "@/components/ZoneDiagram";
import { cn } from "@/lib/utils";

export function InsightsWorkspace({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-5 sm:py-6",
        className,
      )}
    >
      <PredictionPanel />
      <ZoneDiagram />
    </div>
  );
}
