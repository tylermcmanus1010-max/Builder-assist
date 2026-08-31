"use client";

import { Box, CircleAlert, Crosshair, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ProjectModel } from "../../../lib/project-model";
import { createProjectModelGroup, disposeProjectModelGroup, preliminaryWallMeshDescriptors, projectModelMeshDescriptors } from "../../../lib/project-model-three";

export function ProjectModelViewer({ model, projectName, address, planCount }: { model: ProjectModel | null; projectName: string; address: string; planCount: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const descriptors = useMemo(() => model ? projectModelMeshDescriptors(model) : [], [model]);
  const preliminary = useMemo(() => model ? preliminaryWallMeshDescriptors(model) : [], [model]);
  const meshCount = descriptors.length + preliminary.length;
  const reviewRequired = Boolean(model && (model.status !== "ready" || preliminary.length > 0));

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !model || !meshCount) return;
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
  }, [meshCount, model, projectName]);

  if (!model) return <section className="pmv-empty" aria-live="polite">
    <div className="pmv-empty-icon"><Box/></div><small>PROJECT MODEL ENGINE</small><h2>{projectName}</h2>
    <p>{planCount ? "This house's plans are saved. Upload a vector plan PDF or trace walls to build its 3D model." : "Upload this house's complete plan set to begin its project record."}</p>
    <div className="pmv-empty-status"><CircleAlert/><span><strong>No substitute geometry shown</strong><small>User projects never inherit demonstration geometry.</small></span></div>
  </section>;

  if (!meshCount) return <section className="pmv-empty" aria-live="polite">
    <div className="pmv-empty-icon"><Crosshair/></div><small>ACTIVE PROJECT · MODEL VERSION {model.modelVersion}</small><h2>No walls found on these plans yet</h2>
    <p>Nothing on the uploaded pages could be read as a wall. Use the plan review tools below to trace the building outline, or upload a vector (not scanned) plan PDF.</p>
    <div className="pmv-empty-status"><CircleAlert/><span><strong>No inferred building displayed</strong><small>{model.issues.filter((issue) => issue.status === "open").length} open review item(s)</small></span></div>
  </section>;

  const walls = model.buildingElements.filter((element) => element.revisionId === model.activeRevisionId);
  const selected = walls.find((element) => element.elementId === selectedElementId);
  const selectedSheet = selected && model.sheets.find((sheet) => sheet.sheetId === selected.sheetId);
  const stateHeadline = preliminary.length ? "Preliminary model — walls await confirmation" : reviewRequired ? "3D model requires geometry review" : "Reviewed geometry loaded";
  return <section className="pmv-shell" aria-label={`${projectName} project model`}>
    <div className="pmv-model-head"><div><small>ACTIVE PROJECTMODEL · VERSION {model.modelVersion}</small><strong>{projectName}</strong><span>{address} · revision {model.activeRevisionId}</span></div><div className={`pmv-engine-state ${reviewRequired ? "is-review" : ""}`}><i/><span><strong>{stateHeadline}</strong><small>{descriptors.length} confirmed · {preliminary.length} preliminary wall{preliminary.length === 1 ? "" : "s"}</small></span></div></div>
    {preliminary.length > 0 && <p className="pmv-preliminary-banner" role="status">Amber walls are read from your plans with stated assumptions. Confirm them below — or fix any that look wrong — to turn the model blue. Nothing preliminary is treated as verified.</p>}
    <div className="pmv-main"><div className="pmv-viewport" ref={viewportRef}><div className="pmv-tools"><button type="button" onClick={() => setSelectedElementId(null)} aria-label="Clear selected element"><RefreshCw/> Clear</button></div></div>
      <aside className="pmv-panel" aria-label="Project element traceability"><small>DRAWING → TAKEOFF → ESTIMATE → 3D</small><h2>Walls in this model</h2>{walls.map((element, index) => {
        const sheet = model.sheets.find((candidate) => candidate.sheetId === element.sheetId);
        return <button key={element.elementId} type="button" data-element-id={element.elementId} aria-current={element.elementId === selectedElementId} onClick={() => setSelectedElementId(element.elementId)}><strong>Wall {index + 1} · {element.dimensions.length.toFixed(1)} {element.units}</strong><small>{sheet?.pageNumber ? `Page ${sheet.pageNumber} · ` : ""}{element.reviewStatus === "approved" ? "Confirmed" : element.reviewStatus === "requires_review" ? "Preliminary" : "Removed"}</small></button>;
      })}
      {selected && <section className="pmv-selection" data-element-id={selected.elementId}><h3>Wall {walls.indexOf(selected) + 1}</h3><dl><dt>Status</dt><dd>{selected.reviewStatus === "approved" ? "Confirmed" : "Preliminary"}</dd><dt>Length</dt><dd>{selected.dimensions.length.toFixed(2)} {selected.units}</dd><dt>Plan page</dt><dd>{selectedSheet?.pageNumber ?? "—"}</dd><dt>Element</dt><dd>{selected.elementId}</dd><dt>Source geometry</dt><dd>{selected.sourceGeometryId}</dd></dl>{selected.assumptions.length > 0 && <p className="pmv-selection-assumptions">{selected.assumptions.join(" ")}</p>}</section>}</aside>
    </div><div className="pmv-status" role="status"><span/><strong>{projectName}</strong><small>{planCount} persisted plan file{planCount === 1 ? "" : "s"} · {descriptors.length} confirmed · {preliminary.length} preliminary</small></div>
  </section>;
}
