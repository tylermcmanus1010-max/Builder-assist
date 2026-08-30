"use client";

import { Box, CircleAlert, Crosshair, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ProjectModel } from "../../../lib/project-model";
import { createProjectModelGroup, disposeProjectModelGroup, projectModelMeshDescriptors } from "../../../lib/project-model-three";

export function ProjectModelViewer({ model, projectName, address, planCount }: { model: ProjectModel | null; projectName: string; address: string; planCount: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const descriptors = useMemo(() => model ? projectModelMeshDescriptors(model) : [], [model]);
  const reviewRequired = Boolean(model && (model.status !== "ready" || descriptors.length !== model.buildingElements.length));

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !model || !descriptors.length) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071a2b);
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 10000);
    camera.position.set(40, 34, 40);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.setAttribute("aria-label", `Interactive 3D model for ${projectName}`);
    renderer.domElement.setAttribute("role", "img");
    viewport.appendChild(renderer.domElement);

    const group = createProjectModelGroup(model);
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xd8f3ff, 0x172c35, 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(30, 60, 20);
    scene.add(sun);
    const grid = new THREE.GridHelper(200, 40, 0x355d6a, 0x173744);
    scene.add(grid);

    const bounds = new THREE.Box3().setFromObject(group);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 10);
    camera.position.set(center.x + span, center.y + span * .8, center.z + span);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.update();

    const resize = () => {
      const rect = viewport.getBoundingClientRect();
      const width = Math.max(280, rect.width), height = Math.max(280, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
    const select = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(group.children, false)[0];
      setSelectedElementId(typeof hit?.object.userData.elementId === "string" ? hit.object.userData.elementId : null);
    };
    renderer.domElement.addEventListener("pointerup", select);
    let frame = 0;
    const render = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", select);
      controls.dispose();
      scene.remove(group);
      disposeProjectModelGroup(group);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [descriptors.length, model, projectName]);

  if (!model) return <section className="pmv-empty" aria-live="polite">
    <div className="pmv-empty-icon"><Box/></div><small>PROJECT MODEL ENGINE</small><h2>{projectName}</h2>
    <p>{planCount ? "3D model requires geometry review. Calibrate a sheet and trace the required construction elements." : "Upload this house’s complete plan set to begin its project record."}</p>
    <div className="pmv-empty-status"><CircleAlert/><span><strong>No substitute geometry shown</strong><small>User projects never inherit demonstration geometry.</small></span></div>
  </section>;

  if (!descriptors.length) return <section className="pmv-empty" aria-live="polite">
    <div className="pmv-empty-icon"><Crosshair/></div><small>ACTIVE PROJECT · MODEL VERSION {model.modelVersion}</small><h2>3D model requires geometry review</h2>
    <p>Verified scale, wall height, wall thickness, openings, and level data are required before a reliable mesh can be generated.</p>
    <div className="pmv-empty-status"><CircleAlert/><span><strong>No inferred building displayed</strong><small>{model.issues.filter((issue) => issue.status === "open").length} open review item(s)</small></span></div>
  </section>;

  const selected = model.buildingElements.find((element) => element.elementId === selectedElementId);
  return <section className="pmv-shell" aria-label={`${projectName} project model`}>
    <div className="pmv-model-head"><div><small>ACTIVE PROJECTMODEL · VERSION {model.modelVersion}</small><strong>{projectName}</strong><span>{address} · revision {model.activeRevisionId}</span></div><div className={`pmv-engine-state ${reviewRequired ? "is-review" : ""}`}><i/><span><strong>{reviewRequired ? "3D model requires geometry review" : "Reviewed geometry loaded"}</strong><small>{descriptors.length} project mesh{descriptors.length === 1 ? "" : "es"}</small></span></div></div>
    <div className="pmv-main"><div className="pmv-viewport" ref={viewportRef}><div className="pmv-tools"><button type="button" onClick={() => setSelectedElementId(null)} aria-label="Clear selected element"><RefreshCw/> Clear</button></div></div>
      <aside className="pmv-panel" aria-label="Project element traceability"><small>DRAWING → TAKEOFF → ESTIMATE → 3D</small><h2>Project elements</h2>{model.buildingElements.map((element) => <button key={element.elementId} type="button" data-element-id={element.elementId} aria-current={element.elementId === selectedElementId} onClick={() => setSelectedElementId(element.elementId)}><strong>{element.category}</strong><small>{element.elementId}</small></button>)}
      {selected && <section className="pmv-selection" data-element-id={selected.elementId}><h3>{selected.elementId}</h3><dl><dt>Sheet</dt><dd>{selected.sheetId}</dd><dt>Source geometry</dt><dd>{selected.sourceGeometryId}</dd><dt>Revision</dt><dd>{selected.revisionId}</dd></dl></section>}</aside>
    </div><div className="pmv-status" role="status"><span/><strong>{projectName}</strong><small>{planCount} persisted plan file{planCount === 1 ? "" : "s"} · {descriptors.length} reviewed mesh{descriptors.length === 1 ? "" : "es"}</small></div>
  </section>;
}
