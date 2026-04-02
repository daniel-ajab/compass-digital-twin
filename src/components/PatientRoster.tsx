import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePatientStore } from "@/store/patientStore";
import { cn } from "@/lib/utils";

export function PatientRoster() {
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const setActive = usePatientStore((s) => s.setActive);
  const removePatient = usePatientStore((s) => s.removePatient);

  if (patients.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/10">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="max-w-xs text-sm text-muted-foreground">
            Load <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">patients.json</code>{" "}
            or import a case file below.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent pb-3 dark:from-muted/25">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-sm font-semibold text-foreground">Patients</CardTitle>
        </div>
        <CardDescription>Tap a row to make it the active case.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ul
          className="flex max-h-52 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-56"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {patients.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all",
                activeId === p.id
                  ? "border-primary/60 bg-primary/[0.08] ring-1 ring-primary/20"
                  : "border-border/70 bg-card hover:border-primary/35 hover:bg-muted/30",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-medium text-foreground"
                onClick={() => setActive(p.id)}
              >
                {p.name}
              </button>
              <span className="shrink-0 rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                GG{p.record.biopsy.max_grade_group ?? "—"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${p.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removePatient(p.id);
                }}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
