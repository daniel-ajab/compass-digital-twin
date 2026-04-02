import { ClipboardList, LayoutGrid, Scan } from "lucide-react";
import { useUiStore, type MobileWorkspace } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const TABS: {
  id: MobileWorkspace;
  label: string;
  Icon: typeof Scan;
}[] = [
  { id: "clinical", label: "Data", Icon: ClipboardList },
  { id: "insights", label: "Results", Icon: LayoutGrid },
  { id: "viewer", label: "3D", Icon: Scan },
];

export function MobileTabBar() {
  const mobileWorkspace = useUiStore((s) => s.mobileWorkspace);
  const setMobileWorkspace = useUiStore((s) => s.setMobileWorkspace);

  return (
    <nav
      className="safe-bottom w-full min-w-0 shrink-0 border-t border-border/80 bg-card/95 px-3 pt-2 shadow-[0_-6px_24px_-6px_rgba(0,0,0,0.08)] backdrop-blur-lg dark:bg-card/90 dark:shadow-[0_-6px_24px_-6px_rgba(0,0,0,0.35)] lg:hidden"
      aria-label="Primary workspace"
    >
      <div
        className="mx-auto flex max-w-lg items-stretch gap-1 rounded-2xl border border-border/60 bg-muted/50 p-1 dark:bg-muted/30"
        role="tablist"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = mobileWorkspace === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMobileWorkspace(id)}
              className={cn(
                "flex min-h-[48px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold tracking-wide transition-all active:scale-[0.98]",
                active
                  ? "bg-card text-primary shadow-sm ring-1 ring-black/[0.06] dark:bg-card dark:ring-white/10"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active ? "text-primary" : "opacity-80")}
                aria-hidden
              />
              {label}
            </button>
          );
        })}
      </div>
      <div className="h-2 shrink-0" aria-hidden />
    </nav>
  );
}
