"use client";

import { Box, ChevronLeft, ChevronRight, CircleAlert, Crosshair, Eye, Pause, Play, RefreshCw, Rotate3D } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModelPrimitive, Point3, PropertyModel } from "../../../lib/property-models";

type Camera = { azimuth: number; elevation: number; distance: number; target: Point3 };
type ProjectedFace = { id: string; points: Array<[number, number]> };
type SceneFace = { id: string; primitive: ModelPrimitive; points: Point3[]; edgeOnly?: boolean };

const ROLE_COLORS: Record<ModelPrimitive["role"], { fill: string; edge: string }> = {
  parcel: { fill: "rgba(44,188,255,.035)", edge: "rgba(87,211,255,.72)" },
  terrain: { fill: "rgba(36,145,178,.025)", edge: "rgba(69,170,202,.42)" },
  excavation: { fill: "rgba(33,88,146,.34)", edge: "rgba(97,195,255,.68)" },
  utility: { fill: "rgba(255,168,66,.08)", edge: "rgba(255,188,96,.92)" },
  foundation: { fill: "rgba(135,180,231,.25)", edge: "rgba(193,226,255,.78)" },
  structure: { fill: "rgba(87,157,234,.12)", edge: "rgba(132,211,255,.9)" },
  enclosure: { fill: "rgba(100,210,255,.12)", edge: "rgba(197,239,255,.92)" },
  mep: { fill: "rgba(237,111,255,.08)", edge: "rgba(238,141,255,.95)" },
  interior: { fill: "rgba(189,213,247,.08)", edge: "rgba(184,224,255,.7)" },
  site: { fill: "rgba(53,211,160,.08)", edge: "rgba(91,228,181,.72)" },
};

function add(a: Point3, b: Point3): Point3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: Point3, b: Point3): Point3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a: Point3, value: number): Point3 { return [a[0] * value, a[1] * value, a[2] * value]; }
function dot(a: Point3, b: Point3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Point3, b: Point3): Point3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a: Point3): Point3 { const length = Math.hypot(...a) || 1; return scale(a, 1 / length); }

function wallFaces(primitive: ModelPrimitive): SceneFace[] {
  const [a, b] = primitive.points;
  if (!a || !b) return [];
  const thickness = primitive.thickness || .5;
  const height = primitive.height || 10;
  const direction = norm([b[0] - a[0], b[1] - a[1], 0]);
  const offset: Point3 = [-direction[1] * thickness / 2, direction[0] * thickness / 2, 0];
  const a1 = add(a, offset), a2 = sub(a, offset), b1 = add(b, offset), b2 = sub(b, offset);
  const top: Point3 = [0, 0, height];
  return [
    [a1, b1, add(b1, top), add(a1, top)],
    [b2, a2, add(a2, top), add(b2, top)],
    [a2, a1, add(a1, top), add(a2, top)],
    [b1, b2, add(b2, top), add(b1, top)],
    [add(a1, top), add(b1, top), add(b2, top), add(a2, top)],
  ].map((points) => ({ id: primitive.id, primitive, points }));
}

function slabFaces(primitive: ModelPrimitive): SceneFace[] {
  if (primitive.points.length < 3) return [];
  const thickness = primitive.thickness || .25;
  const top = primitive.points.map((point) => [point[0], point[1], point[2] + thickness] as Point3);
  const faces: SceneFace[] = [{ id: primitive.id, primitive, points: top }];
  primitive.points.forEach((point, index) => {
    const next = primitive.points[(index + 1) % primitive.points.length];
    faces.push({ id: primitive.id, primitive, points: [point, next, [next[0], next[1], next[2] + thickness], [point[0], point[1], point[2] + thickness]] });
  });
  return faces;
}

function sceneFor(model: PropertyModel) {
  return model.primitives.flatMap((primitive): SceneFace[] => {
    if (primitive.kind === "wall") return wallFaces(primitive);
    if (primitive.kind === "slab") return slabFaces(primitive);
    if (primitive.kind === "surface") return [{ id: primitive.id, primitive, points: primitive.points }];
    if (primitive.kind === "path") return [{ id: primitive.id, primitive, points: primitive.points, edgeOnly: true }];
    return [];
  });
}

