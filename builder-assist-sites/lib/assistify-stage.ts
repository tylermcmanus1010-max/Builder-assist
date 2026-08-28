export function clampConstructionStage(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(12, Math.max(1, Math.round(parsed))) : 1;
}

export function isObjectVisibleForStage(objectStage: number, selectedStage: number, cumulative: boolean) {
  const stage = clampConstructionStage(selectedStage);
  if (stage === 12) return objectStage >= 1 && objectStage <= 11;
  return cumulative ? objectStage >= 1 && objectStage <= stage : objectStage === stage;
}

export function restoreViewerPreference(value: string | null) {
  try {
    const parsed = JSON.parse(value || "{}");
    return { stage: clampConstructionStage(parsed.stage), cumulative: parsed.cumulative !== false };
  } catch {
    return { stage: 1, cumulative: true };
  }
}
