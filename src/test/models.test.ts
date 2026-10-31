import { describe, expect, it } from "vitest";
import { defaultClinicalState } from "@/types/patient";
import { predictEcePatient, clampEcePatient } from "@/lib/models/ece";
import { predictLni } from "@/lib/models/lni";
import { predictSviPatient } from "@/lib/models/svi";

describe("COMPASS models", () => {
  it("predictEcePatient returns probability in (0,1)", () => {
    const S = defaultClinicalState();
    const p = predictEcePatient(S);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    const c = clampEcePatient(p);
    expect(c).toBeGreaterThanOrEqual(0.02);
    expect(c).toBeLessThanOrEqual(0.92);
  });

  it("predictLni is stable for sample clinical state", () => {
    const S = defaultClinicalState();
    const p = predictLni(S);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("predictSviPatient matches deterministic re-run", () => {
    const S = defaultClinicalState();
    expect(predictSviPatient(S)).toBe(predictSviPatient(S));
  });
});
