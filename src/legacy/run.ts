// Runs the original (v22, May 13) engine on a case, exactly as the May store's
// recompute() did: record → ClinicalState → zone map → models + 3D zones.
// Everything here comes from the copied May code in src/legacy.
import { createDefaultZones, createBaseThreeZones } from "@/legacy/lib/compass/constants";
import { clinicalStateFromRecord } from "@/legacy/lib/compass/clinicalFromRecord";
import { mapLesionsToZones } from "@/legacy/lib/compass/lesionZones";
import { runCompassModels } from "@/legacy/lib/compass/runCompass";
import { deriveClinicalFromLesions, lesionsFromRows } from "@/legacy/lib/utils/normalization";
import type { Prostate3DInputV1, ZoneMap } from "@/legacy/types/patient";
import type { LesionRow } from "@/legacy/types/lesion";
import type { CompassPredictions, ThreeZoneRuntime } from "@/legacy/types/prediction";

export type LegacyPredictions = CompassPredictions;

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function mergeZones(base: ZoneMap): ZoneMap {
  const d = createDefaultZones();
  const out: ZoneMap = { ...d };
  for (const k of Object.keys(d)) {
    const key = k as keyof ZoneMap;
    if (base[key]) out[key] = { ...d[key], ...base[key] };
  }
  return out;
}

/** The case record and lesion rows use the same JSON schema in both engines. */
export function runLegacy(
  recordIn: unknown,
  lesionRowsIn: unknown[],
): { predictions: LegacyPredictions; threeZones: ThreeZoneRuntime[] } {
  const lesionRows = lesionRowsIn as LesionRow[];
  const record = clone(recordIn as Prostate3DInputV1);
  record.zones = mergeZones(record.zones || ({} as ZoneMap));
  record.lesions = lesionRows;
  const S0 = clinicalStateFromRecord(record);
  const S = deriveClinicalFromLesions(S0, lesionsFromRows(lesionRows));
  mapLesionsToZones(record.zones, lesionRows, S);
  const working: Prostate3DInputV1 = { ...record, zones: record.zones };
  const threeZones = clone(createBaseThreeZones());
  const predictions = runCompassModels(S, working, lesionRows, threeZones);
  return { predictions, threeZones };
}
