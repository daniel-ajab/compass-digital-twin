/** Logistic sigmoid */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function logPsad(psa: number, vol: number): number {
  const psad = psa > 0 && vol > 0 ? psa / vol : 0.17;
  return Math.log(psad + 0.01);
}

/** Max core % as 0–100 for models */
export function normalizeMaxCorePct(mc: number): number {
  if (mc > 0 && mc <= 1) return mc * 100;
  return mc;
}
