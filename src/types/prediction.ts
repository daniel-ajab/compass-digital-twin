export type OverlayType = "cancer" | "ece" | "svi" | "psm";

export interface NsAlert {
  type: string;
  severity: "high" | "moderate";
  message: string;
}

export interface NsSideDetail {
  nsGrade: number;
  reason: string;
  alerts: NsAlert[];
  zones: Record<string, number>;
  svi: number;
  has_zone_data: boolean;
}

export interface CompassPredictions {
  ece: number;
  svi: number;
  upgrade: number;
  psm: number;
  bcr: number;
  lni: number;
  extensive: number;
  nsL: number;
  nsR: number;
  eceL: number;
  eceR: number;
  sviL: number;
  sviR: number;
  nsDetailL: NsSideDetail;
  nsDetailR: NsSideDetail;
}

export interface PlndRecommendation {
  title: string;
  detail: string;
  tone: "success" | "warning" | "danger";
  icon: string;
}

export interface ThreeZoneRuntime {
  id: string;
  name: string;
  side: string;
  level: string;
  region: string;
  subregion: string;
  cancer: number;
  ece: number;
  svi: number;
  psm: number;
}
