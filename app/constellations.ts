import skyData from "./zodiac-data.json";

// Figure topology follows Stellarium Modern sky culture; HIP J2000 positions are derived from HYG 4.1.

export type SkyPoint = { id: string; x: number; y: number; mag?: number };
export type SkyConstellation = { id: string; th: string; en: string; symbol: string; points: SkyPoint[]; edges: [string, string][] };

const META = [
  ["aries", "ราศีเมษ", "ARIES", "♈"],
  ["taurus", "ราศีพฤษภ", "TAURUS", "♉"],
  ["gemini", "ราศีเมถุน", "GEMINI", "♊"],
  ["cancer", "ราศีกรกฎ", "CANCER", "♋"],
  ["leo", "ราศีสิงห์", "LEO", "♌"],
  ["virgo", "ราศีกันย์", "VIRGO", "♍"],
  ["libra", "ราศีตุล", "LIBRA", "♎"],
  ["scorpius", "ราศีพิจิก", "SCORPIUS", "♏"],
  ["sagittarius", "ราศีธนู", "SAGITTARIUS", "♐"],
  ["capricornus", "ราศีมกร", "CAPRICORNUS", "♑"],
  ["aquarius", "ราศีกุมภ์", "AQUARIUS", "♒"],
  ["pisces", "ราศีมีน", "PISCES", "♓"],
] as const;

type RawSkyData = Record<string, { points: SkyPoint[]; edges: [string, string][] }>;
const raw = skyData as RawSkyData;
export const ZODIAC: SkyConstellation[] = META.map(([id, th, en, symbol]) => ({ id, th, en, symbol, points: raw[id].points, edges: raw[id].edges }));
