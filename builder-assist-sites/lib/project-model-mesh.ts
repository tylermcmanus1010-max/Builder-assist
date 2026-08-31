import type { BuildingElement, ProjectModel } from "./project-model.ts";
import { validateProjectModel } from "./project-model.ts";

export type WallMeshDescriptor = {
  elementId: string; projectId: string; revisionId: string; sheetId: string; sourceGeometryId: string;
  size: { length: number; height: number; thickness: number };
  position: { x: number; y: number; z: number };
  rotationY: number;
};

export function wallMeshDescriptor(element: BuildingElement, levelElevation: number): WallMeshDescriptor | null {
  if (element.category !== "wall" || element.geometry.kind !== "centerline" || element.reviewStatus !== "approved") return null;
  const { start, end } = element.geometry;
  const { length, height, thickness } = element.dimensions;
  if (![start.x, start.y, end.x, end.y, length, height, thickness, levelElevation].every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  if (length <= 0 || !height || height <= 0 || !thickness || thickness <= 0) return null;
  const geometryLength = Math.hypot(end.x - start.x, end.y - start.y);
  if (Math.abs(geometryLength - length) > Math.max(.001, length * .001)) return null;
  return {
    elementId: element.elementId, projectId: element.projectId, revisionId: element.revisionId,
    sheetId: element.sheetId, sourceGeometryId: element.sourceGeometryId,
    size: { length, height, thickness },
    position: { x: (start.x + end.x) / 2, y: levelElevation + height / 2, z: (start.y + end.y) / 2 },
    rotationY: -Math.atan2(end.y - start.y, end.x - start.x),
  };
}

export function projectModelMeshDescriptors(value: ProjectModel) {
  const model = validateProjectModel(value);
  const levels = new Map(model.levels.filter((level) => level.revisionId === model.activeRevisionId).map((level) => [level.levelId, level]));
  return model.buildingElements.filter((element) => element.projectId === model.projectId && element.revisionId === model.activeRevisionId).map((element) => {
    const level = levels.get(element.levelId);
    return level ? wallMeshDescriptor(element, level.elevation) : null;
  }).filter((descriptor): descriptor is WallMeshDescriptor => descriptor !== null);
}
