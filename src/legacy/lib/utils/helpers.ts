const LEFT_COMPASS_ZONES = new Set<string>([
  "1a",
  "2a",
  "3a",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "SV-L",
]);

/** Map lesion zone key to L/R when explicit side missing */
export function zoneKeyToSide(zone: string | undefined): "L" | "R" | null {
  if (!zone) return null;
  if (zone === "SV-L") return "L";
  if (zone === "SV-R") return "R";
  if (LEFT_COMPASS_ZONES.has(zone)) return "L";
  return "R";
}
