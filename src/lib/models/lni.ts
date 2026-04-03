import type { ClinicalState } from "@/types/patient";
import { sigmoid } from "@/lib/utils/math";

const LNI_PLND = {
  i: -3.2892,
  c: [0.4553, 0.4432, 0.5276, -0.3436],
  m: [2.2283, 2.9348, 0.1258, 46.9233],
  s: [0.6696, 1.1777, 0.3316, 29.0332],
} as const;

/** ePLND-validated 4-feature LNI model */
export function predictLni(S: ClinicalState): number {
  const log_psa_plus_1 = Math.log((S.psa || 6.5) + 1);
  const gg = S.gg || 2;
  const psma_ln = S.psma_ln || 0;
  const vol = S.vol || 40;
  const vals = [log_psa_plus_1, gg, psma_ln, vol];
  let L = LNI_PLND.i;
  for (let k = 0; k < vals.length; k++) {
    const v = vals[k];
    const sk = LNI_PLND.s[k] ?? 0;
    if (v != null && !Number.isNaN(v) && sk > 0) {
      L +=
        (LNI_PLND.c[k] ?? 0) * ((v - (LNI_PLND.m[k] ?? 0)) / sk);
    }
  }
  return sigmoid(L);
}
