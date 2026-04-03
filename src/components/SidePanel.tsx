import { ClinicalWorkspace } from "@/components/ClinicalWorkspace";
import { cn } from "@/lib/utils";

/**
 * Desktop-only clinical column (lg+). Mobile uses tab bar + ClinicalWorkspace in main.
 */
export function SidePanel() {
  return (
    <aside
      className={cn(
        "hidden min-h-0 w-full max-w-md shrink-0 flex-col border-r border-border/80 bg-card lg:max-h-none lg:self-stretch xl:max-w-lg",
        "lg:flex",
      )}
    >
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-muted/20 dark:bg-background">
        <ClinicalWorkspace />
      </div>
    </aside>
  );
}
