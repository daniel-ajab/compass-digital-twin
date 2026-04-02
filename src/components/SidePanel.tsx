import { Activity } from "lucide-react";
import { ClinicalWorkspace } from "@/components/ClinicalWorkspace";
import { Button } from "@/components/ui/button";
import { usePatientStore } from "@/store/patientStore";
import { cn } from "@/lib/utils";

/**
 * Desktop-only clinical column (lg+). Mobile uses tab bar + ClinicalWorkspace in main.
 */
export function SidePanel() {
  const undo = usePatientStore((s) => s.undo);
  const redo = usePatientStore((s) => s.redo);

  return (
    <aside
      className={cn(
        "hidden min-h-0 w-full max-w-md shrink-0 flex-col border-r border-border/80 bg-card lg:max-h-none lg:self-stretch xl:max-w-lg",
        "lg:flex",
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Case workspace
          </span>
        </div>
        <div className="flex gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => undo()}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => redo()}
          >
            Redo
          </Button>
        </div>
      </div>
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-muted/20 dark:bg-background">
        <ClinicalWorkspace />
      </div>
    </aside>
  );
}
