export type ParsedScale = {
  kind: "ratio" | "architectural" | "civil" | "full_size" | "half_size" | "nts";
  rawText: string;
  denominator: number | null;
  viewportId: string;
  confidence: number;
  requiresCalibration: boolean;
};

function fraction(value: string) {
  const normalized = value.trim();
  if (normalized.includes(" ")) {
    const [whole, part] = normalized.split(/\s+/, 2);
    return Number(whole) + fraction(part);
  }
  if (normalized.includes("/")) {
    const [top, bottom] = normalized.split("/", 2).map(Number);
    return bottom ? top / bottom : Number.NaN;
  }
  return Number(normalized);
}

export function parseScaleLabel(rawText: string, viewportId: string): ParsedScale | null {
  const text = rawText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').trim();
  if (/\b(?:N\.?T\.?S\.?|NOT\s+TO\s+SCALE)\b/i.test(text)) {
    return { kind: "nts", rawText, denominator: null, viewportId, confidence: 0.99, requiresCalibration: true };
  }
  if (/\bFULL\s+SIZE\b/i.test(text)) {
    return { kind: "full_size", rawText, denominator: 1, viewportId, confidence: 0.9, requiresCalibration: false };
  }
  if (/\bHALF\s+SIZE\b/i.test(text)) {
    return { kind: "half_size", rawText, denominator: 2, viewportId, confidence: 0.85, requiresCalibration: false };
  }
  const ratio = text.match(/(?:^|\b)1\s*:\s*(\d+(?:\.\d+)?)(?:\b|$)/);
  if (ratio) {
    return { kind: "ratio", rawText, denominator: Number(ratio[1]), viewportId, confidence: 0.98, requiresCalibration: false };
  }
  const imperial = text.match(/(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*"?\s*=\s*(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*'(?:\s*-?\s*(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*")?/);
  if (!imperial) return null;
  const drawingInches = fraction(imperial[1]);
  const realInches = fraction(imperial[2]) * 12 + (imperial[3] ? fraction(imperial[3]) : 0);
  if (!(drawingInches > 0) || !(realInches > 0)) return null;
  const isCivil = drawingInches >= 1 && realInches >= 120;
  return {
    kind: isCivil ? "civil" : "architectural",
    rawText,
    denominator: realInches / drawingInches,
    viewportId,
    confidence: 0.96,
    requiresCalibration: false,
  };
}
