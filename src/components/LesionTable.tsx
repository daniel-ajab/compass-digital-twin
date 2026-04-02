import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePatientStore } from "@/store/patientStore";
import type { LesionRow } from "@/types/lesion";

const SOURCES = ["MRI", "MUS", "PSMA", "Bx", "ExactVu"] as const;
const SIDES = ["L", "R"] as const;
const LEVELS = ["", "Base", "Mid", "Apex"] as const;
const POSITIONS = [
  "",
  "Anterior",
  "Posterior",
  "Posterolateral",
  "Medial",
  "Lateral",
] as const;

const selectCls =
  "h-9 w-full rounded-lg border border-input/90 bg-background px-2 text-xs shadow-sm transition-[box-shadow,border-color] focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:border-input";

function updateRow(
  rows: LesionRow[],
  id: string,
  patch: Partial<LesionRow>,
): LesionRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export function LesionTable() {
  const patients = usePatientStore((s) => s.patients);
  const activeId = usePatientStore((s) => s.activeId);
  const updateLesionRows = usePatientStore((s) => s.updateLesionRows);
  const addLesion = usePatientStore((s) => s.addLesion);
  const removeLesion = usePatientStore((s) => s.removeLesion);
  const pushHistory = usePatientStore((s) => s.pushHistory);

  const entry = patients.find((p) => p.id === activeId);
  if (!entry) return null;

  const rows = entry.lesionRows;

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b border-border/50 bg-gradient-to-br from-muted/40 to-transparent pb-3 dark:from-muted/25">
        <CardTitle className="text-sm font-semibold text-foreground">Lesions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Scroll horizontally on small screens. Edits apply immediately.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 overflow-x-auto overscroll-x-contain pt-4 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border/80 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="p-1">Src</th>
              <th className="p-1">Side</th>
              <th className="p-1">Lvl</th>
              <th className="p-1">Pos</th>
              <th className="p-1">Scr</th>
              <th className="p-1">EPE</th>
              <th className="p-1">mm</th>
              <th className="p-1">Ab</th>
              <th className="p-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-1">
                  <select
                    className={selectCls}
                    value={r.source}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, {
                          source: e.target.value as LesionRow["source"],
                        }),
                      );
                    }}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <select
                    className={selectCls}
                    value={r.side}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, {
                          side: e.target.value as LesionRow["side"],
                        }),
                      );
                    }}
                  >
                    {SIDES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <select
                    className={selectCls}
                    value={r.level}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, {
                          level: e.target.value as LesionRow["level"],
                        }),
                      );
                    }}
                  >
                    {LEVELS.map((s) => (
                      <option key={s || "—"} value={s}>
                        {s || "—"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <select
                    className={selectCls}
                    value={r.zone}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, { zone: e.target.value }),
                      );
                    }}
                  >
                    {POSITIONS.map((s) => (
                      <option key={s || "—"} value={s}>
                        {s || "—"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <Input
                    className="h-9 px-2 text-xs"
                    value={r.score}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, { score: e.target.value }),
                      );
                    }}
                  />
                </td>
                <td className="p-1 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={r.epe}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, { epe: e.target.checked }),
                      );
                    }}
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    className="h-9 px-2 text-xs"
                    value={r.mriSize || ""}
                    onChange={(e) => {
                      updateLesionRows(
                        updateRow(rows, r.id, {
                          mriSize: parseFloat(e.target.value) || 0,
                        }),
                      );
                    }}
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    className="h-9 px-2 text-xs"
                    value={r.mriAbutment >= 0 ? r.mriAbutment : ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      updateLesionRows(
                        updateRow(rows, r.id, {
                          mriAbutment: Number.isNaN(v) ? -1 : v,
                        }),
                      );
                    }}
                  />
                </td>
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      removeLesion(r.id);
                      pushHistory();
                    }}
                  >
                    ×
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-9 w-full text-xs sm:w-auto"
          onClick={() => {
            addLesion();
            pushHistory();
          }}
        >
          + Add lesion
        </Button>
      </CardContent>
    </Card>
  );
}
