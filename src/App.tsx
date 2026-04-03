import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ClinicalWorkspace } from "@/components/ClinicalWorkspace";
import { ControlsOverlay } from "@/components/ControlsOverlay";
import { InsightsWorkspace } from "@/components/InsightsWorkspace";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { SidePanel } from "@/components/SidePanel";
import { ThreeCanvas } from "@/components/ThreeCanvas";
import { ZoneLabelsOverlay } from "@/components/ZoneLabelsOverlay";
import { CaseLog } from "@/components/CaseLog";
import { PREDICTION_EXPLANATIONS } from "@/lib/compass/explainPrediction";
import {
  deriveClinicalFromLesions,
  lesionsFromRows,
} from "@/lib/utils/normalization";
import { clinicalStateFromRecord } from "@/lib/compass/clinicalFromRecord";
import patientsCatalog from "@/data/patients.json";
import {
  hydrateFromLocalStorage,
  usePatientStore,
} from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

/** Offset above mobile tab bar (h-16) + safe area */
const MOBILE_CHROME_BOTTOM =
  "max-lg:bottom-[calc(0.75rem+4rem+env(safe-area-inset-bottom,0px))]";

function DimOverlay() {
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const entry = patients.find((p) => p.id === activeId);
  if (!entry) return null;
  const rec = { ...entry.record, lesions: entry.lesionRows };
  const S = deriveClinicalFromLesions(
    clinicalStateFromRecord(rec),
    lesionsFromRows(entry.lesionRows),
  );
  const vol = entry.record.prostate.volume_cc ?? S.vol;
  const d = entry.record.prostate.dimensions_cm;
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-2 z-10 rounded-lg border border-border/60 bg-black/75 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur sm:px-3 sm:py-2 sm:text-[11px] lg:bottom-3 lg:left-3",
        MOBILE_CHROME_BOTTOM,
      )}
    >
      <span className="font-semibold text-primary">{vol} cc</span>
      {d && (
        <>
          {" "}
          | {d.ap} × {d.transverse} × {d.cc} cm{" "}
          <span className="hidden opacity-70 sm:inline">(AP × TR × CC)</span>
        </>
      )}
      {" | "}
      PSAD <span className="text-primary">{S.psad.toFixed(3)}</span>
    </div>
  );
}

