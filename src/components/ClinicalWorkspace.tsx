import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode, type InputHTMLAttributes } from "react";
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
import { LesionTable } from "@/components/LesionTable";
import { PatientRoster } from "@/components/PatientRoster";
import { PredictionPanel } from "@/components/PredictionPanel";
import { ZoneDiagram } from "@/components/ZoneDiagram";
import type { PatientEntry } from "@/store/patientStore";
import { usePatientStore } from "@/store/patientStore";
import { cn } from "@/lib/utils";

// ── Shared select className ──────────────────────────────────────────────────
const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-primary/50 dark:border-input";

// ── Helper components ────────────────────────────────────────────────────────
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
  cols = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const gridCls =
    cols === 1
      ? "grid grid-cols-1 gap-4"
      : cols === 3
        ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2";
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
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
      <div className={gridCls}>{children}</div>
    </div>
  );
}

/** Compact checkbox + label tile used for boolean flags. */
function FlagToggle({
  id,
  label,
  hint,
  className,
  ...inputProps
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        className="h-4 w-4 shrink-0 rounded accent-primary"
        {...inputProps}
      />
      <div className="min-w-0">
        <span className="block text-xs font-medium leading-snug text-foreground">
          {label}
        </span>
        {hint ? (
          <span className="block text-[10px] leading-snug text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
    </label>
  );
}

// ── Form initializer from record ─────────────────────────────────────────────
function clinicalToForm(entry: PatientEntry): ClinicalFormValues {
  const rec = entry.record;
  const pat = rec.patient;
  const bx = rec.biopsy;
  const st = rec.staging;
  const pr = rec.prostate;

  // Resolve PSMA LN+ from various possible types in the JSON schema
  const lnRaw = st.lymph_nodes_psma;
  const psmaLn = Array.isArray(lnRaw)
    ? lnRaw.some(
        (x: { assessment?: string }) =>
          /positive|suspicious/i.test(x.assessment ?? ""),
      )
    : lnRaw === 1 ||
      lnRaw === true ||
      (typeof lnRaw === "string" && /positive|suspicious|avid|uptake/i.test(lnRaw));

  return {
    psa: pat.psa ?? 6.5,
    vol: pr.volume_cc ?? 45,
    age: pat.age ?? undefined,
    bmi: pat.bmi ?? undefined,
    gg: bx.max_grade_group ?? 2,
    cores: bx.total_positive_cores ?? 0,
    maxcore: bx.max_core_involvement_pct ?? 0,
    linear_mm: bx.max_linear_extent_mm ?? undefined,
    pct45: bx.max_pct_pattern45 ?? undefined,
    cribriform: !!(bx.has_cribriform),
    idc: !!(bx.has_idc),
    pni: !!(bx.has_pni),
    laterality: bx.laterality ?? "bilateral",
    gg_left: bx.gg_left ?? undefined,
    gg_right: bx.gg_right ?? undefined,
    cores_left: bx.cores_left ?? undefined,
    cores_right: bx.cores_right ?? undefined,
    mc_left: bx.mc_left ?? undefined,
    mc_right: bx.mc_right ?? undefined,
    decipherStr:
      bx.decipher_score !== null && bx.decipher_score !== undefined
        ? String(bx.decipher_score)
        : "",
    pirads: st.max_pirads ?? 2,
    mri_epe: !!st.epe,
    mri_svi: !!st.svi,
    mri_size: st.lesion_size_cm ?? undefined,
    mri_abutment: st.abutment ?? -1,
    mri_adc: st.adc_mean ?? undefined,
    mus_ece: !!st.epe_mus,
    mus_svi: !!st.svi_mus,
    primus: st.max_primus ?? undefined,
    psma_epe: !!st.psma_epe,
    psma_svi: !!st.psma_svi,
    psma_ln: psmaLn,
    suv: st.max_suv ?? undefined,
    shim: pat.shim ?? undefined,
    ipss: pat.ipss ?? undefined,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
interface ClinicalWorkspaceProps {
  className?: string;
  compact?: boolean;
}

/** Collapsible section wrapper matching HTML's "Input Variables ▼ show" pattern */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-t-lg border border-border bg-muted/20 px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30"
      >
        <span>{title}</span>
        <span className="text-[9px] text-muted-foreground/60">{open ? "▲ hide" : "▼ show"}</span>
      </button>
      {open && <div className="border border-t-0 border-border rounded-b-lg">{children}</div>}
    </div>
  );
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
          laterality: "bilateral",
          pirads: 2,
          mri_abutment: -1,
          decipherStr: "",
          psma_ln: false,
          mri_epe: false,
          mri_svi: false,
          mus_ece: false,
          mus_svi: false,
          psma_epe: false,
          psma_svi: false,
          cribriform: false,
          idc: false,
          pni: false,
        },
  });

  useEffect(() => {
    if (entry) {
      form.reset(clinicalToForm(entry));
    }
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const watchedPsa = form.watch("psa");
  const watchedVol = form.watch("vol");
  const psad = watchedVol > 0 ? (watchedPsa / watchedVol).toFixed(3) : "—";

  const onSubmit = (data: ClinicalFormValues) => {
    const decRaw = data.decipherStr?.trim() ?? "";
    const decParsed = decRaw === "" ? null : parseFloat(decRaw);
    updateClinicalForm({
      // Required fields always written
      psa: data.psa,
      vol: data.vol,
      gg: data.gg,
      cores: data.cores,
      maxcore: data.maxcore,
      cribriform_bx: data.cribriform ? 1 : 0,
      idc_bx: data.idc ? 1 : 0,
      pni_bx: data.pni ? 1 : 0,
      laterality: data.laterality,
      mri_epe: data.mri_epe ? 1 : 0,
      mri_svi: data.mri_svi ? 1 : 0,
      mri_abutment: data.mri_abutment,
      mus_ece: data.mus_ece ? 1 : 0,
      mus_svi: data.mus_svi ? 1 : 0,
      psma_epe: data.psma_epe ? 1 : 0,
      psma_svi: data.psma_svi ? 1 : 0,
      psma_ln: data.psma_ln ? 1 : 0,
      dec: decParsed === null || Number.isNaN(decParsed) ? null : decParsed,
      // Optional fields — undefined means "leave unchanged" in updateClinicalForm
      age: data.age,
      bmi: data.bmi,
      linear_mm: data.linear_mm,
      pct45: data.pct45,
      gg_left: data.gg_left,
      gg_right: data.gg_right,
      cores_left: data.cores_left,
      cores_right: data.cores_right,
      mc_left: data.mc_left,
      mc_right: data.mc_right,
      pirads: data.pirads,
      mri_size: data.mri_size,
      mri_adc: data.mri_adc,
      primus: data.primus,
      suv: data.suv,
      shim: data.shim,
      ipss: data.ipss,
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

      {!compact && (
        <>
          <section aria-labelledby="predictions-heading">
            <h2 id="predictions-heading" className="sr-only">
              Model predictions
            </h2>
            <PredictionPanel />
          </section>
        </>
      )}

      <section aria-labelledby="lesions-heading-top">
        <h2 id="lesions-heading-top" className="sr-only">
          Lesion table
        </h2>
        <LesionTable />
      </section>

      <CollapsibleSection title="Input Variables" defaultOpen={false}>
        <div className="overflow-hidden">
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Edit preoperative variables for the active case, then apply to refresh COMPASS predictions and the 3D twin.
          </p>
        </div>
        <div className="space-y-6 p-4 pt-5">
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>

            {/* ── Demographics ── */}
            <EntryGroup
              title="Demographics"
              description="Age and BMI used for functional risk stratification."
            >
              <FormField label="Age" htmlFor="age" hint="years" error={err.age?.message}>
                <Input
                  id="age"
                  type="number"
                  min={18}
                  max={120}
                  inputMode="numeric"
                  placeholder="e.g. 65"
                  aria-invalid={!!err.age}
                  {...form.register("age")}
                />
              </FormField>
              <FormField label="BMI" htmlFor="bmi" hint="kg/m²" error={err.bmi?.message}>
                <Input
                  id="bmi"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="e.g. 27"
                  aria-invalid={!!err.bmi}
                  {...form.register("bmi")}
                />
              </FormField>
            </EntryGroup>

            {/* ── Lab & anatomy ── */}
            <EntryGroup
              title="Laboratory & anatomy"
              description="Serum PSA and gland volume drive PSAD and model calibration."
            >
              <FormField label="PSA" htmlFor="psa" hint="ng/mL" error={err.psa?.message}>
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
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 sm:col-span-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  PSAD (calculated)
                </span>
                <span className="ml-auto font-mono text-sm font-semibold text-foreground">
                  {psad} ng/mL/cc
                </span>
              </div>
            </EntryGroup>

            {/* ── Biopsy summary ── */}
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
                hint="%"
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
              <FormField
                label="Max linear extent"
                htmlFor="linear_mm"
                hint="mm"
                error={err.linear_mm?.message}
              >
                <Input
                  id="linear_mm"
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  placeholder="e.g. 12"
                  aria-invalid={!!err.linear_mm}
                  {...form.register("linear_mm")}
                />
              </FormField>
              <FormField
                label="Pattern 4/5"
                htmlFor="pct45"
                hint="% of cancer cores"
                error={err.pct45?.message}
              >
                <Input
                  id="pct45"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.pct45}
                  {...form.register("pct45")}
                />
              </FormField>
            </EntryGroup>

            {/* ── Histology flags ── */}
            <EntryGroup
              title="Histology"
              description="Aggressive pathological features on biopsy."
              cols={3}
            >
              <FlagToggle
                id="cribriform"
                label="Cribriform"
                hint="Any cribriform pattern"
                {...form.register("cribriform")}
              />
              <FlagToggle
                id="idc"
                label="IDC"
                hint="Intraductal carcinoma"
                {...form.register("idc")}
              />
              <FlagToggle
                id="pni"
                label="PNI"
                hint="Perineural invasion"
                {...form.register("pni")}
              />
            </EntryGroup>

            {/* ── Laterality & side-specific biopsy ── */}
            <EntryGroup
              title="Side-specific biopsy"
              description="Lateralized GG and core data improve left/right ECE and SVI predictions."
            >
              <FormField
                label="Laterality"
                htmlFor="laterality"
                error={err.laterality?.message}
              >
                <select
                  id="laterality"
                  className={selectCls}
                  {...form.register("laterality")}
                >
                  <option value="right">Right only</option>
                  <option value="left">Left only</option>
                  <option value="bilateral">Bilateral</option>
                </select>
              </FormField>
              <div /> {/* spacer */}
              <FormField
                label="GG — Left"
                htmlFor="gg_left"
                hint="0–5"
                error={err.gg_left?.message}
              >
                <Input
                  id="gg_left"
                  type="number"
                  min={0}
                  max={5}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.gg_left}
                  {...form.register("gg_left")}
                />
              </FormField>
              <FormField
                label="GG — Right"
                htmlFor="gg_right"
                hint="0–5"
                error={err.gg_right?.message}
              >
                <Input
                  id="gg_right"
                  type="number"
                  min={0}
                  max={5}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.gg_right}
                  {...form.register("gg_right")}
                />
              </FormField>
              <FormField
                label="Cores — Left"
                htmlFor="cores_left"
                error={err.cores_left?.message}
              >
                <Input
                  id="cores_left"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.cores_left}
                  {...form.register("cores_left")}
                />
              </FormField>
              <FormField
                label="Cores — Right"
                htmlFor="cores_right"
                error={err.cores_right?.message}
              >
                <Input
                  id="cores_right"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.cores_right}
                  {...form.register("cores_right")}
                />
              </FormField>
              <FormField
                label="Max core % — Left"
                htmlFor="mc_left"
                hint="%"
                error={err.mc_left?.message}
              >
                <Input
                  id="mc_left"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.mc_left}
                  {...form.register("mc_left")}
                />
              </FormField>
              <FormField
                label="Max core % — Right"
                htmlFor="mc_right"
                hint="%"
                error={err.mc_right?.message}
              >
                <Input
                  id="mc_right"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={!!err.mc_right}
                  {...form.register("mc_right")}
                />
              </FormField>
            </EntryGroup>

            {/* ── Genomic ── */}
            <EntryGroup
              title="Genomic classifier"
              description="Decipher score adds +2–3% AUC to ECE, SVI, and BCR models."
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
            </EntryGroup>

            {/* ── MRI ── */}
            <EntryGroup
              title="MRI findings"
              description="PI-RADS, EPE/SVI flags, and lesion detail refine ECE risk and NS grading."
            >
              <FormField
                label="PI-RADS"
                htmlFor="pirads"
                hint="1–5"
                error={err.pirads?.message}
              >
                <select
                  id="pirads"
                  className={selectCls}
                  {...form.register("pirads")}
                >
                  <option value="1">1 — Very low</option>
                  <option value="2">2 — Low</option>
                  <option value="3">3 — Intermediate</option>
                  <option value="4">4 — High</option>
                  <option value="5">5 — Very high</option>
                </select>
              </FormField>
              <div /> {/* spacer */}
              <FlagToggle
                id="mri_epe"
                label="MRI EPE"
                hint="Extraprostatic extension"
                {...form.register("mri_epe")}
              />
              <FlagToggle
                id="mri_svi"
                label="MRI SVI"
                hint="Seminal vesicle invasion"
                {...form.register("mri_svi")}
              />
              <FormField
                label="Lesion size"
                htmlFor="mri_size"
                hint="cm (dominant lesion)"
                error={err.mri_size?.message}
              >
                <Input
                  id="mri_size"
                  type="number"
                  step="0.1"
                  min={0}
                  inputMode="decimal"
                  placeholder="e.g. 1.5"
                  aria-invalid={!!err.mri_size}
                  {...form.register("mri_size")}
                />
              </FormField>
              <FormField
                label="Capsular abutment"
                htmlFor="mri_abutment"
                error={err.mri_abutment?.message}
              >
                <select
                  id="mri_abutment"
                  className={selectCls}
                  {...form.register("mri_abutment")}
                >
                  <option value="-1">Not assessed</option>
                  <option value="0">0 — No contact</option>
                  <option value="1">1 — Abuts capsule</option>
                  <option value="2">2 — Broad contact</option>
                  <option value="3">3 — Irregular (EPE suspected)</option>
                  <option value="4">4 — Definite bulge</option>
                </select>
              </FormField>
              <FormField
                label="ADC mean"
                htmlFor="mri_adc"
                hint="µm²/s (dominant lesion)"
                error={err.mri_adc?.message}
              >
                <Input
                  id="mri_adc"
                  type="number"
                  step="1"
                  min={0}
                  inputMode="numeric"
                  placeholder="e.g. 620"
                  aria-invalid={!!err.mri_adc}
                  {...form.register("mri_adc")}
                />
              </FormField>
            </EntryGroup>

            {/* ── Micro-ultrasound ── */}
            <EntryGroup
              title="Micro-ultrasound (ExactVu)"
              description="PRI-MUS score and ECE flag from ExactVu micro-US."
            >
              <FlagToggle
                id="mus_ece"
                label="MUS ECE"
                hint="ECE on micro-US"
                {...form.register("mus_ece")}
              />
              <FlagToggle
                id="mus_svi"
                label="MUS SVI"
                hint="SVI on micro-US"
                {...form.register("mus_svi")}
              />
              <FormField
                label="PRI-MUS score"
                htmlFor="primus"
                hint="0–5"
                error={err.primus?.message}
              >
                <select
                  id="primus"
                  className={selectCls}
                  {...form.register("primus")}
                >
                  <option value="">Not performed</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3 — Suspicious</option>
                  <option value="4">4 — High suspicion</option>
                  <option value="5">5 — Very high suspicion</option>
                </select>
              </FormField>
            </EntryGroup>

            {/* ── PSMA PET/CT ── */}
            <EntryGroup
              title="PSMA PET/CT"
              description="PSMA findings contribute to ECE, SVI, and LNI predictions."
            >
              <FlagToggle
                id="psma_epe"
                label="PSMA EPE"
                hint="Extracapsular extension on PET"
                {...form.register("psma_epe")}
              />
              <FlagToggle
                id="psma_svi"
                label="PSMA SVI"
                hint="Seminal vesicle on PET"
                {...form.register("psma_svi")}
              />
              <FlagToggle
                id="psma_ln"
                label="PSMA LN+"
                hint="Positive lymph nodes on PET"
                {...form.register("psma_ln")}
              />
              <FormField
                label="SUVmax"
                htmlFor="suv"
                hint="Dominant intraprostatic lesion"
                error={err.suv?.message}
              >
                <Input
                  id="suv"
                  type="number"
                  step="0.1"
                  min={0}
                  inputMode="decimal"
                  placeholder="e.g. 12.4"
                  aria-invalid={!!err.suv}
                  {...form.register("suv")}
                />
              </FormField>
            </EntryGroup>

            {/* ── Quality of life ── */}
            <EntryGroup
              title="Functional status"
              description="Baseline erectile and urinary function for counselling."
            >
              <FormField
                label="SHIM score"
                htmlFor="shim"
                hint="0–25 (erectile function)"
                error={err.shim?.message}
              >
                <Input
                  id="shim"
                  type="number"
                  min={0}
                  max={25}
                  inputMode="numeric"
                  placeholder="e.g. 21"
                  aria-invalid={!!err.shim}
                  {...form.register("shim")}
                />
              </FormField>
              <FormField
                label="IPSS score"
                htmlFor="ipss"
                hint="0–35 (urinary symptoms)"
                error={err.ipss?.message}
              >
                <Input
                  id="ipss"
                  type="number"
                  min={0}
                  max={35}
                  inputMode="numeric"
                  placeholder="e.g. 8"
                  aria-invalid={!!err.ipss}
                  {...form.register("ipss")}
                />
              </FormField>
            </EntryGroup>

            <div className="flex flex-col gap-3 border-t border-border pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                Changes are staged until you apply; undo from the header if needed.
              </p>
              <Button type="submit" size="sm" className="w-full shrink-0 sm:w-auto">
                Apply &amp; recompute
              </Button>
            </div>
          </form>
        </div>
        </div>
      </CollapsibleSection>

      {!compact && (
        <section aria-labelledby="zones-heading">
          <h2 id="zones-heading" className="sr-only">
            Zone diagram
          </h2>
          <ZoneDiagram />
        </section>
      )}

      <Card className="border-border">
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            Case file
          </CardTitle>
          <CardDescription>
            Exchange{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              prostate-3d-input-v1
            </code>{" "}
            JSON for backup or integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <label className="group flex min-h-[3.25rem] cursor-pointer flex-col justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 transition-all hover:border-primary/40 hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">Import JSON</span>
              <p className="text-xs text-muted-foreground">
                Replace the active case from disk
              </p>
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
              size="sm"
              className="w-full sm:w-auto"
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
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground sm:w-auto"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset the active case to the seed patient? All unsaved edits will be lost.",
                  )
                ) {
                  resetActiveToSeed();
                  pushHistory();
                }
              }}
            >
              Reset to seed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
