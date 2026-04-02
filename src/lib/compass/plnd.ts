import type { PlndRecommendation } from "@/types/prediction";

export function computePlndRecommendation(
  psa: number,
  gg: number,
  psmaLn: number,
  lniRisk: number,
): PlndRecommendation {
  const isHighRisk = gg >= 4 || psa > 20;
  if (!isHighRisk && !psmaLn) {
    return {
      title: "Consider omitting PLND",
      detail: `Non–high-risk, PSMA LN negative. Zero false negatives in this group (N=664). LNI risk ${Math.round(lniRisk * 100)}%.`,
      tone: "success",
      icon: "✓",
    };
  }
  if (!isHighRisk && psmaLn) {
    return {
      title: "Limited PLND",
      detail:
        "Non–high-risk but PSMA LN+. Low PPV — many PSMA LN+ cases are false positive. Consider limited PLND at PSMA-avid stations.",
      tone: "warning",
      icon: "⚠",
    };
  }
  if (isHighRisk && !psmaLn) {
    return {
      title: "Extended PLND recommended",
      detail:
        "NCCN high-risk with negative PSMA. ~12% occult LNI; negative PSMA should not be used to omit PLND.",
      tone: "warning",
      icon: "⚠",
    };
  }
  return {
    title: "Extended PLND — high priority",
    detail:
      "NCCN high-risk with PSMA LN+. Highest LNI probability; ePLND mandatory. Review SUVmax and nodal station.",
    tone: "danger",
    icon: "⚡",
  };
}