export default function App() {
  const bootstrapFromJson = usePatientStore((s) => s.bootstrapFromJson);
  const infoOpen = useUiStore((s) => s.infoOpen);
  const setInfoOpen = useUiStore((s) => s.setInfoOpen);
  const caseLogOpen = useUiStore((s) => s.caseLogOpen);
  const setCaseLogOpen = useUiStore((s) => s.setCaseLogOpen);
  const explainKey = useUiStore((s) => s.explainKey);
  const setExplainKey = useUiStore((s) => s.setExplainKey);
  const dark = useUiStore((s) => s.dark);
  const mobileWorkspace = useUiStore((s) => s.mobileWorkspace);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    hydrateFromLocalStorage();
    const st = usePatientStore.getState();
    if (st.patients.length === 0) {
      bootstrapFromJson(
        patientsCatalog.patients as {
          id: string;
          name: string;
          record: import("@/types/patient").Prostate3DInputV1;
        }[],
      );
    } else {
      st.recompute();
      usePatientStore.setState({ loading: false });
    }
  }, [bootstrapFromJson]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <AppHeader />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <SidePanel />

        <main className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          {/*
            Viewer stays mounted with real dimensions on small screens (absolute fill)
            so WebGL resize/orbit/zoom keep working when switching Data / Results / 3D tabs.
          */}
          <div
            className={cn(
              "relative z-0 min-h-0 min-w-0 w-full flex-1 bg-muted/20",
              "max-lg:absolute max-lg:inset-0",
              "lg:relative lg:flex lg:min-h-0",
            )}
          >
            <div className="absolute inset-0 min-h-0 min-w-0">
              <ThreeCanvas />
            </div>
            <ControlsOverlay />
            <ZoneLabelsOverlay />
            <DimOverlay />
          </div>

          <div
            className={cn(
              "relative z-10 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-muted/20 app-scroll dark:bg-background",
              "max-lg:absolute max-lg:inset-0",
              mobileWorkspace === "insights" ? "max-lg:flex max-lg:flex-col" : "max-lg:hidden",
              "lg:hidden",
            )}
          >
            <InsightsWorkspace />
          </div>

          <div
            className={cn(
              "relative z-10 min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-muted/20 app-scroll dark:bg-background",
              "max-lg:absolute max-lg:inset-0",
              mobileWorkspace === "clinical" ? "max-lg:flex max-lg:flex-col" : "max-lg:hidden",
              "lg:hidden",
            )}
          >
            <ClinicalWorkspace compact />
          </div>
        </main>
      </div>

      <MobileTabBar />

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 sm:p-6 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <Button
            type="button"
            variant="secondary"
            className="fixed right-4 top-4 z-10"
            onClick={() => setInfoOpen(false)}
          >
            Close
          </Button>
          <div className="mx-auto max-w-2xl py-8 space-y-6 text-sm">
            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">What Is COMPASS?</h2>
              <p className="text-muted-foreground leading-relaxed">
                COMPASS predicts surgical outcomes for prostate cancer patients by combining clinical data
                with three imaging modalities: MRI, micro-ultrasound (ExactVu), and PSMA PET/CT. It generates
                <strong className="text-foreground"> side-specific nerve-sparing recommendations</strong> and{" "}
                <strong className="text-foreground">zone-level risk heatmaps</strong> for surgical planning.
              </p>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                Developed on <strong className="text-foreground">5,352 consecutive RARP patients</strong>. Independently validated on{" "}
                <strong className="text-foreground">815 trimodal imaging patients</strong> (MRI + PSMA PET + ExactVu; 663 with complete data, zero training overlap).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">What It Predicts</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Outcome</th>
                      <th className="py-1 pr-3 font-medium">What It Means</th>
                      <th className="py-1 pr-3 font-medium">Full CV</th>
                      <th className="py-1 font-medium">Independent</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["ECE (patient)", "Cancer beyond the capsule", "0.800", "0.761"],
                      ["ECE (side-specific)", "Lateralized ECE per side", "0.80", "L 0.71 / R 0.77"],
                      ["Focal vs Extensive ECE", "If ECE: focal (<2 HPF) or extensive", "0.70", "—"],
                      ["SVI (patient)", "Seminal vesicle invasion", "0.863", "0.874"],
                      ["SVI (side-specific)", "Lateralized SVI per side", "0.81", "—"],
                      ["Upgrade", "Higher grade on final path", "0.804", "0.830"],
                      ["LNI (ePLND-validated)", "Lymph node invasion", "0.879", "0.794"],
                      ["BCR", "PSA rising after surgery", "0.733", "0.733"],
                      ["PSM", "Positive surgical margins", "0.62", "0.586"],
                    ].map(([out, meaning, cv, ind]) => (
                      <tr key={out} className="border-b border-border/40">
                        <td className="py-1 pr-3 font-medium text-foreground">{out}</td>
                        <td className="py-1 pr-3">{meaning}</td>
                        <td className="py-1 pr-3 tabular-nums">{cv}</td>
                        <td className="py-1 tabular-nums">{ind}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Full CV: 5-fold cross-validation on full cohort. Independent: trained on non-trimodal, tested on 815 trimodal patients (663 with complete data, zero overlap). SVI and BCR retrained with expanded biopsy (3,306 max core%) + Decipher (1,845 patients). LNI validated on ePLND histopathology (N=644).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">Nerve-Sparing Grades</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Grade</th>
                      <th className="py-1 pr-3 font-medium">Approach</th>
                      <th className="py-1 font-medium">When Recommended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Grade 1", "Intrafascial (full preservation)", "Low ECE + SVI risk, no MRI flags"],
                      ["Grade 2", "Interfascial (partial preservation)", "Moderate risk"],
                      ["Grade 3", "Wide resection (minimal preservation)", "High risk or MRI EPE/SVI positive"],
                    ].map(([g, approach, when]) => (
                      <tr key={g} className="border-b border-border/40 text-muted-foreground">
                        <td className="py-1 pr-3 font-medium text-foreground">{g}</td>
                        <td className="py-1 pr-3">{approach}</td>
                        <td className="py-1">{when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">NS Grade → PSM → BCR Outcomes</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">NS Grade</th>
                      <th className="py-1 pr-3 font-medium">N</th>
                      <th className="py-1 pr-3 font-medium">PSM Rate</th>
                      <th className="py-1 pr-3 font-medium">BCR if PSM−</th>
                      <th className="py-1 pr-3 font-medium">BCR if PSM+</th>
                      <th className="py-1 font-medium">Overall BCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Grade 1", "706", "11.6%", "3.4%", "3.3%", "3.4%", "text-emerald-500"],
                      ["Grade 2", "3,097", "12.0%", "9.2%", "16.0%", "10.2%", "text-amber-500"],
                      ["Grade 3", "1,105", "16.7%", "21.6%", "27.6%", "22.7%", "text-red-500"],
                    ].map(([g, n, psm, bcrNo, bcrPsm, bcrAll, cls]) => (
                      <tr key={g} className="border-b border-border/40 text-muted-foreground">
                        <td className="py-1 pr-3 font-medium text-foreground">{g}</td>
                        <td className="py-1 pr-3 tabular-nums">{n}</td>
                        <td className="py-1 pr-3 tabular-nums">{psm}</td>
                        <td className="py-1 pr-3 tabular-nums">{bcrNo}</td>
                        <td className="py-1 pr-3 tabular-nums">{bcrPsm}</td>
                        <td className={`py-1 font-bold tabular-nums ${cls}`}>{bcrAll}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">From 5,003 sides (NS grade) and 442 PSM+ patients with BCR follow-up.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">ECE Risk vs Actual Pathology</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Predicted ECE Risk</th>
                      <th className="py-1 pr-3 font-medium">Actual EPE Found</th>
                      <th className="py-1 font-medium">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["< 15%", "~15%", "Favor intrafascial nerve-sparing"],
                      ["15–30%", "~25%", "Standard interfascial approach"],
                      ["30–50%", "~40%", "Consider wide resection on that side"],
                      ["> 50%", "~73%", "Wide resection recommended"],
                    ].map(([pred, actual, action]) => (
                      <tr key={pred} className="border-b border-border/40">
                        <td className="py-1 pr-3 tabular-nums">{pred}</td>
                        <td className="py-1 pr-3 tabular-nums">{actual}</td>
                        <td className="py-1">{action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">PLND Decision Module</h2>
              <p className="text-muted-foreground text-[11px] mb-2">Based on N=664 consecutive RARP + PLND + PSMA PET patients. Asymmetric decision rule derived from risk-stratified diagnostic accuracy analysis.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Scenario</th>
                      <th className="py-1 pr-3 font-medium">LNI Rate</th>
                      <th className="py-1 font-medium">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["Non-HR + PSMA LN−", "0%", "Consider omitting PLND (zero false negatives)"],
                      ["Non-HR + PSMA LN+", "Low", "Limited PLND (low PPV, most are FP)"],
                      ["HR + PSMA LN−", "12%", "Always ePLND (12% occult LNI)"],
                      ["HR + PSMA LN+", "Highest", "Always ePLND, high priority"],
                    ].map(([sc, lni, rec]) => (
                      <tr key={sc} className="border-b border-border/40">
                        <td className="py-1 pr-3 font-medium text-foreground">{sc}</td>
                        <td className="py-1 pr-3 tabular-nums">{lni}</td>
                        <td className="py-1">{rec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">NCCN High-Risk = GG ≥ 4 or PSA &gt; 20 ng/mL. All 20 false negatives in the full cohort were NCCN high-risk patients.</p>
              <div className="mt-3 overflow-x-auto">
                <div className="mb-1 text-[10px] font-semibold text-muted-foreground">Station-Specific False Positive Rates (N=82 PSMA LN+ with ePLND histopathology)</div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Station</th>
                      <th className="py-1 pr-3 font-medium">FP Rate</th>
                      <th className="py-1 font-medium">Clinical Note</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["External iliac", "90%", "text-emerald-500", "Predominantly reactive nodes in low-grade patients"],
                      ["Inguinal", "70%", "text-emerald-500", "Often reactive"],
                      ["Common iliac", "50%", "text-amber-500", "Moderate concern, check SUVmax"],
                      ["Presacral", "30%", "text-amber-500", "Moderate concern"],
                      ["Obturator", "25%", "", "Clinically significant when positive"],
                      ["Internal iliac", "20%", "text-red-500", "High clinical significance"],
                      ["Perirectal", "15%", "text-red-500", "Rare but highly concerning"],
                    ].map(([station, fp, cls, note]) => (
                      <tr key={station} className="border-b border-border/40">
                        <td className="py-1 pr-3">{station}</td>
                        <td className={`py-1 pr-3 font-semibold tabular-nums ${cls}`}>{fp}</td>
                        <td className="py-1">{note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 overflow-x-auto">
                <div className="mb-1 text-[10px] font-semibold text-muted-foreground">SUVmax Interpretation for PSMA LN+</div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">LN SUVmax</th>
                      <th className="py-1 font-medium">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/40"><td className="py-1 pr-3 tabular-nums">&lt; 3.5</td><td className="py-1 text-emerald-500">Likely reactive / false positive</td></tr>
                    <tr className="border-b border-border/40"><td className="py-1 pr-3 tabular-nums">3.5 – 6.0</td><td className="py-1 text-amber-500">Indeterminate</td></tr>
                    <tr className="border-b border-border/40"><td className="py-1 pr-3 tabular-nums">&gt; 6.0</td><td className="py-1 text-red-500">Likely true positive</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">Decipher Genomic Classifier</h2>
              <p className="text-muted-foreground text-[11px] mb-2">N=1,845 patients (34%) have Decipher scores (mean 0.521). Incorporated via mean-imputation + availability flag.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Decipher Risk</th>
                      <th className="py-1 pr-3 font-medium">N</th>
                      <th className="py-1 pr-3 font-medium">ECE</th>
                      <th className="py-1 pr-3 font-medium">SVI</th>
                      <th className="py-1 pr-3 font-medium">BCR</th>
                      <th className="py-1 font-medium">LNI</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["Low (<0.45)", "821", "25.0%", "6.3%", "9.6%", "2.1%", ""],
                      ["Intermediate (0.45–0.60)", "302", "34.3%", "11.3%", "17.3%", "3.5%", ""],
                      ["High (≥0.60)", "722", "55.5%", "25.4%", "29.3%", "16.0%", "text-red-500 font-semibold"],
                    ].map(([risk, n, ece, svi, bcr, lni, cls]) => (
                      <tr key={risk} className={`border-b border-border/40 ${cls}`}>
                        <td className="py-1 pr-3">{risk}</td>
                        <td className="py-1 pr-3 tabular-nums">{n}</td>
                        <td className="py-1 pr-3 tabular-nums">{ece}</td>
                        <td className="py-1 pr-3 tabular-nums">{svi}</td>
                        <td className="py-1 pr-3 tabular-nums">{bcr}</td>
                        <td className="py-1 tabular-nums">{lni}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">Surgical Alerts</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Alert</th>
                      <th className="py-1 pr-3 font-medium">Trigger</th>
                      <th className="py-1 font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["PSMA+ at Base", "PSMA lesion at base + base ECE ≥8%", "43.6% path ECE (N=55)"],
                      ["PSMA SVI Positive", "PSMA SVI = Yes", "76.9% path SVI (10/13)"],
                      ["Apical ECE", "Apex ECE ≥10%", "Apical dissection caution"],
                      ["Bladder Neck ECE", "BN ECE ≥10%", "Wider BN margin"],
                      ["NVB Threatened", "Posterolateral ≥15%", "PNVB at risk"],
                    ].map(([alert, trigger, evidence]) => (
                      <tr key={alert} className="border-b border-border/40">
                        <td className="py-1 pr-3 font-medium text-amber-500">{alert}</td>
                        <td className="py-1 pr-3">{trigger}</td>
                        <td className="py-1">{evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold uppercase tracking-wide text-primary mb-2">Known Limitations</h2>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                <li>Single institution (Mount Sinai). External validation in progress.</li>
                <li>PSM depends heavily on surgical technique.</li>
                <li>BCR follow-up is maturing (60% complete).</li>
                <li>Predictions are decision support, not substitutes for clinical judgment.</li>
              </ul>
              <p className="mt-4 text-[10px] text-muted-foreground">
                COMPASS v22 · 9 prediction models · Lateralized ECE + SVI + Focal/Extensive ECE · PLND Decision Module (N=664) · Trimodal + Decipher · March 2026 · Mount Sinai Health System
              </p>
            </section>
          </div>
        </div>
      )}

      {caseLogOpen && (
        <CaseLog onClose={() => setCaseLogOpen(false)} />
      )}

      {explainKey && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="mb-2 text-sm font-semibold text-primary">
              Explain prediction
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {PREDICTION_EXPLANATIONS[explainKey] ?? "No description."}
            </p>
            <Button
              type="button"
              className="mt-4"
              variant="secondary"
              onClick={() => setExplainKey(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
