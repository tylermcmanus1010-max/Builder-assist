import * as THREE from "three";
import type { ProjectModel } from "./project-model.ts";
import { preliminaryWallMeshDescriptors, projectModelMeshDescriptors } from "./project-model-mesh.ts";
export { preliminaryWallMeshDescriptors, projectModelMeshDescriptors, projectModelObjectIdentities, wallMeshDescriptor } from "./project-model-mesh.ts";

export function createProjectModelGroup(model: ProjectModel) {
  const group = new THREE.Group();
  group.name = `project-model:${model.projectId}:${model.activeRevisionId}:${model.modelVersion}`;
  // Confirmed walls are solid blue; preliminary walls render translucent amber
  // so the unconfirmed state stays visually explicit in the same scene.
  const batches = [
    { descriptors: projectModelMeshDescriptors(model), reviewStatus: "approved" as const, material: () => new THREE.MeshStandardMaterial({ color: 0x7bc3db, roughness: .72, metalness: .04 }) },
    { descriptors: preliminaryWallMeshDescriptors(model), reviewStatus: "requires_review" as const, material: () => new THREE.MeshStandardMaterial({ color: 0xe0a93f, roughness: .78, metalness: .02, transparent: true, opacity: .82 }) },
  ];
  for (const batch of batches) for (const descriptor of batch.descriptors) {
    const geometry = new THREE.BoxGeometry(descriptor.size.length, descriptor.size.height, descriptor.size.thickness);
    const mesh = new THREE.Mesh(geometry, batch.material());
    mesh.name = descriptor.elementId;
    mesh.position.set(descriptor.position.x, descriptor.position.y, descriptor.position.z);
    mesh.rotation.y = descriptor.rotationY;
    mesh.userData = { elementId: descriptor.elementId, projectId: descriptor.projectId, revisionId: descriptor.revisionId, sheetId: descriptor.sheetId, sourceGeometryId: descriptor.sourceGeometryId, reviewStatus: batch.reviewStatus };
    group.add(mesh);
  }
  return group;
}

export function disposeProjectModelGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
  group.clear();
}
