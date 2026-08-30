"use client";

import { useState, type FormEvent } from "react";
import type { ProjectModel } from "../../../lib/project-model";

export function GeometryReviewControls({ projectId, model, onUpdated }: { projectId: string; model: ProjectModel; onUpdated: (model: ProjectModel) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeSheet = model.sheets.find((sheet) => sheet.revisionId === model.activeRevisionId);

  const command = async (payload: Record<string, unknown>) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/gen1", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, expectedModelVersion: model.modelVersion, ...payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ProjectModel command failed.");
      onUpdated(result.project.projectModel);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ProjectModel command failed."); }
    finally { setBusy(false); }
  };

  const calibrate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void command({ action: "calibrate_scale", sheetId: activeSheet?.sheetId, drawingDistance: Number(data.get("drawingDistance")), realDistance: Number(data.get("realDistance")), units: data.get("units") });
  };
  const trace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void command({ action: "trace_wall", sheetId: activeSheet?.sheetId, sourceGeometryId: `geo_${crypto.randomUUID().replaceAll("-", "")}`, levelId: "lvl_ground", levelName: "Ground level", levelElevation: Number(data.get("levelElevation")), start: { x: Number(data.get("startX")), y: Number(data.get("startY")) }, end: { x: Number(data.get("endX")), y: Number(data.get("endY")) }, height: Number(data.get("height")), thickness: Number(data.get("thickness")) });
  };

  if (!activeSheet) return <section className="pmv-empty-status"><strong>Source document review required</strong><small>No active sheet is available for calibration.</small></section>;
  return <section className="geometry-review" aria-label="Drawing geometry review">
    <small>DRAWING REVIEW · {activeSheet.title}</small>
    {!activeSheet.scaleCalibration ? <form onSubmit={calibrate} data-workspace="drawing"><h3>Calibrate drawing scale</h3><label>Drawing distance<input name="drawingDistance" type="number" min="0.001" step="any" required/></label><label>Real distance<input name="realDistance" type="number" min="0.001" step="any" required/></label><label>Units<select name="units" defaultValue="ft"><option value="ft">Feet</option><option value="m">Meters</option></select></label><button type="submit" disabled={busy}>Record verified scale</button></form>
    : <form onSubmit={trace} data-workspace="drawing"><h3>Trace reviewed wall centerline</h3><label>Start X<input name="startX" type="number" step="any" required/></label><label>Start Y<input name="startY" type="number" step="any" required/></label><label>End X<input name="endX" type="number" step="any" required/></label><label>End Y<input name="endY" type="number" step="any" required/></label><label>Level elevation<input name="levelElevation" type="number" step="any" defaultValue="0" required/></label><label>Wall height<input name="height" type="number" min="0.001" step="any" required/></label><label>Wall thickness<input name="thickness" type="number" min="0.001" step="any" required/></label><button type="submit" disabled={busy}>Add reviewed wall</button></form>}
    {error && <p role="alert">{error}</p>}
    <div data-workspace="drawing" aria-label="Drawing elements">{model.geometry2D.map((geometry) => <span key={geometry.geometryId} data-element-id={geometry.elementId}>{geometry.kind} · {geometry.elementId}</span>)}</div>
    <div data-workspace="takeoff" aria-label="Takeoff items">{model.takeoffItems.map((item) => <span key={item.takeoffItemId} data-element-id={item.elementId}>{item.category} · {item.quantity.toFixed(2)} {item.units}</span>)}</div>
  </section>;
}
