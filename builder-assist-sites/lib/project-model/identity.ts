import type { Geometry2D } from "./contracts";

function roundNumber(value: number, precision: number) {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function canonicalValue(value: unknown, precision: number): unknown {
  if (typeof value === "number") return roundNumber(value, precision);
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item, precision));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item, precision)]),
    );
  }
  return value;
}

function canonicalPoints(points: Array<[number, number]>, precision: number) {
  const forward = points.map(([x, y]) => [roundNumber(x, precision), roundNumber(y, precision)] as [number, number]);
  const reverse = [...forward].reverse();
  return JSON.stringify(forward) <= JSON.stringify(reverse) ? forward : reverse;
}

export function canonicalGeometry(geometry: Geometry2D, precision = 6): Geometry2D {
  if (geometry.type === "point") {
    return { type: "point", point: geometry.point.map((value) => roundNumber(value, precision)) as [number, number] };
  }
  return { ...geometry, points: canonicalPoints(geometry.points, precision) };
}

export async function deterministicElementId(input: {
  projectId: string;
  sourceChecksum: string;
  sheetId?: string;
  viewportId?: string;
  category: string;
  geometry: Geometry2D;
  sourceReferenceIds: string[];
  precision?: number;
}) {
  const precision = input.precision ?? 6;
  const payload = canonicalValue({
    projectId: input.projectId,
    sourceChecksum: input.sourceChecksum,
    sheetId: input.sheetId ?? null,
    viewportId: input.viewportId ?? null,
    category: input.category,
    geometry: canonicalGeometry(input.geometry, precision),
    sourceReferenceIds: [...input.sourceReferenceIds].sort(),
  }, precision);
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `elm_${hex.slice(0, 32)}`;
}