function boundsFor(model: PropertyModel) {
  const points = model.primitives.flatMap((primitive) => primitive.points.flatMap((point) => [point, [point[0], point[1], point[2] + (primitive.height || primitive.thickness || 0)] as Point3]));
  const xs = points.map((point) => point[0]), ys = points.map((point) => point[1]), zs = points.map((point) => point[2]);
  const min: Point3 = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
  const max: Point3 = [Math.max(...xs), Math.max(...ys), Math.max(...zs, 14)];
  const target: Point3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return { min, max, target, span: Math.max(max[0] - min[0], max[1] - min[1], 40) };
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || .0001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function evidenceClass(evidence: string) {
  if (evidence.startsWith("Verified")) return "is-verified";
  if (evidence === "Scaled from plan") return "is-scaled";
  if (evidence === "Unresolved") return "is-unresolved";
  return "is-inferred";
}

export function ProjectModelViewer({ model, projectName, address, planCount }: { model: PropertyModel | null; projectName: string; address: string; planCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const projectedRef = useRef<ProjectedFace[]>([]);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number | null>(null);
  const [stage, setStage] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [dimensions, setDimensions] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scene = useMemo(() => model ? sceneFor(model) : [], [model]);
  const bounds = useMemo(() => model ? boundsFor(model) : null, [model]);
  const [camera, setCamera] = useState<Camera>(() => ({ azimuth: -48, elevation: 34, distance: bounds ? bounds.span * 1.62 : 280, target: bounds?.target || [65, 44, 4] }));
  const cameraRef = useRef(camera);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const resetCamera = useCallback((top = false) => {
    if (!bounds) return;
    setCamera({ azimuth: top ? -90 : -48, elevation: top ? 88 : 34, distance: bounds.span * (top ? 1.45 : 1.62), target: bounds.target });
  }, [bounds]);

  useEffect(() => {
    if (!playing || !model) return;
    const timer = window.setInterval(() => setStage((value) => value >= model.stages.length ? 1 : value + 1), 1900);
    return () => window.clearInterval(timer);
  }, [playing, model]);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || !model || !bounds) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 1, height = 1, dpr = 1, last = performance.now();

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(260, rect.width); height = Math.max(260, rect.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(wrap);

    const draw = (now: number) => {
      const elapsed = Math.min(40, now - last); last = now;
      let liveCamera = cameraRef.current;
      if (autoOrbit && !dragRef.current && !reduced) {
        liveCamera = { ...liveCamera, azimuth: liveCamera.azimuth + elapsed * .0035 };
        cameraRef.current = liveCamera;
      }
      const az = liveCamera.azimuth * Math.PI / 180, el = liveCamera.elevation * Math.PI / 180;
      const eye: Point3 = [
        liveCamera.target[0] + liveCamera.distance * Math.cos(el) * Math.cos(az),
        liveCamera.target[1] + liveCamera.distance * Math.cos(el) * Math.sin(az),
        liveCamera.target[2] + liveCamera.distance * Math.sin(el),
      ];
      const forward = norm(sub(liveCamera.target, eye));
      const right = norm(cross(forward, [0, 0, 1]));
      const up = norm(cross(right, forward));
      const focal = Math.min(width, height) * 1.2;
      const project = (point: Point3): [number, number, number] | null => {
        const relative = sub(point, eye), z = dot(relative, forward);
        if (z <= 1) return null;
        return [width / 2 + dot(relative, right) * focal / z, height / 2 - dot(relative, up) * focal / z, z];
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a2654"); gradient.addColorStop(.56, "#071b3b"); gradient.addColorStop(1, "#041127");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

      const drawables: Array<{ face: SceneFace; points: Array<[number, number]>; depth: number }> = [];
      scene.forEach((face) => {
        if (face.primitive.stage > stage) return;
        const projected = face.points.map(project);
        if (projected.some((point) => !point)) return;
        const valid = projected as Array<[number, number, number]>;
        drawables.push({ face, points: valid.map((point) => [point[0], point[1]]), depth: valid.reduce((sum, point) => sum + point[2], 0) / valid.length });
      });
      drawables.sort((a, b) => b.depth - a.depth);
      const hitAreas: ProjectedFace[] = [];
      drawables.forEach(({ face, points }) => {
        const colors = ROLE_COLORS[face.primitive.role];
        const current = face.primitive.stage === stage || stage === 12;
        const selected = face.id === selectedId;
        ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach((point) => ctx.lineTo(point[0], point[1]));
        if (face.edgeOnly) {
          ctx.strokeStyle = selected ? "#ffffff" : colors.edge; ctx.lineWidth = selected ? 3.2 : current ? 2.1 : 1.15; ctx.setLineDash(face.primitive.evidence === "Unresolved" ? [8, 6] : []); ctx.stroke();
        } else {
          ctx.closePath(); ctx.fillStyle = selected ? "rgba(113,222,255,.3)" : colors.fill; ctx.fill();
          ctx.strokeStyle = selected ? "#ffffff" : colors.edge; ctx.lineWidth = selected ? 2.4 : current ? 1.25 : .65; ctx.setLineDash(face.primitive.evidence === "Unresolved" ? [7, 5] : []); ctx.stroke();
          hitAreas.push({ id: face.id, points });
        }
      });
      ctx.setLineDash([]);

      if (dimensions) model.dimensions.filter((dimension) => dimension.stage <= stage).forEach((dimension) => {
        const a = project(dimension.a), b = project(dimension.b); if (!a || !b) return;
        ctx.strokeStyle = "rgba(111,217,255,.92)"; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
        ctx.font = "800 11px Arial"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(4,17,39,.9)"; ctx.strokeText(dimension.label, x, y - 7); ctx.fillStyle = "#aee6ff"; ctx.fillText(dimension.label, x, y - 7);
      });
      projectedRef.current = hitAreas;
      animationRef.current = requestAnimationFrame(draw);
    };
    animationRef.current = requestAnimationFrame(draw);
    return () => { observer.disconnect(); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [autoOrbit, bounds, dimensions, model, scene, selectedId, stage]);

  if (!model) return <section className="pmv-empty" aria-live="polite">
    <div className="pmv-empty-icon"><Box/></div>
    <small>PROJECT MODEL ENGINE</small>
    <h2>{projectName}</h2>
    <p>{planCount ? "The selected house has plan files, but its project-specific geometry has not been issued to the model engine yet." : "Upload this house’s complete plan set to begin its project-specific model record."}</p>
    <div className="pmv-empty-status"><CircleAlert/><span><strong>No substitute geometry shown</strong><small>The engine will never display another property in this house record.</small></span></div>
  </section>;

  const activeStage = model.stages[stage - 1] || model.stages[0];
  const selected = model.primitives.find((primitive) => primitive.id === selectedId) || null;
  const stageObjects = model.primitives.filter((primitive) => primitive.stage === stage || (stage === 12 && primitive.stage <= 11));

  const moveStage = (value: number) => { setStage(Math.max(1, Math.min(model.stages.length, value))); setSelectedId(null); };
  const stopAuto = () => setAutoOrbit(false);

  return <section className="pmv-shell" aria-label={`${projectName} project model`}>
    <div className="pmv-model-head">
      <div><small>PROJECT-SPECIFIC PLAN READER</small><strong>{model.projectName}</strong><span>{model.address} · plan check {model.planCheck}</span></div>
      <div className="pmv-engine-state"><i/><span><strong>Controlled model loaded</strong><small>{model.revision}</small></span></div>
    </div>
    <div className="pmv-main">
      <div className="pmv-viewport" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          tabIndex={0}
          aria-label={`Interactive construction model for ${model.projectName}. Stage ${stage}: ${activeStage.title}.`}
          onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); stopAuto(); }}
          onPointerMove={(event) => { if (!dragRef.current) return; const dx = event.clientX - dragRef.current.x, dy = event.clientY - dragRef.current.y; dragRef.current = { x: event.clientX, y: event.clientY }; setCamera((value) => ({ ...value, azimuth: value.azimuth - dx * .42, elevation: Math.max(4, Math.min(88, value.elevation + dy * .3)) })); }}
          onPointerUp={(event) => { dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { dragRef.current = null; }}
          onWheel={(event) => { event.preventDefault(); stopAuto(); setCamera((value) => ({ ...value, distance: Math.max(45, Math.min(500, value.distance * Math.exp(event.deltaY * .0012))) })); }}
          onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(), point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]; const match = [...projectedRef.current].reverse().find((face) => pointInPolygon(point, face.points)); setSelectedId(match?.id || null); }}
          onKeyDown={(event) => {
            const key = event.key; let handled = true; stopAuto();
            if (key === "ArrowLeft") setCamera((value) => ({ ...value, azimuth: value.azimuth + 4 }));
            else if (key === "ArrowRight") setCamera((value) => ({ ...value, azimuth: value.azimuth - 4 }));
            else if (key === "ArrowUp") setCamera((value) => ({ ...value, elevation: Math.min(88, value.elevation + 3) }));
            else if (key === "ArrowDown") setCamera((value) => ({ ...value, elevation: Math.max(4, value.elevation - 3) }));
            else if (key === "+" || key === "=") setCamera((value) => ({ ...value, distance: Math.max(45, value.distance * .92) }));
            else if (key === "-" || key === "_") setCamera((value) => ({ ...value, distance: Math.min(500, value.distance / .92) }));
            else if (key === "Home") resetCamera(false);
            else handled = false;
            if (handled) event.preventDefault();
          }}
        />
        <div className="pmv-tools" aria-label="Model view controls">
          <button type="button" aria-pressed={autoOrbit} onClick={() => setAutoOrbit((value) => !value)}><Rotate3D/> Auto orbit</button>
          <button type="button" aria-pressed={dimensions} onClick={() => setDimensions((value) => !value)}><Crosshair/> Dimensions</button>
          <button type="button" onClick={() => {stopAuto();resetCamera(true)}}><Eye/> Top</button>
          <button type="button" onClick={() => {stopAuto();resetCamera(false)}}><RefreshCw/> Reset</button>
        </div>
        <div className="pmv-hud"><small>STAGE {stage} OF {model.stages.length}</small><strong>{activeStage.title}</strong></div>
        <div className="pmv-help">Drag to orbit · wheel to zoom · select geometry for its plan source</div>
      </div>
      <aside className="pmv-panel" aria-label="Model stage and source information">
        <label className="pmv-stage-label" htmlFor="project-model-stage">Construction stage</label>
        <select id="project-model-stage" value={stage} onChange={(event) => moveStage(Number(event.target.value))}>{model.stages.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select>
        <div className="pmv-stage-actions">
          <button type="button" disabled={stage === 1} onClick={() => moveStage(stage - 1)}><ChevronLeft/> Previous</button>
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause/> : <Play/>}{playing ? "Pause" : "Play"}</button>
          <button type="button" disabled={stage === model.stages.length} onClick={() => moveStage(stage + 1)}>Next <ChevronRight/></button>
        </div>
        <div className="pmv-progress" aria-label={`Stage ${stage} of ${model.stages.length}`}><i style={{ width: `${stage / model.stages.length * 100}%` }}/></div>
        <section className="pmv-stage-copy"><small>{activeStage.short}</small><h2>{activeStage.title}</h2><p>{activeStage.description}</p><div>{activeStage.sources.map((item) => <span key={item}>{item}</span>)}</div></section>
        {selected ? <section className="pmv-selection" aria-live="polite"><div><small>SELECTED OBJECT</small><button type="button" onClick={() => setSelectedId(null)} aria-label="Clear selected model object">×</button></div><h3>{selected.label}</h3><span className={evidenceClass(selected.evidence)}>{selected.evidence}</span><dl><dt>Layer</dt><dd>{selected.role}</dd><dt>Source</dt><dd>{selected.sourceSheet}</dd><dt>Plan detail</dt><dd>{selected.sourceDetail}</dd></dl></section> : <section className="pmv-components"><h3>{stage === 12 ? "Complete model" : "Added in this stage"}<span>{stageObjects.length}</span></h3>{stageObjects.slice(0, 7).map((object) => <button key={object.id} type="button" onClick={() => setSelectedId(object.id)}><i className={evidenceClass(object.evidence)}/><span><strong>{object.label}</strong><small>{object.sourceSheet}</small></span></button>)}{stageObjects.length > 7 && <small>+ {stageObjects.length - 7} additional project objects</small>}</section>}
        <details className="pmv-assumptions"><summary>Model evidence and limitations</summary><p>{model.summary}</p><ul>{model.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></details>
      </aside>
    </div>
    <div className="pmv-status" role="status"><span/><strong>{projectName}</strong><small>{address} · {planCount} plan file{planCount === 1 ? "" : "s"} · project geometry only</small></div>
  </section>;
}
