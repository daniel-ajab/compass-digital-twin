import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";
import { deriveClinicalFromLesions, lesionsFromRows } from "@/lib/utils/normalization";
import { clinicalStateFromRecord } from "./clinicalFromRecord";

export function printReport() {
  const { patients, activeId, predictions, threeZones } =
    usePatientStore.getState();
  const { overlay } = useUiStore.getState();

  const entry = patients.find((p) => p.id === activeId);
  if (!entry || !predictions) {
    alert("No patient data loaded.");
    return;
  }

  const record = { ...entry.record, lesions: entry.lesionRows };
  const S = deriveClinicalFromLesions(
    clinicalStateFromRecord(record),
    lesionsFromRows(entry.lesionRows),
  );

  const pct = (v: number) => Math.round(v * 100) + "%";
  const rk = (v: number) =>
    v < 0.15 ? "#228B22" : v < 0.3 ? "#DAA520" : "#DC143C";

  // ── Patient summary ──
  let patHtml = `<table><tr><th>PSA</th><th>Volume</th><th>PSAD</th><th>GG</th><th>Cores</th><th>PI-RADS</th><th>Laterality</th></tr>`;
  patHtml += `<tr><td>${S.psa}</td><td>${S.vol} cc</td><td>${S.psad.toFixed(3)}</td>`;
  patHtml += `<td>${S.gg}</td><td>${S.cores}</td><td>${S.pirads}</td><td>${S.laterality}</td></tr></table>`;

  const abLabels: Record<string, string> = {
    "-1": "N/A",
    "0": "No contact",
    "1": "Abuts",
    "2": "Abuts-broad",
    "3": "Irregular",
    "4": "Bulge",
  };
  const hasMriDetail = S.mri_size > 0 || S.mri_abutment >= 0 || S.mri_adc > 0;
  if (hasMriDetail) {
    patHtml += `<table style="margin-top:4px"><tr><th>MRI Size</th><th>Abutment</th><th>ADC Mean</th><th>MRI EPE</th><th>MRI SVI</th></tr>`;
    patHtml += `<tr><td>${S.mri_size > 0 ? (S.mri_size * 10).toFixed(0) + " mm" : "--"}</td>`;
    patHtml += `<td>${abLabels[String(S.mri_abutment)] ?? "--"}</td>`;
    patHtml += `<td>${S.mri_adc > 0 ? S.mri_adc : "--"}</td>`;
    patHtml += `<td>${S.mri_epe ? "Yes" : "No"}</td>`;
    patHtml += `<td>${S.mri_svi ? "Yes" : "No"}</td></tr></table>`;
  }

  // ── Predictions ──
  let predHtml = `<table><tr><th>ECE</th><th>SVI</th><th>Upgrade</th><th>PSM</th><th>BCR</th><th>LNI</th></tr><tr>`;
  const predItems = [
    { v: predictions.ece },
    { v: predictions.svi },
    { v: predictions.upgrade },
    { v: predictions.psm },
    { v: predictions.bcr },
    { v: predictions.lni },
  ];
  predItems.forEach((p) => {
    predHtml += `<td style="color:${rk(p.v)};font-weight:700;font-size:14px">${pct(p.v)}</td>`;
  });
  predHtml += `</tr></table>`;

  // ── NS 5-zone ──
  const L = predictions.nsDetailL;
  const R = predictions.nsDetailR;
  let nsHtml = `<table><tr><th></th><th>Left</th><th>Right</th></tr>`;
  nsHtml += `<tr><td><b>Side ECE</b></td><td style="color:${rk(predictions.eceL)};font-weight:700">${pct(predictions.eceL)}</td><td style="color:${rk(predictions.eceR)};font-weight:700">${pct(predictions.eceR)}</td></tr>`;

  const zones5 = [
    { k: "posterolateral", l: "Posterolateral" },
    { k: "base", l: "Base" },
    { k: "apex", l: "Apex" },
    { k: "anterior", l: "Anterior" },
    { k: "bladder_neck", l: "Bladder Neck" },
  ];
  zones5.forEach(({ k, l: label }) => {
    const lv = L.zones[k] ?? 0;
    const rv = R.zones[k] ?? 0;
    const lStr = L.has_zone_data
      ? lv > 0 && lv < 0.005
        ? "< 1%"
        : pct(lv)
      : "—";
    const rStr = R.has_zone_data
      ? rv > 0 && rv < 0.005
        ? "< 1%"
        : pct(rv)
      : "—";
    nsHtml += `<tr><td>${label}</td><td>${lStr}</td><td>${rStr}</td></tr>`;
  });
  nsHtml += `<tr><td><b>NS Grade</b></td><td style="font-weight:700">Grade ${predictions.nsL}</td><td style="font-weight:700">Grade ${predictions.nsR}</td></tr>`;
  nsHtml += `</table>`;

  // Alerts
  let alertHtml = "";
  const allAlerts: string[] = [];
  L.alerts.forEach((a) => allAlerts.push("L " + a.message));
  R.alerts.forEach((a) => allAlerts.push("R " + a.message));
  if (allAlerts.length > 0) {
    alertHtml = `<div style="margin:6px 0;font-size:11px">`;
    allAlerts.forEach((a) => {
      alertHtml += `<div style="color:#DC143C;padding:2px 0">⚠ ${a}</div>`;
    });
    alertHtml += `</div>`;
  }

  // ── Zone grid (replaces 3D model in print) ──
  const overlayName: Record<string, string> = {
    cancer: "Cancer Probability",
    ece: "ECE Risk",
    svi: "SVI Risk",
    psm: "PSM Risk",
  };
  let zoneHtml = `<h2>${overlayName[overlay] ?? overlay} by Zone</h2>`;
  zoneHtml += `<div style="font-size:10px;color:#666;margin-bottom:6px">Posterior Zones</div>`;

  const zoneRows = [
    {
      label: "Base",
      zones: [
        { id: "P-LB-L", l: "L Base Lat" },
        { id: "P-LB-M", l: "L Base Med" },
        { id: "P-RB-M", l: "R Base Med" },
        { id: "P-RB-L", l: "R Base Lat" },
      ],
    },
    {
      label: "Mid",
      zones: [
        { id: "P-LM-L", l: "L Mid Lat" },
        { id: "P-LM-M", l: "L Mid Med" },
        { id: "P-RM-M", l: "R Mid Med" },
        { id: "P-RM-L", l: "R Mid Lat" },
      ],
    },
    {
      label: "Apex",
      zones: [
        { id: "P-LA", l: "L Apex" },
        { id: "", l: "" },
        { id: "", l: "" },
        { id: "P-RA", l: "R Apex" },
      ],
    },
  ];

  zoneHtml += `<table style="border:1px solid #000"><tr><th></th><th colspan="2" style="text-align:center;border-bottom:1px solid #000">Left</th><th colspan="2" style="text-align:center;border-bottom:1px solid #000">Right</th></tr>`;
  zoneRows.forEach(({ label, zones }) => {
    zoneHtml += `<tr><td style="font-weight:700;padding:4px 8px">${label}</td>`;
    zones.forEach(({ id, l }) => {
      if (!id) {
        zoneHtml += `<td style="background:#f8f8f8;border:0.5px solid #ddd"></td>`;
        return;
      }
      const zone3d = threeZones.find((z) => z.id === id);
      const val = zone3d
        ? ((zone3d as unknown as Record<string, number>)[overlay] ?? 0.02)
        : 0.02;
      const bg =
        val < 0.1
          ? "#f0f9f0"
          : val < 0.25
            ? "#fef9e7"
            : val < 0.5
              ? "#fdedec"
              : "#f5b7b1";
      const color =
        val < 0.1 ? "#228B22" : val < 0.3 ? "#DAA520" : "#DC143C";
      const shortLabel = l.split(" ").slice(1).join(" ");
      zoneHtml += `<td style="text-align:center;padding:4px;background:${bg};border:0.5px solid #ccc;font-size:11px"><div style="font-weight:700;font-size:10px">${shortLabel}</div><div style="color:${color};font-weight:700">${Math.round(val * 100)}%</div></td>`;
    });
    zoneHtml += `</tr>`;
  });
  zoneHtml += `</table>`;

  // ── Lesions ──
  let lesHtml = "";
  if (entry.lesionRows.length > 0) {
    lesHtml = `<h2>Lesion Data</h2><table><tr><th>Source</th><th>Side</th><th>Level</th><th>Position</th><th>Score</th><th>Core%</th><th>Linear</th><th>EPE</th></tr>`;
    entry.lesionRows.forEach((l) => {
      const isBx = l.source === "Bx";
      lesHtml += `<tr><td style="font-weight:700">${l.source}</td><td>${l.side}</td><td>${l.level}</td><td>${l.zone}</td>`;
      lesHtml += `<td>${l.score}</td>`;
      lesHtml += `<td>${isBx && l.corePct ? l.corePct + "%" : ""}</td>`;
      lesHtml += `<td>${isBx && l.linear ? l.linear + "mm" : ""}</td>`;
      lesHtml += `<td>${l.epe ? "Yes" : "No"}</td></tr>`;
    });
    lesHtml += `</table>`;
  }

  // ── PLND ──
  let plndHtml = `<table><tr><th>LNI Risk</th><th>NCCN Risk</th><th>PSMA LN</th><th>Decision</th></tr>`;
  plndHtml += `<tr><td>${pct(predictions.lni)}</td>`;
  plndHtml += `<td>${S.gg >= 4 || S.psa >= 20 ? "High" : "Non-High"}</td>`;
  plndHtml += `<td>${S.psma_ln ? "Positive" : "Negative"}</td>`;
  plndHtml += `<td style="font-weight:700">${predictions.lni >= 0.05 ? "Perform PLND" : "Consider Omitting"}</td></tr></table>`;

  // ── Open print window ──
  const w = window.open("", "_blank");
  if (!w) {
    alert("Pop-up blocked. Please allow pop-ups for this site.");
    return;
  }

  w.document.write(`<!DOCTYPE html><html><head><title>COMPASS Report</title><style>`);
  w.document.write(`body{font-family:"Times New Roman",Georgia,serif;padding:24px;color:#000;max-width:800px;margin:0 auto;line-height:1.5}`);
  w.document.write(`h1{font-size:16px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:16px;text-transform:uppercase;letter-spacing:2px}`);
  w.document.write(`h2{font-size:13px;text-transform:uppercase;border-bottom:1px solid #666;padding-bottom:3px;margin:18px 0 8px;letter-spacing:1px}`);
  w.document.write(`table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:12px}`);
  w.document.write(`th{text-align:left;font-weight:700;padding:4px 8px;border-bottom:1.5px solid #000;font-size:11px}`);
  w.document.write(`td{padding:3px 8px;border-bottom:0.5px solid #ccc}`);
  w.document.write(`.print-btn{display:block;margin:20px auto;padding:8px 30px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600}`);
  w.document.write(`@media print{.print-btn{display:none}}`);
  w.document.write(`</style></head><body>`);
  w.document.write(`<h1>COMPASS — Surgical Planning Report</h1>`);
  w.document.write(`<div style="text-align:center;font-size:11px;color:#666;margin-bottom:16px">${new Date().toLocaleDateString()}</div>`);
  w.document.write(`<h2>Patient</h2>${patHtml}`);
  w.document.write(`<h2>COMPASS Predictions</h2>${predHtml}`);
  w.document.write(`<h2>Nerve Sparing — 5-Zone</h2>${nsHtml}${alertHtml}`);
  w.document.write(zoneHtml);
  w.document.write(`<h2>PLND Decision</h2>${plndHtml}`);
  w.document.write(lesHtml);
  w.document.write(`<button class="print-btn" onclick="window.print()">Print</button>`);
  w.document.write(`</body></html>`);
  w.document.close();
}
