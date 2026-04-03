import { useRef } from "react";
import { useThreeProstate } from "@/hooks/useThreeProstate";
import {
  medianLobeFromRecord,
  prostateDimsFromRecord,
  volumeScaleFromRecord,
} from "@/lib/compass/dimensions";
import { usePatientStore } from "@/store/patientStore";
import { useUiStore } from "@/store/uiStore";

export function ThreeCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const threeZones = usePatientStore((s) => s.threeZones);
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const entry = patients.find((p) => p.id === activeId);
  const overlay = useUiStore((s) => s.overlay);
  const heatmapVisible = useUiStore((s) => s.heatmapVisible);
  const lesionsOnly = useUiStore((s) => s.lesionsOnly);

  const dims = entry ? prostateDimsFromRecord(entry.record) : { ap: 1, tr: 1.15, cc: 0.82 };
  const volScale = entry ? volumeScaleFromRecord(entry.record) : 1;
  const mlobe = entry ? medianLobeFromRecord(entry.record) : 0;

  useThreeProstate(
    ref,
    threeZones,
    overlay,
    dims,
    mlobe,
    volScale,
    heatmapVisible,
    lesionsOnly,
  );

  return (
    <div
      ref={ref}
      className="h-full min-h-[320px] w-full"
      style={{ background: "radial-gradient(ellipse at 50% 35%, #1a2540 0%, #0d1220 55%, #080b14 100%)" }}
      role="img"
      aria-label="3D prostate digital twin"
    />
  );
}
