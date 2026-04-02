import type { ClinicalState } from "@/types/patient";
import { sigmoid } from "@/lib/utils/math";

const UPGRADE = {
  i: -3.2302,
  c: [
    0.1218, -1.8943, -0.3519, 0.0554, 0.0709, 0.0575, -0.2719, -0.6007, 0.2033,
    0.3679, 0.1962, 0.1865, 0.308, 0.1081,
  ],
  m: [
    0.3149, 2.7446, 6.1862, 15.5193, 8.5496, 0.2437, 0.0132, 0.0362, 0.4679,
    4.0791, 0.0428, 0.1087, 16.6291, 0.0264,
  ],
  s: [
    1.7167, 1.1419, 4.2345, 27.8063, 11.625, 0.331, 0.114, 0.1869, 0.499,
    0.8516, 0.2025, 0.3113, 36.1101, 0.1602,
  ],
} as const;

export function predictUpgrade(S: ClinicalState): number {
  if (S.gg < 1) return 0.05;
  const vals = [
    S.psad,
    S.gg,
    S.cores,
    S.maxcore,
    S.linear_mm,
    S.pct45,
    S.cribriform_bx,
    S.pni_bx,
    S.bilateral,
    Math.max(S.pirads, 2),
    S.mri_svi,
    S.mus_ece,
    S.suv,
    S.psma_epe,
  ];
  let L = UPGRADE.i;
  for (let k = 0; k < vals.length; k++) {
    const v = vals[k];
    const sk = UPGRADE.s[k] ?? 0;
    if (v !== null && !Number.isNaN(v) && sk > 0) {
      L += (UPGRADE.c[k] ?? 0) * ((v - (UPGRADE.m[k] ?? 0)) / sk);
    }
  }
  return sigmoid(L);
}
