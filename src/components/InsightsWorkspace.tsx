import { PredictionPanel } from "@/components/PredictionPanel";
import { ZoneDiagram } from "@/components/ZoneDiagram";
import { cn } from "@/lib/utils";

export function InsightsWorkspace({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-10 sm:gap-5 sm:px-5 sm:py-6",
        className,
      )}
    >
      <PredictionPanel />
      <ZoneDiagram />
    </div>
  );
}
