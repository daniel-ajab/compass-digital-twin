import { createDefaultZones } from "@/lib/compass/constants";
import type { ClinicalState, Prostate3DInputV1, ZoneMap } from "@/types/patient";
import type { LesionRow } from "@/types/lesion";

export function buildProstateRecord(
  S: ClinicalState,
  lesions: LesionRow[],
): Prostate3DInputV1 {
  const zones: ZoneMap = { ...createDefaultZones() };
  return {
    _schema: "prostate-3d-input-v1",
    patient: {
      age: S.age,
      psa: S.psa,
      psa_density: S.psad,
      bmi: S.bmi,
      shim: S.shim,
      ipss: S.ipss,
      dm: S.dm,
      htn: S.htn,
      cad: S.cad,
      statin: S.statin,
      smoking: S.smoking,
      exercise: S.exercise,
      pde5: S.pde5 === "daily",
    },
    prostate: {
      volume_cc: S.vol,
      dimensions_cm: null,
      median_lobe_grade: null,
    },
    biopsy: {
      max_grade_group: S.gg,
      total_positive_cores: S.cores,
      total_cores: null,
      max_core_involvement_pct: S.maxcore,
      max_linear_extent_mm: S.linear_mm,
      max_pct_pattern45: S.pct45,
      has_cribriform: S.cribriform_bx,
      has_idc: S.idc_bx,
      has_pni: S.pni_bx,
      laterality: S.laterality,
      gg_left: S.gg_left,
      gg_right: S.gg_right,
      cores_left: S.cores_left,
      cores_right: S.cores_right,
      mc_left: S.mc_left,
      mc_right: S.mc_right,
      linear_left: S.linear_left,
      linear_right: S.linear_right,
      decipher_score: S.dec,
    },
    staging: {
      epe: !!S.mri_epe,
      svi: !!S.mri_svi,
      max_pirads: S.pirads,
      max_suv: S.suv || null,
      lesion_size_cm: S.mri_size > 0 ? S.mri_size : null,
      abutment: S.mri_abutment >= 0 ? S.mri_abutment : null,
      adc_mean: S.mri_adc > 0 ? S.mri_adc : null,
      epe_mus: !!S.mus_ece,
      svi_mus: !!S.mus_svi,
      psma_epe: !!S.psma_epe,
      lymph_nodes_psma: S.psma_ln ? "positive" : undefined,
    },
    zones,
    lesions,
  };
}
