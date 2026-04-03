import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clinicalFormSchema, type ClinicalFormValues } from "@/schemas/clinicalForm";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import {
  deriveClinicalFromLesions,
  lesionsFromRows,
} from "@/lib/utils/normalization";
import { LesionTable } from "@/components/LesionTable";
import { PatientRoster } from "@/components/PatientRoster";
import { PredictionPanel } from "@/components/PredictionPanel";
import { ZoneDiagram } from "@/components/ZoneDiagram";
import type { PatientEntry } from "@/store/patientStore";
import { usePatientStore } from "@/store/patientStore";
import { cn } from "@/lib/utils";

function clinicalToForm(entry: PatientEntry): ClinicalFormValues {
  const rec = { ...entry.record, lesions: entry.lesionRows };
  const S = deriveClinicalFromLesions(
    clinicalStateFromRecord(rec),
    lesionsFromRows(entry.lesionRows),
  );
  return {
    psa: S.psa,
    vol: S.vol,
    gg: S.gg,
    cores: S.cores,
    maxcore: S.maxcore,
    decipherStr:
      S.dec !== null && S.dec !== undefined ? String(S.dec) : "",
    psma_ln: !!S.psma_ln,
  };
}

function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
          {label}
        </Label>
        {hint ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EntryGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-muted/15 p-4 dark:from-muted/25 dark:to-muted/10">
      <div className="space-y-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-primary/90">
          {title}
        </h4>
        {description ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

interface ClinicalWorkspaceProps {
  className?: string;
  compact?: boolean;
}

export function ClinicalWorkspace({ className, compact }: ClinicalWorkspaceProps) {
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const updateClinicalForm = usePatientStore((s) => s.updateClinicalForm);
  const exportActiveJson = usePatientStore((s) => s.exportActiveJson);
  const importJsonFile = usePatientStore((s) => s.importJsonFile);
  const resetActiveToSeed = usePatientStore((s) => s.resetActiveToSeed);
  const pushHistory = usePatientStore((s) => s.pushHistory);
  const loading = usePatientStore((s) => s.loading);

  const entry = patients.find((p) => p.id === activeId);

  const form = useForm<ClinicalFormValues>({
    resolver: zodResolver(clinicalFormSchema),
    defaultValues: entry
      ? clinicalToForm(entry)
      : {
          psa: 6.5,
          vol: 45,
          gg: 2,
          cores: 0,
          maxcore: 0,
          decipherStr: "",
          psma_ln: false,
        },
  });

  useEffect(() => {
    if (entry) {
      form.reset(clinicalToForm(entry));
    }
  }, [entry?.id, entry, form]);

  const onSubmit = (data: ClinicalFormValues) => {
    const decRaw = data.decipherStr?.trim() ?? "";
    const decParsed = decRaw === "" ? null : parseFloat(decRaw);
    updateClinicalForm({
      psa: data.psa,
      vol: data.vol,
      gg: data.gg,
      cores: data.cores,
      maxcore: data.maxcore,
      dec:
        decParsed === null || Number.isNaN(decParsed) ? null : decParsed,
      psma_ln: data.psma_ln ? 1 : 0,
    });
    pushHistory();
  };

  const err = form.formState.errors;
  const pad = compact ? "px-4 py-5 sm:px-5 sm:py-6" : "p-5 sm:p-6";
  const stackGap = "flex flex-col gap-5 sm:gap-6";

  return (
    <div
      className={cn(
        stackGap,
        pad,
        "pb-10 max-lg:pb-12",
        compact && "mx-auto w-full max-w-2xl",
        className,
      )}
    >
      {loading && (
        <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.06] px-4 py-8 text-center text-sm text-muted-foreground">
          Loading patients…
        </div>
      )}

      <section aria-labelledby="roster-heading">
        <h2 id="roster-heading" className="sr-only">
          Patient roster
        </h2>
        <PatientRoster />
      </section>

      <Card className="overflow-hidden border-border/70 shadow-md shadow-black/[0.06] dark:shadow-none">
        <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/50 via-muted/25 to-transparent pb-4 dark:from-muted/30">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            Clinical inputs
          </CardTitle>
          <CardDescription>
            Edit preoperative variables for the active case, then apply to refresh COMPASS
            predictions and the 3D twin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <EntryGroup
              title="Laboratory & anatomy"
              description="Serum PSA and gland volume drive PSAD and model calibration."
            >
              <FormField
                label="PSA"
                htmlFor="psa"
                hint="ng/mL"
                error={err.psa?.message}
              >
                <Input
                  id="psa"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  aria-invalid={!!err.psa}
                  {...form.register("psa")}
                />
              </FormField>
              <FormField
                label="Prostate volume"
                htmlFor="vol"
                hint="cm³ (cc)"
                error={err.vol?.message}
              >
                <Input
                  id="vol"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  aria-invalid={!!err.vol}
                  {...form.register("vol")}
                />
              </FormField>
            </EntryGroup>

            <EntryGroup
              title="Biopsy summary"
              description="Grade group and core burden inform upgrade and ECE estimates."
            >
              <FormField
                label="Grade group"
                htmlFor="gg"
                hint="0–5 (ISUP)"
                error={err.gg?.message}
              >
                <Input
                  id="gg"
                  type="number"
                  min={0}
                  max={5}
                  inputMode="numeric"
                  aria-invalid={!!err.gg}
                  {...form.register("gg")}
                />
              </FormField>
              <FormField
                label="Positive cores"
                htmlFor="cores"
                error={err.cores?.message}
              >
                <Input
                  id="cores"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-invalid={!!err.cores}
                  {...form.register("cores")}
                />
              </FormField>
              <FormField
                label="Max core involvement"
                htmlFor="maxcore"
                hint="Percent (0–100)"
                error={err.maxcore?.message}
              >
                <Input
                  id="maxcore"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  aria-invalid={!!err.maxcore}
                  {...form.register("maxcore")}
                />
              </FormField>
            </EntryGroup>

            <EntryGroup
              title="Optional markers"
              description="Genomic classifier and nodal imaging when available."
            >
              <FormField
                label="Decipher score"
                htmlFor="dec"
                hint="0–1, leave blank if not tested"
                error={err.decipherStr?.message}
              >
                <Input
                  id="dec"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 0.52"
                  aria-invalid={!!err.decipherStr}
                  {...form.register("decipherStr")}
                />
              </FormField>
              <div className="sm:col-span-2">
                <div className="flex min-h-12 items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                  <input
                    type="checkbox"
                    id="psma_ln"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-input accent-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...form.register("psma_ln")}
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="psma_ln"
                      className="cursor-pointer text-sm font-medium leading-snug text-foreground"
                    >
                      PSMA PET–positive lymph nodes
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Enables LNI / PLND logic when clinically reported.
                    </p>
                  </div>
                </div>
              </div>
            </EntryGroup>

            <div className="flex flex-col gap-3 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                Changes are staged until you apply; undo from the header if needed.
              </p>
              <Button type="submit" size="lg" className="min-h-11 w-full shrink-0 sm:w-auto">
                Apply &amp; recompute
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="lesions-heading">
        <h2 id="lesions-heading" className="sr-only">
          Lesion table
        </h2>
        <LesionTable />
      </section>

      {!compact && (
        <>
          <section aria-labelledby="predictions-heading">
            <h2 id="predictions-heading" className="sr-only">
              Model predictions
            </h2>
            <PredictionPanel />
          </section>

          <section aria-labelledby="zones-heading">
            <h2 id="zones-heading" className="sr-only">
              Zone diagram
            </h2>
            <ZoneDiagram />
          </section>
        </>
      )}

      <Card className="border-border/70 shadow-md shadow-black/[0.06] dark:shadow-none">
        <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/50 via-muted/25 to-transparent pb-4 dark:from-muted/30">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            Case file
          </CardTitle>
          <CardDescription>
            Import or export the case as JSON, or reset to defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <label className="group flex min-h-[3.25rem] cursor-pointer flex-col justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 transition-all hover:border-primary/40 hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">Import JSON</span>
              <p className="text-xs text-muted-foreground">Replace the active case from disk</p>
            </div>
            <span className="text-xs font-medium text-primary group-hover:underline sm:shrink-0">
              Choose file
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    importJsonFile(String(reader.result), f.name);
                    pushHistory();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Invalid JSON");
                  }
                };
                reader.readAsText(f);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => {
                const blob = new Blob([exportActiveJson()], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activeId ?? "compass"}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => {
                resetActiveToSeed();
              }}
            >
              Reset to sample defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
