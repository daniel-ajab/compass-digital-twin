export type CompassZoneKey =
  | "1a"
  | "2a"
  | "3a"
  | "4a"
  | "5a"
  | "6a"
  | "1p"
  | "2p"
  | "3p"
  | "4p"
  | "5p"
  | "6p"
  | "7p"
  | "8p"
  | "9p"
  | "10p"
  | "SV-L"
  | "SV-R";

export interface ZoneSources {
  mri: number | null;
  mus: number | null;
  suv: number | null;
  biopsy_gg: number | null;
  core_pct: number | null;
  linear_mm: number | null;
  pct_4_5: number | null;
  cribriform: boolean | null;
}

export interface ZoneData {
  cancer: number;
  ece: number;
  svi: number;
  psm?: number;
  hasData?: boolean;
  sources: ZoneSources;
}

export type ZoneMap = Partial<Record<CompassZoneKey, ZoneData>>;

export interface Prostate3DInputV1 {
  _schema: "prostate-3d-input-v1";
  patient: {
    age: number | null;
    psa: number | null;
    psa_density?: number | null;
    bmi?: number | null;
    shim?: number | null;
    ipss?: number | null;
    dm?: boolean;
    htn?: boolean;
    cad?: boolean;
    statin?: boolean;
    smoking?: string;
    exercise?: string;
    pfmt?: string;
    alcohol?: string;
    pde5?: boolean;
    pde5_plan?: string;
  };
  prostate: {
    volume_cc: number | null;
    dimensions_cm: {
      ap: number;
      transverse: number;
      cc: number;
    } | null;
    median_lobe_grade?: number | null;
  };
  biopsy: {
    max_grade_group: number | null;
    total_positive_cores: number | null;
    total_cores?: number | null;
    max_core_involvement_pct: number | null;
    max_linear_extent_mm?: number | null;
    max_pct_pattern45?: number | null;
    has_cribriform?: number | null;
    has_idc?: number | null;
    has_pni?: number | null;
    laterality?: "left" | "right" | "bilateral";
    gg_left?: number | null;
    gg_right?: number | null;
    cores_left?: number | null;
    cores_right?: number | null;
    mc_left?: number | null;
    mc_right?: number | null;
    linear_left?: number | null;
    linear_right?: number | null;
    decipher_score?: number | null;
  };
  staging: {
    /**
     * MRI extracapsular extension call. `null` = MRI not performed or EPE not
     * assessed; `false` = assessed and negative. Widened from plain `boolean`
     * in Phase 1A so an absent MRI no longer round-trips as a negative MRI.
     * Reading older records is unaffected: they carry true/false.
     */
    epe: boolean | null;
    /** MRI seminal vesicle invasion call. `null` = not assessed. */
    svi: boolean | null;
    max_pirads?: number | null;
    max_suv?: number | null;
    lesion_size_cm?: number | null;
    abutment?: number | null;
    adc_mean?: number | null;
    epe_mus?: boolean;
    svi_mus?: boolean;
    psma_epe?: boolean;
    psma_svi?: boolean;
    max_primus?: number | null;
    lymph_nodes_psma?: unknown;
    /**
     * Explicit study status. Optional: when absent it is inferred
     * conservatively at read time (see lib/compass/imagingAvailability.ts).
     */
    availability?: Partial<ImagingAvailability> | null;
  };
  zones: ZoneMap;
  lesions: import("./lesion").LesionRow[];
  media?: Record<
    string,
    { dataUrl?: string; type?: string; name?: string; size?: number }
  >;
}

/**
 * A clinical predictor that may be genuinely unavailable.
 *
 * `null` means the test was not performed or the value was not recorded.
 * `0` means the test WAS performed and the finding was negative/zero.
 * These two states must never collapse into each other: the vNext model locks
 * substitute a frozen training-cohort imputation mean for `null`, which is not
 * 0 for any predictor. See `src/lib/models/inputContract.ts`.
 */
export type OptionalPredictor = number | null;

/** Was an imaging study done? "unknown" is never treated as a negative study. */
export type ModalityStatus = "performed" | "not_performed" | "unknown";
export type ImagingModality = "mri" | "exactvu" | "psma";
export type ImagingAvailability = Record<ImagingModality, ModalityStatus>;

