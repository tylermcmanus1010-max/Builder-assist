"use client";

import { useState, type FormEvent } from "react";
import type { ProjectModel } from "../../../lib/project-model";

export function GeometryReviewControls({ projectId, model, onUpdated }: { projectId: string; model: ProjectModel; onUpdated: (model: ProjectModel) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [height, setHeight] = useState("9");
  const [thickness, setThickness] = useState("0.5");
  const activeSheets = model.sheets.filter((sheet) => sheet.revisionId === model.activeRevisionId);
  const [selectedSheetId, setSelectedSheetId] = useState(activeSheets[0]?.sheetId || "");
  const activeSheet = activeSheets.find((sheet) => sheet.sheetId === selectedSheetId) || activeSheets[0];
  const walls = model.buildingElements.filter((element) => element.revisionId === model.activeRevisionId);
  const preliminaryWalls = walls.filter((element) => element.reviewStatus === "requires_review");
  const confirmedWalls = walls.filter((element) => element.reviewStatus === "approved");

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

  const applyBasics = () => void command({ action: "apply_wall_defaults", height: Number(height), thickness: Number(thickness) });
  const review = (decision: "approved" | "removed", elementIds?: string[]) => void command({ action: "review_geometry", decision, elementIds, evidenceDescription: decision === "approved" ? "Confirmed against the uploaded plan set in the Assistify preliminary model review." : "Removed by the user during preliminary model review; the detected shape is not a wall on the plans." });

  const calibrate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void command({ action: "calibrate_scale", sheetId: activeSheet?.sheetId, sourceDocumentId: activeSheet?.sourceDocumentId, pageNumber: activeSheet?.pageNumber, drawingDistance: Number(data.get("drawingDistance")), drawingUnits: data.get("drawingUnits"), realDistance: Number(data.get("realDistance")), units: data.get("units"), evidenceDescription: data.get("evidenceDescription") });
  };
  const trace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const wallHeight = String(data.get("height") || "").trim(), wallThickness = String(data.get("thickness") || "").trim();
    void command({ action: "trace_wall", sheetId: activeSheet?.sheetId, sourceDocumentId: activeSheet?.sourceDocumentId, pageNumber: activeSheet?.pageNumber, sourceGeometryId: `geo_${crypto.randomUUID().replaceAll("-", "")}`, levelId: "lvl_ground", levelName: "Ground level", levelElevation: Number(data.get("levelElevation")), start: { x: Number(data.get("startX")), y: Number(data.get("startY")) }, end: { x: Number(data.get("endX")), y: Number(data.get("endY")) }, height: wallHeight ? Number(wallHeight) : undefined, thickness: wallThickness ? Number(wallThickness) : undefined, reviewed: data.get("reviewed") === "on", evidenceDescription: data.get("evidenceDescription") });
  };

  if (!activeSheet) return <section className="pmv-empty-status"><strong>Source document review required</strong><small>No active sheet is available for calibration.</small></section>;
  return <section className="geometry-review" aria-label="Drawing geometry review">
    <small>PLAN REVIEW · {activeSheet.title}</small>
    <p className="review-summary">{walls.length ? <>Builder Assist found <strong>{walls.length} wall{walls.length === 1 ? "" : "s"}</strong> on your plans — {confirmedWalls.length} confirmed, {preliminaryWalls.length} still preliminary. You don&apos;t have to enter any measurements: typical values are already applied and listed as assumptions.</> : <>No walls have been read from these plans yet. Upload a vector plan PDF, or open Advanced tools to trace walls by hand.</>}</p>

    {preliminaryWalls.length > 0 && <div className="review-quick">
      <h3>1 · Building basics (optional)</h3>
      <p>Only change these if your plans differ from the typical values, then apply to every preliminary wall.</p>
      <div className="review-basics">
        <label>Wall height (ft)<input type="number" min="1" step="0.5" value={height} onChange={(event) => setHeight(event.target.value)} /></label>
        <label>Wall thickness (ft)<input type="number" min="0.1" step="0.05" value={thickness} onChange={(event) => setThickness(event.target.value)} /></label>
        <button type="button" disabled={busy} onClick={applyBasics}>Apply to preliminary walls</button>
      </div>
      <h3>2 · Confirm the walls</h3>
      <p>Check the 3D preview against your plans, remove anything that isn&apos;t a wall, then confirm the rest in one tap.</p>
      <button type="button" className="review-confirm-all" disabled={busy} onClick={() => review("approved")}>Confirm all {preliminaryWalls.length} preliminary wall{preliminaryWalls.length === 1 ? "" : "s"}</button>
      <ul className="review-wall-list">
        {preliminaryWalls.map((element) => {
          const sheet = model.sheets.find((candidate) => candidate.sheetId === element.sheetId);
          return <li key={element.elementId} data-element-id={element.elementId}>
            <span>Wall · {element.dimensions.length.toFixed(1)} {element.units}{sheet?.pageNumber ? ` · page ${sheet.pageNumber}` : ""}</span>
            <span className="review-wall-actions">
              <button type="button" disabled={busy} onClick={() => review("approved", [element.elementId])}>Confirm</button>
              <button type="button" className="is-remove" disabled={busy} onClick={() => review("removed", [element.elementId])}>Not a wall</button>
            </span>
          </li>;
        })}
      </ul>
    </div>}
    {!preliminaryWalls.length && confirmedWalls.length > 0 && <p className="review-summary">Every detected wall is confirmed. The model, takeoff and estimate below share the same reviewed elements.</p>}

    <details className="review-advanced"><summary>Advanced tools · calibrate scale or trace a wall by hand</summary>
    {!activeSheet.scaleCalibration ? <form onSubmit={calibrate} data-workspace="drawing"><h3>Calibrate drawing scale</h3><label>Drawing distance<input name="drawingDistance" type="number" min="0.001" step="any" required/></label><label>Drawing units<select name="drawingUnits" defaultValue="in"><option value="in">Inches</option><option value="mm">Millimeters</option><option value="px">Pixels</option></select></label><label>Real distance<input name="realDistance" type="number" min="0.001" step="any" required/></label><label>Units<select name="units" defaultValue="ft"><option value="ft">Feet</option><option value="m">Meters</option></select></label><label>Calibration evidence<input name="evidenceDescription" required placeholder="Dimension text and source location"/></label><button type="submit" disabled={busy}>Record verified scale</button></form>
    : <form onSubmit={trace} data-workspace="drawing"><h3>Trace reviewed wall centerline</h3><label>Start X<input name="startX" type="number" step="any" required/></label><label>Start Y<input name="startY" type="number" step="any" required/></label><label>End X<input name="endX" type="number" step="any" required/></label><label>End Y<input name="endY" type="number" step="any" required/></label><label>Level elevation<input name="levelElevation" type="number" step="any" defaultValue="0" required/></label><label>Wall height<input name="height" type="number" min="0.001" step="any"/></label><label>Wall thickness<input name="thickness" type="number" min="0.001" step="any"/></label><label>Review evidence<input name="evidenceDescription" required placeholder="Source note or reviewer decision"/></label><label><input name="reviewed" type="checkbox"/>Dimensions reviewed</label><button type="submit" disabled={busy}>Add wall trace</button></form>}
    {activeSheets.length > 1 && <label>Source sheet<select value={activeSheet.sheetId} onChange={(event) => setSelectedSheetId(event.target.value)}>{activeSheets.map((sheet) => <option key={sheet.sheetId} value={sheet.sheetId}>Page {sheet.pageNumber}: {sheet.title}</option>)}</select></label>}
    </details>
    {error && <p role="alert">{error}</p>}
    <div data-workspace="drawing" aria-label="Drawing elements">{model.geometry2D.map((geometry) => <span key={geometry.geometryId} data-element-id={geometry.elementId}>{geometry.kind} · {geometry.elementId}</span>)}</div>
    <div data-workspace="takeoff" aria-label="Takeoff items">{model.takeoffItems.map((item) => <span key={item.takeoffItemId} data-element-id={item.elementId}>{item.category} · {item.quantity.toFixed(2)} {item.units}</span>)}</div>
  </section>;
}
