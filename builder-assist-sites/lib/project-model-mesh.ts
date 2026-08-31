import type { BuildingElement, ProjectModel } from "./project-model.ts";
import { validateProjectModel } from "./project-model.ts";

export type WallMeshDescriptor = {
  elementId: string; projectId: string; revisionId: string; sheetId: string; sourceGeometryId: string;
  size: { length: number; height: number; thickness: number };
  position: { x: number; y: number; z: number };
  rotationY: number;
};

function descriptorFor(element: BuildingElement, levelElevation: number, reviewStatus: BuildingElement["reviewStatus"]): WallMeshDescriptor | null {
  if (element.category !== "wall" || element.geometry.kind !== "centerline" || element.reviewStatus !== reviewStatus) return null;
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

export function wallMeshDescriptor(element: BuildingElement, levelElevation: number): WallMeshDescriptor | null {
  return descriptorFor(element, levelElevation, "approved");
}

export function projectModelMeshDescriptors(value: ProjectModel) {
  const model = validateProjectModel(value);
  const levels = new Map(model.levels.filter((level) => level.revisionId === model.activeRevisionId).map((level) => [level.levelId, level]));
  return model.buildingElements.filter((element) => element.projectId === model.projectId && element.revisionId === model.activeRevisionId).map((element) => {
    const level = levels.get(element.levelId);
    return level ? wallMeshDescriptor(element, level.elevation) : null;
  }).filter((descriptor): descriptor is WallMeshDescriptor => descriptor !== null);
}

// Preliminary walls render separately from approved geometry so the model is
// visible immediately after extraction, in a clearly labeled unconfirmed style.
// They are never returned by projectModelMeshDescriptors and never claim the
// approved review state.
export function preliminaryWallMeshDescriptors(value: ProjectModel) {
  const model = validateProjectModel(value);
  const levels = new Map(model.levels.filter((level) => level.revisionId === model.activeRevisionId).map((level) => [level.levelId, level]));
  return model.buildingElements.filter((element) => element.projectId === model.projectId && element.revisionId === model.activeRevisionId).map((element) => {
    const level = levels.get(element.levelId);
    return level ? descriptorFor(element, level.elevation, "requires_review") : null;
  }).filter((descriptor): descriptor is WallMeshDescriptor => descriptor !== null);
}

export function projectModelObjectIdentities(value: ProjectModel) {
  const model = validateProjectModel(value);
  return model.modelObjects.map((object) => {
    const element = model.buildingElements.find((candidate) => candidate.elementId === object.elementId);
    if (!element || element.sourceGeometryId !== object.sourceGeometryId) throw new Error(`Three.js identity ${object.elementId} has no canonical building element.`);
    return { elementId: object.elementId, projectId: object.projectId, revisionId: object.revisionId, sheetId: element.sheetId, viewportId: element.viewportId, sourceGeometryId: object.sourceGeometryId, reviewStatus: object.reviewStatus };
  });
}
