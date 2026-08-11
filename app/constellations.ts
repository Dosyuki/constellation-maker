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
const h = (id: number) => `hip${id}`;
const SIMPLE_LINES: Record<string, number[][]> = {
  aries: [[13209, 9884, 8903, 8832]],
  taurus: [[25428, 21881, 20889], [21421, 26451], [20205, 20455], [20205, 15900], [21421, 20889], [21421, 20205], [20889, 20455, 17847]],
  gemini: [[31681, 35550, 32362], [35550, 36962, 37740], [36962, 37826], [36962, 34693, 36850], [34693, 33018], [34693, 32246, 28734], [32246, 29655, 28734]],
  cancer: [[43103, 42806, 40843], [42806, 42911, 40526], [42911, 44066]],
  leo: [[57632, 54879, 49669, 50583, 54872, 57632], [50583, 48455, 47908], [54872, 54879]],
  virgo: [[57380, 61941, 65474, 69701, 71957], [65474, 66249, 72220], [66249, 63090, 63608], [63090, 61941]],
  libra: [[77853, 76333, 74785, 72622, 73714, 76333]],
  scorpius: [[85927, 87073, 84143, 82514, 81266, 80763, 78401], [80763, 78265], [80763, 78820]],
  sagittarius: [[89642, 88635, 87072], [88635, 89931, 90185, 93506, 92041, 89931], [92041, 90496, 89341], [93506, 93864, 92855, 92041]],
  capricornus: [[100064, 100345, 104139, 105515, 107556], [105515, 105881, 104139], [100345, 102485], [104139, 102978]],
  aquarius: [[106278, 109074, 110395, 111497, 112961, 115438], [109074, 110003, 109139], [110003, 111123, 113136, 114341], [102618, 106278]],
  pisces: [[4889, 5742], [4889, 5742, 8198, 9487, 7007, 3760, 118268, 117245, 115738, 115227, 116771]],
};

export const ZODIAC_SIMPLIFIED: SkyConstellation[] = META.map(([id, th, en, symbol]) => {
  const lines = SIMPLE_LINES[id];
  const ids = new Set(lines.flat().map(h));
  return { id, th, en, symbol, points: raw[id].points.filter((point) => ids.has(point.id)), edges: lines.flatMap((line) => line.slice(1).map((star, index) => [h(line[index]), h(star)] as [string, string])) };
});
