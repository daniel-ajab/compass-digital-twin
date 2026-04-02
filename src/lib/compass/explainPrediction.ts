/** Short clinical explanations for the “Explain” drawer (decision support context). */
export const PREDICTION_EXPLANATIONS: Record<string, string> = {
  overview:
    "COMPASS combines biopsy, MRI (PI-RADS, EPE, SVI, lesion detail), micro-US, PSMA PET, and optional Decipher to estimate capsular extension, SVI, upgrading, margins, BCR, and node risk — with lateralized models and a five-zone nerve-sparing framework calibrated to institutional outcomes.",
  ECE: "Extracapsular extension: probability that tumor extends beyond the prostatic capsule, combining biopsy grade, PSA density, trimodal imaging concordance (MRI + micro-US + PSMA), and optional Decipher.",
  SVI: "Seminal vesicle invasion: risk of SV involvement from MRI SVI signal, grade, core burden, PI-RADS, and genomic score when available.",
  Upgrade: "Upgrade on final pathology vs biopsy: higher risk with intermediate biopsy GG, cribriform/IDC, bilateral disease, and metabolic imaging features.",
  PSM: "Positive surgical margins: preoperative estimate limited by intraoperative technique; bilateral disease and PSA density are strong drivers.",
  BCR: "Biochemical recurrence after surgery: integrates PSA density, grade pattern, MRI SVI, ECE concordance, and Decipher when present.",
  LNI: "Lymph node invasion: ePLND-validated model using log(PSA+1), biopsy grade group, PSMA nodal positivity, and prostate volume (protective).",
  L: "Left nerve-sparing grade from zone-aware distribution of lateralized ECE/SVI risk and MRI flags.",
  R: "Right nerve-sparing grade — symmetric logic to the left side.",
};
