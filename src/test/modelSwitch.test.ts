/**
 * The header switch runs either the original (v22, May 13) engine or the new
 * (vNext) one on the same case. Invented values only.
 */
import { describe, it, expect } from "vitest";
import { usePatientStore } from "@/store/patientStore";
import { emptyLesion } from "@/types/lesion";
import { runLegacy } from "@/legacy/run";

const st = () => usePatientStore.getState();

function enterCase() {
  st().newCase();
  st().updateClinicalForm({ age: 63, psa: 8.4, vol: 42, gg: 3, cores: 4, maxcore: 45, dec: 0.71 });
  st().updateLesionRows([
    { ...emptyLesion("bx-1"), source: "Bx", side: "R", level: "Mid", zone: "Posterolateral", score: "3", corePct: 45 },
    { ...emptyLesion("mri-1"), source: "MRI", side: "R", level: "Mid", zone: "Posterolateral", score: "4", pirads: 4 },
    { ...emptyLesion("psma-1"), source: "PSMA", side: "R", level: "Apex", zone: "Posterior", score: "9.5", suv: 9.5 },
  ]);
}

describe("model switch", () => {
  it("v22 gives the original engine's output for the case", () => {
    st().setModelSet("vnext");
    enterCase();
    st().setModelSet("v22");
    const entry = st().patients.find((p) => p.id === st().activeId)!;
    const direct = runLegacy(entry.record, entry.lesionRows).predictions;
    const L = st().legacyPredictions!;
    expect(L).toEqual(direct);
    // The rest of the UI sees v22's single PSM on both sides and its BCR in the one-number slot.
    const p = st().predictions!;
    expect([p.ece, p.psmL, p.psmR, p.bcr36]).toEqual([L.ece, L.psm, L.psm, L.bcr]);
    expect(Number.isNaN(p.bcr12)).toBe(true);
    // The 3D zones come from the v22 mapping too.
    expect(st().threeZones.map((z) => z.cancer)).toEqual(runLegacy(entry.record, entry.lesionRows).threeZones.map((z) => z.cancer));
  });

  it("switching back to vNext restores the vNext output", () => {
    st().setModelSet("vnext");
    enterCase();
    const vnext = st().predictions!;
    st().setModelSet("v22");
    expect(st().predictions!.ece).not.toBe(vnext.ece);
    st().setModelSet("vnext");
    expect(st().predictions).toEqual(vnext);
    expect(st().legacyPredictions).toBeNull();
  });

  it("Decipher moves the v22 models but not vNext", () => {
    st().setModelSet("vnext");
    enterCase();
    const vBefore = st().predictions!.ece;
    st().updateClinicalForm({ dec: 0.2 });
    expect(st().predictions!.ece).toBe(vBefore);
    st().setModelSet("v22");
    const lowDec = st().legacyPredictions!.ece;
    st().updateClinicalForm({ dec: 0.9 });
    expect(st().legacyPredictions!.ece).not.toBe(lowDec);
    st().setModelSet("vnext");
  });

  it("the 3D mapping switches too: apex findings", () => {
    // A front-of-apex MRI lesion. v22 (May) lets the back-of-apex value overwrite
    // the shared apex zone; vNext keeps the larger of the two.
    const apex = () => st().threeZones.find((z) => z.id === "A-RA")!.cancer;
    st().setModelSet("vnext");
    st().newCase();
    st().updateClinicalForm({ psa: 7, vol: 40, gg: 2 });
    st().updateLesionRows([
      { ...emptyLesion("mri-a"), source: "MRI", side: "R", level: "Apex", zone: "Anterior", score: "5", pirads: 5 },
    ]);
    const vnextApex = apex();
    st().setModelSet("v22");
    const v22Apex = apex();
    expect(vnextApex).toBeGreaterThan(v22Apex);
    st().setModelSet("vnext");
  });
});
