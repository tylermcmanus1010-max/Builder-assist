"use client";

import { ChevronLeft, ChevronRight, CircleAlert, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PropertyModel } from "../../../lib/property-models";
import { ProjectModelViewer } from "./project-model-viewer";

type Project = {
  id: string;
  name: string;
  address: string;
  status: string;
  updatedAt: string;
  model: PropertyModel | null;
  modelStatus: "ready" | "awaiting_model" | "awaiting_plans";
  files: Array<{
    id: string;
    filename: string;
    analysisStatus: string;
    documentType: string;
    publicPath: string | null;
    controlledModelKey: string | null;
  }>;
};

export function AssistifyClient({ userName }: { userName: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [railOpen, setRailOpen] = useState(true);

  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0];
  const activePlan = activeProject?.files.find((file) => file.filename.toLowerCase().endsWith(".pdf"));
  const planFiles = activeProject?.files.filter((file) => !file.documentType.startsWith("module_evidence:")) || [];

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/gen1", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Project data could not be loaded.");
      const nextProjects: Project[] = result.projects || [];
      setProjects(nextProjects);
      const stored = window.localStorage.getItem("assistify-active-project");
      setActiveProjectId(nextProjects.some((project) => project.id === stored) ? stored || "" : nextProjects[0]?.id || "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Project data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProjects(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  const chooseProject = (id: string) => {
    setActiveProjectId(id);
    window.localStorage.setItem("assistify-active-project", id);
  };

  if (loading) return <main className="assistify-load" aria-busy="true"><div className="as-spinner"/><h1>Opening Assistify</h1><p>Loading your builds and their project-specific model records…</p></main>;
  if (loadError) return <main className="assistify-load"><CircleAlert/><h1>Assistify could not open</h1><p>{loadError}</p><button type="button" onClick={() => void loadProjects()}>Retry</button></main>;

  return <main className="assistify-shell">
    <header className="as-header">
      <button className="as-icon-button as-mobile-only" type="button" aria-label="Open projects" onClick={() => setRailOpen(true)}><Menu/></button>
      <Link className="as-brand" href="/index.html#/member-portal/buildify"><span>BA</span><strong>Builder Assist</strong><small>ASSISTIFY</small></Link>
      <nav aria-label="Gen1 workspaces"><Link href="/index.html#/member-portal/buildify">Buildify &amp; Quotify</Link><Link aria-current="page" href="/member-portal/assistify">Assistify 3D</Link><Link href="/index.html#/member-portal/assistify-operations">Execution records</Link><Link href="/index.html#/member-portal/growify">Growify</Link></nav>
      <Link className="as-mobile-records" href="/index.html#/member-portal/assistify-operations">Records</Link>
      <div className="as-user"><small>Signed in</small><strong>{userName}</strong></div>
    </header>
    <div className="as-body">
      <aside className={`as-project-rail ${railOpen ? "" : "is-collapsed"}`} aria-label="Projects">
        <div className="as-rail-title"><div><small>HOUSE RECORDS</small><strong>{projects.length} build{projects.length === 1 ? "" : "s"}</strong></div><button type="button" aria-label={railOpen ? "Collapse projects" : "Expand projects"} onClick={() => setRailOpen((value) => !value)}>{railOpen ? <ChevronLeft/> : <ChevronRight/>}</button></div>
        <div className="as-project-list">{projects.map((project) => <button key={project.id} type="button" aria-current={project.id === activeProject?.id ? "true" : undefined} onClick={() => chooseProject(project.id)}><span>{project.name.slice(0,2).toUpperCase()}</span><div><strong>{project.name}</strong><small>{project.address}</small><em>{project.modelStatus === "ready" ? "Model ready" : project.files.length ? "Model pending" : "Plans needed"}</em></div></button>)}</div>
        <Link className="as-upload-link" href="/index.html#/member-portal/buildify">+ Upload plans / add house</Link>
      </aside>
      <section className="as-workspace as-reader-workspace" aria-label="Assistify project-specific plan reader">
        <div className="as-context-bar">
          <div><small>ACTIVE HOUSE</small><strong>{activeProject?.name || "No house selected"}</strong><span>{activeProject?.address || "Upload plans to create a house record"}</span></div>
          {activePlan && <a className="as-source-link" href={`/api/gen1?projectId=${encodeURIComponent(activeProject.id)}&fileId=${encodeURIComponent(activePlan.id)}`} target="_blank" rel="noreferrer">Open this house&apos;s plans</a>}
          <div className={`as-control-status ${activeProject?.model ? "is-ready" : "is-reference"}`}><span><strong>{activeProject?.model ? "Project geometry loaded" : "Project model pending"}</strong><small>{activeProject?.model ? "No shared or substitute house data" : "Another property will never be substituted"}</small></span></div>
        </div>
        {activeProject ? <ProjectModelViewer key={activeProject.id} model={activeProject.model} projectName={activeProject.name} address={activeProject.address} planCount={planFiles.length}/> : <div className="pmv-empty"><CircleAlert/><h2>No house records found</h2><p>Upload a complete plan set in Buildify to create the first connected project.</p></div>}
      </section>
    </div>
  </main>;
}
