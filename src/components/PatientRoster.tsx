import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePatientStore } from "@/store/patientStore";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import { cn } from "@/lib/utils";

function riskCls(v: number) {
  if (v < 0.15) return "text-emerald-500";
  if (v < 0.3)  return "text-amber-500";
  return "text-red-500";
}

export function PatientRoster() {
  const patients     = usePatientStore((s) => s.patients);
  const activeId     = usePatientStore((s) => s.activeId);
  const predictions  = usePatientStore((s) => s.predictions);
  const setActive    = usePatientStore((s) => s.setActive);
  const removePatient = usePatientStore((s) => s.removePatient);

  if (patients.length === 0) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/10">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
            <Users className="h-5 w-5 text-muted-foreground/60" aria-hidden />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Import a case file below to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border bg-muted/20 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-sm font-semibold">Patients</CardTitle>
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
            {patients.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto overscroll-contain app-scroll pr-0.5">
          {patients.map((p) => {
            const active = activeId === p.id;
            const S = clinicalStateFromRecord(p.record);
            const gg = p.record.biopsy.max_grade_group ?? 0;
            const lat = p.record.biopsy.laterality ?? "—";
            const eceV = active && predictions ? predictions.ece : null;

            return (
              <li key={p.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setActive(p.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 pr-8 text-left transition-colors",
                    active
                      ? "border-primary/50 bg-primary/[0.07]"
                      : "border-border/50 bg-card hover:border-border hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {active && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className={cn("truncate text-sm font-semibold", active ? "text-foreground" : "text-foreground/90")}>
                          {p.name}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>PSA <strong className="text-foreground/80">{S.psa}</strong></span>
                        <span>Vol <strong className="text-foreground/80">{S.vol} cc</strong></span>
                        <span className="capitalize">{lat}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        gg >= 4 ? "bg-red-500/15 text-red-500"
                        : gg === 3 ? "bg-amber-500/15 text-amber-500"
                        : "bg-muted text-muted-foreground",
                      )}>
                        GG{gg}
                      </span>
                      {eceV !== null && (
                        <span className={cn("text-[9px] font-semibold tabular-nums", riskCls(eceV))}>
                          ECE {Math.round(eceV * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-xs text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label={`Remove ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePatient(p.id);
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
