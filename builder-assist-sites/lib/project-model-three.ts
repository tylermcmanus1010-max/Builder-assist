import * as THREE from "three";
import type { ProjectModel } from "./project-model.ts";
import { projectModelMeshDescriptors } from "./project-model-mesh.ts";
export { projectModelMeshDescriptors, wallMeshDescriptor } from "./project-model-mesh.ts";

export function createProjectModelGroup(model: ProjectModel) {
  const group = new THREE.Group();
  group.name = `project-model:${model.projectId}:${model.activeRevisionId}:${model.modelVersion}`;
  for (const descriptor of projectModelMeshDescriptors(model)) {
    const geometry = new THREE.BoxGeometry(descriptor.size.length, descriptor.size.height, descriptor.size.thickness);
    const material = new THREE.MeshStandardMaterial({ color: 0x7bc3db, roughness: .72, metalness: .04 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = descriptor.elementId;
    mesh.position.set(descriptor.position.x, descriptor.position.y, descriptor.position.z);
    mesh.rotation.y = descriptor.rotationY;
    mesh.userData = { elementId: descriptor.elementId, projectId: descriptor.projectId, revisionId: descriptor.revisionId, sheetId: descriptor.sheetId, sourceGeometryId: descriptor.sourceGeometryId };
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
