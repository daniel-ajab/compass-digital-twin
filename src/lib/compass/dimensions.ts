import type { ProstateDims } from "@/lib/three/prostateScene";
import type { Prostate3DInputV1 } from "@/types/patient";

export function prostateDimsFromRecord(p: Prostate3DInputV1): ProstateDims {
  const refAP = 4.0;
  const refTR = 4.5;
  const refCC = 3.5;
  const d = p.prostate.dimensions_cm;
  if (d) {
    return {
      ap: (d.ap / refAP) * 1.0,
      tr: (d.transverse / refTR) * 1.15,
      cc: (d.cc / refCC) * 0.82,
    };
  }
  return { ap: 1.0, tr: 1.15, cc: 0.82 };
}

export function volumeScaleFromRecord(p: Prostate3DInputV1): number {
  const refVol = 40;
  const patientVol = p.prostate.volume_cc || refVol;
  return Math.max(0.7, Math.min(1.5, Math.pow(patientVol / refVol, 1 / 3)));
}

export function medianLobeFromRecord(p: Prostate3DInputV1): number {
  const g = p.prostate.median_lobe_grade;
  return g !== null && g !== undefined ? g : 0;
}