export interface ClinicalState {
  age: number;
  bmi: number;
  /** REQUIRED for vNext oncologic endpoints; must be > 0. */
  psa: number;
  /** REQUIRED for vNext oncologic endpoints; must be > 0. */
  vol: number;
  psad: number;
  /** REQUIRED for vNext oncologic endpoints; biopsy grade group 1–5. */
  gg: number;
  /**
   * Whether each REQUIRED input was actually present in the source record.
   *
   * `psa`, `vol` and `gg` stay plain numbers because the entire v22 runtime and
   * UI read them unconditionally, and Phase 1A is not permitted to change what
   * v22 computes. When a record omits one, the parser still seeds the historical
   * default (PSA 6.5, volume 45, GG 1) so v22 output is bit-identical, and
   * records the omission here. `validateVNextRequiredInputs` reads this, so the
   * vNext runtime can refuse to predict rather than quietly inventing a PSAD.
   *
   * Phases 2–7 make this the only consulted source for required-input presence.
   */
  required_present: { psa: boolean; vol: boolean; gg: boolean };
  /** Resolved study status for MRI / ExactVu / PSMA. */
  imaging_availability: ImagingAvailability;
  /** Modalities marked not_performed that nonetheless carry data; blocks vNext. */
  imaging_conflicts: ImagingModality[];
  cores: OptionalPredictor;
  maxcore: OptionalPredictor;
  linear_mm: number;
  pct45: number;
  cribriform_bx: number;
  idc_bx: number;
  pni_bx: number;
  bilateral: number;
  laterality: "left" | "right" | "bilateral";
  pirads: OptionalPredictor;
  mri_epe: OptionalPredictor;
  mri_svi: OptionalPredictor;
  primus: number;
  mus_ece: number;
  mus_svi: number;
  psma_avail: number;
  suv: number;
  psma_epe: number;
  psma_svi: number;
  psma_ln: OptionalPredictor;
  dec: number | null;
  decipher: string;
  shim: number;
  ipss: number;
  pfmt: string;
  exercise: string;
  smoking: string;
  pde5: string;
  dm: boolean;
  htn: boolean;
  cad: boolean;
  statin: boolean;
  alcohol: string;
  leftMaxScore: number;
  rightMaxScore: number;
  mri_size: number;
  /**
   * Capsular abutment grade. Historically -1 was an in-band sentinel for
   * "not assessed"; vNext uses `null` for that and reserves numeric values
   * for real observations.
   */
  mri_abutment: OptionalPredictor;
  mri_adc: OptionalPredictor;
  psma_lesion_count: number;
  psma_multifocal: number;
  psma_at_base: number;
  psma_side: string;
  ev_size: number;
  ev_abutment: number;
  ev_n_lesions: number;
  ev_at_base: number;
  gg_left: number;
  gg_right: number;
  cores_left: number;
  cores_right: number;
  mc_left: number;
  mc_right: number;
  linear_left: number;
  linear_right: number;
}

export function defaultClinicalState(): ClinicalState {
  return {
    age: 64,
    bmi: 27,
    psa: 6.5,
    vol: 45,
    psad: 0.144,
    gg: 2,
    required_present: { psa: true, vol: true, gg: true },
    imaging_availability: { mri: "performed", exactvu: "unknown", psma: "unknown" },
    imaging_conflicts: [],
    cores: 4,
    maxcore: 40,
    linear_mm: 0,
    pct45: 0,
    cribriform_bx: 0,
    idc_bx: 0,
    pni_bx: 0,
    bilateral: 0,
    laterality: "right",
    pirads: 4,
    mri_epe: 0,
    mri_svi: 0,
    primus: 0,
    mus_ece: 0,
    mus_svi: 0,
    psma_avail: 0,
    suv: 12,
    psma_epe: 0,
    psma_svi: 0,
    psma_ln: 0,
    dec: null,
    decipher: "na",
    shim: 21,
    ipss: 8,
    pfmt: "basic",
    exercise: "moderate",
    smoking: "never",
    pde5: "prn",
    dm: false,
    htn: false,
    cad: false,
    statin: false,
    alcohol: "moderate",
    leftMaxScore: 0,
    rightMaxScore: 0,
    mri_size: 0,
    mri_abutment: null,
    mri_adc: null,
    psma_lesion_count: 0,
    psma_multifocal: 0,
    psma_at_base: 0,
    psma_side: "none",
    ev_size: 0,
    ev_abutment: 0,
    ev_n_lesions: 0,
    ev_at_base: 0,
    gg_left: 0,
    gg_right: 0,
    cores_left: 0,
    cores_right: 0,
    mc_left: 0,
    mc_right: 0,
    linear_left: 0,
    linear_right: 0,
  };
}
