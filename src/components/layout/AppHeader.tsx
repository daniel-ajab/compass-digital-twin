import {
  Info,
  Moon,
  Redo2,
  Sun,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const dark = useUiStore((s) => s.dark);
  const setDark = useUiStore((s) => s.setDark);
  const setInfoOpen = useUiStore((s) => s.setInfoOpen);
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const setActive = usePatientStore((s) => s.setActive);
  const undo = usePatientStore((s) => s.undo);
  const redo = usePatientStore((s) => s.redo);

  const active = patients.find((p) => p.id === activeId);

  return (
    <header
      className={cn(
        "z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-card/95 px-3 shadow-sm backdrop-blur-md sm:gap-3 sm:px-4",
        "supports-[backdrop-filter]:bg-card/80",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
            COMPASS
          </span>
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Prostate cancer · surgical outcomes
          </span>
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-2 sm:mt-0 sm:max-w-[min(100%,280px)]">
          <label htmlFor="nav-patient" className="sr-only">
            Active patient
          </label>
          <select
            id="nav-patient"
            className={cn(
              "h-9 min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
            )}
            value={activeId ?? ""}
            onChange={(e) => setActive(e.target.value)}
          >
            {patients.length === 0 ? (
              <option value="">No patients loaded</option>
            ) : (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            aria-label="Undo"
            onClick={() => undo()}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            aria-label="Redo"
            onClick={() => redo()}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setDark(!dark)}
        >
          {dark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="About COMPASS"
          onClick={() => setInfoOpen(true)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {active && (
        <span className="sr-only" aria-live="polite">
          Active case: {active.name}
        </span>
      )}
    </header>
  );
}
