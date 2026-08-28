(function () {
  "use strict";

  const API = "/api/gen1";
  const PHASES = [
    "Project Definition, Feasibility & Team", "Lot Control & Property Due Diligence", "Survey, Geotechnical, Utility & Site Investigations",
    "Schematic Design & Owner Program Approval", "Design Development, Construction Documents & Engineering", "Plan Review, Permits, HOA & Utilities",
    "Procurement, Contracting & Readiness", "Mobilization, Layout & Site Preparation", "Earthwork, Underground Utilities & Pre-Pour",
    "Foundation, Slab & Initial Drainage", "Structural Framing & Roof Structure", "Dry-In, Roofing, Windows & Weather Barrier",
    "Rough MEP, Fire & Low-Voltage", "Insulation, Drywall, Finishes & Site Completion", "Final Inspections, CO, Turnover & Warranty"
  ];
  const GATES = [
    "Owner program, budget, delivery method and team responsibilities approved.", "Title, zoning, access, constraints and property risks accepted.",
    "Survey, geotechnical and utility criteria complete enough to release design.", "Site plan, floor plan, exterior direction and cost range approved.",
    "Coordinated permit and construction documents internally reviewed and issued.", "Required permits, HOA actions and utility releases received or tracked.",
    "Budget, contracts, long-lead items, schedule and start authorization ready.", "Site controls, layout, access and protection in place.",
    "Subgrade, underground systems, testing, sleeves and pre-pour inspections accepted.", "Foundation and slab testing, survey, curing and drainage controls accepted.",
    "Structure complete, braced, inspected and released for enclosure and rough systems.", "Enclosure is continuous, flashed, tested and weather-ready.",
    "Coordinated rough systems tested and approved before concealment.", "Finishes, equipment and site improvements ready for final testing and punch.",
    "Final approvals, CO, training, closeout and warranty response active."
  ];
  const MODULES = [
    { no: 6, group: "Plan & Schedule", short: "Handoff", name: "Project Setup & Handoff", mission: "Prove this house is ready for field execution with owned readiness gates and evidence.", recordType: "Readiness gate", capabilities: ["Contract-to-field handoff", "Permit and baseline readiness", "Owned waivers and evidence"], needsPhoto: true, fields: [["gate", "Gate / requirement", "text"], ["source", "Source system", "select", ["Growify", "Buildify", "Assistify", "External"]], ["evidence", "Required evidence", "text"]] },
    { no: 7, group: "Plan & Schedule", short: "Schedule", name: "Scheduling & Look-Ahead", mission: "Plan activities, owners, dates, dependencies and progress without overwriting the baseline.", recordType: "Schedule activity", capabilities: ["Start and forecast dates", "Trade commitments and dependencies", "Progress and delay visibility"], fields: [["startDate", "Start date", "date"], ["endDate", "Forecast finish", "date"], ["progress", "Progress %", "number"], ["dependency", "Dependency / constraint", "text"], ["trade", "Trade / crew", "text"]] },
    { no: 8, group: "Plan & Schedule", short: "Tasks", name: "Tasks, Checklists & Forms", mission: "Assign clear next work, required evidence and approval state to accountable people.", recordType: "Task", capabilities: ["Owned work queue", "Evidence-required checklists", "Priority and workflow status"], needsPhoto: true, fields: [["priority", "Priority", "select", ["critical", "high", "normal", "low"]], ["evidenceRequired", "Evidence required", "text"], ["workflow", "Workflow / checklist", "text"]] },
    { no: 9, group: "Field Operations", short: "Daily Logs", name: "Daily Logs & Field Journal", mission: "Create a defensible daily record of weather, crews, hours, work, deliveries and delays.", recordType: "Daily log", capabilities: ["Weather and workforce", "Work and delivery journal", "Delay hours and evidence"], needsPhoto: true, fields: [["logDate", "Log date", "date"], ["weather", "Weather / conditions", "text"], ["crewCount", "Crew count", "number"], ["laborHours", "Labor hours", "number"], ["delayHours", "Delay hours", "number"]] },
    { no: 11, group: "Field Operations", short: "Evidence", name: "Photos & Visual Evidence", mission: "Index visual proof by date, location, trade and capture purpose.", recordType: "Visual evidence", capabilities: ["Before / progress / closeout sets", "Location and trade index", "Evidence lineage"], needsPhoto: true, fields: [["location", "Location / room", "text"], ["trade", "Trade", "text"], ["captureType", "Capture type", "select", ["Before construction", "Progress", "Issue", "Inspection", "Closeout"]]] },
    { no: 22, group: "Field Operations", short: "Time & Crews", name: "Time, Crews & Equipment", mission: "Capture approved labor, crew, equipment and cost-code usage against this house.", recordType: "Time / crew entry", capabilities: ["Crew and worker hours", "Cost-code attribution", "Supervisor approval"], fields: [["workDate", "Work date", "date"], ["crew", "Crew / employee", "text"], ["workers", "Workers", "number"], ["hours", "Hours", "number"], ["costCode", "Cost code", "text"], ["equipment", "Equipment", "text"]] },
    { no: 12, group: "Coordination & Quality", short: "RFIs", name: "RFIs, Submittals & Decisions", mission: "Route technical questions and product reviews with responsibility, impact and response history.", recordType: "Coordination item", capabilities: ["RFI and submittal registers", "Ball-in-court ownership", "Cost and schedule impact"], fields: [["itemType", "Type", "select", ["RFI", "Submittal", "Decision"]], ["reference", "Plan / spec reference", "text"], ["ballInCourt", "Ball in court", "text"], ["costImpactCents", "Cost impact", "money"], ["scheduleImpactDays", "Schedule days", "number"]] },
    { no: 13, group: "Coordination & Quality", short: "Quality", name: "Permits, Quality & Safety", mission: "Control inspections, punch, safety, warranty and regulated hold points with proof.", recordType: "Inspection / quality item", capabilities: ["Permit and inspection register", "Punch and corrective action", "Safety and warranty evidence"], needsPhoto: true, fields: [["itemType", "Type", "select", ["Permit", "Inspection", "Quality", "Punch", "Safety", "Warranty"]], ["location", "Location", "text"], ["severity", "Severity", "select", ["critical", "high", "normal", "low"]], ["evidenceRequired", "Evidence / hold point", "text"]] },
    { no: 17, group: "Coordination & Quality", short: "Changes", name: "Change Control", mission: "Capture scope change early, price it in Buildify and route approval through Growify.", recordType: "Change event", capabilities: ["Scope and reason record", "Cost and schedule impact", "Cross-platform approval path"], fields: [["reason", "Reason / source", "text"], ["costImpactCents", "Estimated cost impact", "money"], ["scheduleImpactDays", "Schedule days", "number"], ["approvalPath", "Approval path", "select", ["Buildify pricing -> Growify approval", "Internal approval", "Emergency authorization"]]] },
    { no: 14, group: "Trade Control", short: "Compliance", name: "Trade Compliance", mission: "Track vendor qualifications, insurance, licenses, tax records and performance requirements.", recordType: "Trade compliance", capabilities: ["Trade directory", "Insurance and license status", "Performance and exceptions"], fields: [["company", "Company", "text"], ["trade", "Trade", "text"], ["requirement", "Requirement", "text"], ["expiresOn", "Expires on", "date"]] },
    { no: 25, group: "Trade Control", short: "Trade Portal", name: "Trade Partner Portal", mission: "Issue focused requests so subcontractors can coordinate, submit and close out authorized work.", recordType: "Trade request", capabilities: ["Scoped trade access", "Submittal and coordination requests", "Response and closeout tracking"], fields: [["company", "Company", "text"], ["requestType", "Request type", "select", ["Coordination", "Submittal request", "Inspection response", "Closeout"]], ["responseDue", "Response due", "date"], ["accessScope", "Allowed sheets / scope", "text"]] }
  ];

  const S = {
    loaded: false, loading: false, error: "", projects: [], activeId: sessionStorage.getItem("g1o-active") || "",
    app: "buildify", assistTab: "overview", growTab: "dashboard", moduleNo: 6, moduleGroup: "All", moduleQuery: "", compareCategory: "All", lastMutation: null
  };
  const h = (v) => String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format((Number(cents) || 0) / 100);
  const active = () => S.projects.find(p => p.id === S.activeId) || S.projects[0] || null;
  const payload = (record) => record && record.payload && typeof record.payload === "object" ? record.payload : {};
  const statusLabel = (value) => h(String(value || "open").replaceAll("_", " "));

  async function uploadToken(files, scope) {
    const fingerprint = files.map(file => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${scope}|${fingerprint}`));
    const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
    const storageKey = `g1o-upload-token:${hash}`;
    let token = localStorage.getItem(storageKey);
    if (!token) { token = crypto.randomUUID(); localStorage.setItem(storageKey, token); }
    return { token, storageKey };
  }

  async function hydrate() {
    if (S.loading) return;
    S.loading = true; S.error = "";
    try {
      const response = await fetch(API, { headers: { accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load Gen1");
      S.projects = data.projects || [];
      if (!S.projects.some(p => p.id === S.activeId)) S.activeId = S.projects[0] && S.projects[0].id;
      S.loaded = true;
    } catch (error) { S.error = error.message || "Unable to load Gen1"; }
    finally { S.loading = false; draw(false); }
  }

  async function mutate(action, data, quiet) {
    const project = active();
    if (!project) return null;
    if (!quiet) busy(true);
    try {
      const response = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, projectId: project.id, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      S.lastMutation = result;
      replaceProject(result.project);
      if (!quiet) toast("Saved to " + result.project.name);
      return result.project;
    } catch (error) { toast(error.message || "Update failed", true); await hydrate(); return null; }
    finally { if (!quiet) busy(false); }
  }

  async function uploadProjectFiles(projectId, files, moduleRecordId) {
    toast(`Uploading ${files.length} file${files.length === 1 ? "" : "s"}…`);
    const upload = await uploadToken(files, `${projectId}:${moduleRecordId || "plans"}`);
    const form = new FormData(); form.append("projectId", projectId);
    files.forEach(file => form.append("plans", file));
    if (moduleRecordId) form.append("moduleRecordId", moduleRecordId);
    form.append("idempotencyKey", upload.token);
    const response = await fetch(API, { method: "POST", body: form }), result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed");
    localStorage.removeItem(upload.storageKey);
    replaceProject(result.project);
    return result.project;
  }

  function validateFiles(files, photos) {
    if (!files.length) return "Choose at least one file";
    if (files.length > 20) return "Choose no more than 20 files at once";
    const total = files.reduce((sum, file) => sum + file.size, 0), totalLimit = 80 * 1024 * 1024, itemLimit = (photos ? 15 : 50) * 1024 * 1024;
    if (total > totalLimit) return "The combined upload must be 80 MB or less";
    const tooLarge = files.find(file => file.size > itemLimit);
    if (tooLarge) return `${tooLarge.name} exceeds the ${photos ? 15 : 50} MB file limit`;
    const photoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/tiff"]), wrongType = photos && files.find(file => !photoTypes.has(file.type));
    return wrongType ? `${wrongType.name} must be a PNG, JPG, WebP or TIFF image` : "";
  }

  function replaceProject(project) {
    const index = S.projects.findIndex(p => p.id === project.id);
    if (index >= 0) S.projects[index] = project; else S.projects.unshift(project);
  }
  function busy(on) { document.body.classList.toggle("g1o-busy", !!on); document.body.setAttribute("aria-busy", String(!!on)); }
  function toast(message, bad) {
    let el = document.getElementById("g1oToast");
    if (!el) { el = document.createElement("div"); el.id = "g1oToast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.className = "g1o-toast on" + (bad ? " bad" : ""); el.textContent = message;
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 2600);
  }
  function draw(keepScroll = true) {
    const y = keepScroll ? window.scrollY : 0;
    show("member-portal", S.app);
    if (keepScroll) requestAnimationFrame(() => window.scrollTo(0, y));
  }

  function productNav() {
    return `<nav class="g1o-products" aria-label="Gen1 products">
      <a href="#/member-portal/buildify" class="${S.app === "buildify" ? "active" : ""}"><i>01</i><span><b>Buildify &amp; Quotify</b><small>Plans · estimate · compare</small></span></a>
      <a href="/member-portal/assistify" class="${S.app === "assistify" ? "active" : ""}"><i>02</i><span><b>Assistify</b><small>Sequence · inspect · verify</small></span></a>
      <a href="#/member-portal/growify" class="${S.app === "growify" ? "active" : ""}"><i>03</i><span><b>Growify</b><small>Leads · automate · collect</small></span></a>
    </nav>`;
  }

  function projectRail() {
    const p = active();
    return `<aside class="g1o-rail">
      <div class="g1o-rail-title"><span>House database</span><b>${S.projects.length}</b></div>
      <label class="g1o-new-house"><input class="g1o-sr-file" type="file" data-g1o-upload multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.dxf"><i aria-hidden="true">＋</i><strong>Upload plans to add house</strong><small>One plan set creates one linked Buildify, Assistify and Growify workspace. Up to 20 files / 80 MB.</small></label>
      <div class="g1o-projects">${S.projects.map(project => `<button type="button" data-g1o-project="${h(project.id)}" class="${p && p.id === project.id ? "active" : ""}"><span>${h(project.name)}</span><small>${h(project.address)} · ${(project.files || []).filter(file => !String(file.documentType).startsWith("module_evidence:")).length} plan docs</small><em>${statusLabel(project.status)}</em></button>`).join("")}</div>
      <div class="g1o-rail-proof"><i></i><span><b>One house record</b><small>Plans, estimate, field controls, CRM and campaigns stay correlated.</small></span></div>
    </aside>`;
  }

  function shell(content) {
    return `<main class="g1o-page">${typeof impersonationBar === "function" ? impersonationBar() : ""}
      <header class="g1o-top"><a href="#/" class="g1o-brand">${PLOGO}</a><span>GEN1 OPERATING SYSTEM</span><div class="portal-account"><span><small>CONTRACTOR WORKSPACE</small><strong>${h(session.username)}</strong></span><button class="portal-sign-out" data-logout>Sign out</button></div></header>
      <div class="g1o-body">${projectRail()}<section class="g1o-main">${productNav()}${content}</section></div></main>`;
  }

  function loadingView() {
    return shell(`<div class="g1o-loading"><i></i><h2>${S.error ? "Gen1 could not load" : "Opening the house database"}</h2><p>${h(S.error || "Linking plans, estimates, modules and Growify records…")}</p>${S.error ? '<button data-g1o-retry>Retry</button>' : ""}</div>`);
  }

  function projectHeader(project, eyebrow, title, description) {
    return `<header class="g1o-work-head"><div><span>${h(eyebrow)}</span><h1>${h(title)}</h1><p>${h(description)}</p></div><div class="g1o-house-chip"><small>ACTIVE HOUSE</small><b>${h(project.name)}</b><span>${h(project.address)}</span></div></header>`;
  }

  function syncStrip(project) {
    const buildCount = (project.files || []).filter(file => !String(file.documentType).startsWith("module_evidence:")).length + (project.estimateLines || []).length;
    const assistOpen = (project.moduleRecords || []).filter(r => !["complete", "closed", "approved"].includes(r.status)).length;
    const growCount = (project.growifyRecords || []).length;
    return `<section class="g1o-sync-strip"><div><span>LIVE SHARED HOUSE RECORD</span><b>${h(project.name)}</b><small>Every platform below reads and writes project ID ${h(project.id.slice(-8))}</small></div>
      <a href="#/member-portal/buildify"><i>01</i><span><b>Buildify / Quotify</b><small>${buildCount} plan + cost records</small></span></a>
      <a href="/member-portal/assistify"><i>02</i><span><b>Assistify</b><small>${assistOpen} open execution actions · open 3D</small></span></a>
      <a href="#/member-portal/growify"><i>03</i><span><b>Growify</b><small>${growCount} customer + revenue records</small></span></a></section>`;
  }

  function fileHref(project, file) {
    return file.publicPath || `${API}?projectId=${encodeURIComponent(project.id)}&fileId=${encodeURIComponent(file.id)}`;
  }

  function planFile(project, file) {
    const href = fileHref(project, file);
    return `<a href="${h(href)}" target="_blank" rel="noopener">${h(file.filename)} <small>${statusLabel(file.analysisStatus)} · open</small></a>`;
  }

  function estimateStats(project) {
    const lines = (project.estimateLines || []).filter(line => line.included);
    const materials = lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0);
    const finishes = (project.finishes || []).filter(x => x.selected).reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0);
    return { materials, build: materials, finishes };
  }

  function assumptions(project) {
    return `<details class="g1o-card g1o-assumptions"><summary><span><b>Plan assumptions</b><small>Update the house basis and rebuild its estimate</small></span><em>${Number(project.squareFeet).toLocaleString()} sf · ${project.stories} story · ${h(project.qualityLevel)}</em></summary>
      <form data-g1o-project-form class="g1o-form-grid">
        <label>House name<input name="name" value="${h(project.name)}" required></label><label>Address<input name="address" value="${h(project.address)}"></label><label>Client / owner<input name="clientName" value="${h(project.clientName)}"></label>
        <label>Conditioned square feet<input name="squareFeet" type="number" min="250" value="${project.squareFeet}" required></label><label>Stories<input name="stories" type="number" min="1" max="4" step=".5" value="${project.stories}"></label><label>Garage bays<input name="garageBays" type="number" min="0" max="12" value="${project.garageBays}"></label>
        <label>Quality level<select name="qualityLevel"><option value="standard" ${project.qualityLevel === "standard" ? "selected" : ""}>Standard</option><option value="premium" ${project.qualityLevel === "premium" ? "selected" : ""}>Premium</option><option value="luxury" ${project.qualityLevel === "luxury" ? "selected" : ""}>Luxury</option></select></label>
        <button type="submit">Save &amp; rebuild estimate</button>
      </form></details>`;
  }

  function estimateTable(project) {
    return `<article class="g1o-card"><div class="g1o-card-head"><div><span>PLAN-LINKED MATERIALS</span><h2>${h(project.name)} materials estimate</h2><p>Editable material quantities and unit prices generated immediately for this house. Labor is intentionally excluded; finishes remain separate.</p></div><i class="g1o-status ${h(project.estimateStatus)}">${statusLabel(project.estimateStatus)}</i></div>
      <div class="g1o-table-wrap"><table class="g1o-table g1o-est-table"><thead><tr><th>Use</th><th>Category / scope</th><th>Qty</th><th>Unit</th><th>Material rate</th><th>Material total</th><th>Basis</th></tr></thead><tbody>
      ${(project.estimateLines || []).map(line => `<tr data-est-row="${h(line.id)}"><td><input aria-label="Include ${h(line.category)} in estimate" type="checkbox" data-est-field="included" ${line.included ? "checked" : ""}></td><td><b>${h(line.category)}</b><small>${h(line.item)}</small></td><td><input aria-label="${h(line.category)} quantity" type="number" data-est-field="quantity" min="0" step=".01" value="${line.quantity}"></td><td>${h(line.unit)}</td><td><label class="g1o-money-input">$<input aria-label="${h(line.category)} material unit price" type="number" data-est-field="unitCost" min="0" step=".01" value="${(line.unitCostCents / 100).toFixed(2)}"></label></td><td><b>${money(line.quantity * line.unitCostCents)}</b></td><td><small>${h(line.source)}</small></td></tr>`).join("")}
      </tbody></table></div></article>`;
  }

  function comparisonData(project) {
    const vendors = new Set(["Builder Assist"]);
    (project.estimateLines || []).forEach(line => Object.keys(line.competitorRates || {}).forEach(v => vendors.add(v)));
    const totals = {};
    [...vendors].forEach(vendor => totals[vendor] = (project.estimateLines || []).filter(line => line.included).reduce((sum, line) => sum + line.quantity * Number((line.competitorRates || {})[vendor] ?? line.unitCostCents), 0));
    const sorted = Object.entries(totals).sort((a, b) => a[1] - b[1]);
    const values = sorted.map(x => x[1]);
    const median = values.length ? values[Math.floor(values.length / 2)] : 0;
    return { vendors: [...vendors], totals, sorted, median };
  }

  function catalogComparison(project) {
    const data = comparisonData(project);
    const categories = ["All", ...new Set((project.estimateLines || []).map(line => line.category))];
    const lines = (project.estimateLines || []).filter(line => S.compareCategory === "All" || line.category === S.compareCategory);
    const selectedTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCostCents, 0);
    return `<article class="g1o-card"><div class="g1o-card-head"><div><span>EQUIVALENT MATERIAL LINES</span><h2>Compare equivalent project lines</h2><p>Select a category to see its exact house quantity, scope description and comparable material rates.</p></div><label class="g1o-category-select">Material category<select data-g1o-category-select>${categories.map(cat => `<option value="${h(cat)}" ${S.compareCategory === cat ? "selected" : ""}>${h(cat)}</option>`).join("")}</select></label></div>
      <div class="g1o-compare-summary"><span><small>Selected category</small><b>${h(S.compareCategory)}</b></span><span><small>Project lines shown</small><b>${lines.length}</b></span><span><small>Builder Assist material total</small><b>${money(selectedTotal)}</b></span><span><small>Comparison basis</small><b>Same quantity + unit</b></span></div>
      <div class="g1o-compare-list">${lines.length ? lines.map(line => {
        const rates = line.competitorRates || { "Builder Assist": line.unitCostCents };
        const low = Math.min(...Object.values(rates).map(Number));
        return `<div class="g1o-compare-row" data-compare-text="${h((line.category + " " + line.item).toLowerCase())}"><div><span>${h(line.category)}</span><b>${h(line.item)}</b><small>${line.quantity.toLocaleString()} ${h(line.unit)} in this house estimate</small></div><div class="g1o-rate-grid">${data.vendors.map(vendor => { const rate = Number(rates[vendor] ?? line.unitCostCents); return `<span class="${rate === low ? "best" : ""}"><small>${h(vendor)}</small><b>${money(rate)}</b><em>${rate === low ? "BEST" : "per " + h(line.unit)}</em></span>`; }).join("")}</div></div>`;
      }).join("") : '<p class="g1o-empty">No material lines are available for this category yet.</p>'}</div></article>`;
  }

  function intelligence(project) {
    const data = comparisonData(project), stats = estimateStats(project);
    const current = data.totals["Builder Assist"] || stats.materials;
    const savings = Math.max(0, data.median - current);
    const opportunities = (project.estimateLines || []).map(line => {
      const rates = Object.values(line.competitorRates || {}).map(Number); const high = Math.max(...rates), low = Math.min(...rates);
      return { line, spread: (high - low) * line.quantity, low };
    }).sort((a, b) => b.spread - a.spread).slice(0, 4);
    const max = Math.max(...Object.values(data.totals), 1);
    return `<article class="g1o-card"><div class="g1o-card-head"><div><span>AUTOMATIC COMPETITIVE INTELLIGENCE</span><h2>Current material market position</h2><p>Loaded automatically from ${h(project.name)}’s included plan quantities every time this house is selected. Competitor values are stored planning-catalog benchmarks, not live supplier bids.</p></div><i class="g1o-live-pill">PROJECT-SYNCED</i></div>
      <div class="g1o-intel-grid"><div class="g1o-position"><div class="g1o-kpis"><span><small>Builder Assist material quote</small><b>${money(current)}</b></span><span><small>Catalog median</small><b>${money(data.median)}</b></span><span><small>Position savings</small><b>${money(savings)}</b></span></div>${data.sorted.map(([vendor, total]) => `<div class="g1o-market-bar"><span>${h(vendor)}</span><i><em style="width:${Math.max(4, total / max * 100)}%"></em></i><b>${money(total)}</b></div>`).join("")}</div>
      <div class="g1o-opportunities"><h3>Largest price spreads in this house</h3>${opportunities.map((o, i) => `<div><i>${i + 1}</i><span><b>${h(o.line.category)}</b><small>${h(o.line.item)}</small></span><strong>${money(o.spread)} spread</strong></div>`).join("")}</div></div></article>`;
  }

  function finishes(project) {
    const stats = estimateStats(project);
    return `<article class="g1o-card g1o-finishes"><div class="g1o-card-head"><div><span>SEPARATE OWNER DECISIONS</span><h2>Select and Price Finishes</h2><p>Finishes have been removed from the base catalog comparison and build quote. Select them here; this subtotal stays separate.</p></div><div class="g1o-finish-total"><small>SELECTED FINISHES</small><b>${money(stats.finishes)}</b></div></div>
      <form class="g1o-finish-form" data-finish-form><label>Category<input name="category" required placeholder="Tile, millwork, fixtures…"></label><label>Product / allowance<input name="item" required placeholder="Selected product or allowance"></label><label>Vendor<input name="vendor" placeholder="Supplier"></label><label>Quantity<input name="quantity" type="number" min="0" step=".01" value="1"></label><label>Unit price ($)<input name="unitCost" type="number" min="0" step=".01" value="0"></label><button type="submit">Add finish</button></form>
      <div class="g1o-table-wrap"><table class="g1o-table"><thead><tr><th>Select</th><th>Category</th><th>Chosen product / allowance</th><th>Vendor</th><th>Qty</th><th>Price</th><th>Actions</th></tr></thead><tbody>${(project.finishes || []).map(line => `<tr data-finish-row="${h(line.id)}"><td><input aria-label="Include ${h(line.category)} finish" type="checkbox" data-fin-field="selected" ${line.selected ? "checked" : ""}></td><td><b>${h(line.category)}</b></td><td><input aria-label="${h(line.category)} finish product" data-fin-field="item" value="${h(line.item)}"></td><td><input aria-label="${h(line.category)} finish vendor" data-fin-field="vendor" value="${h(line.vendor)}"></td><td><input aria-label="${h(line.category)} finish quantity" type="number" data-fin-field="quantity" min="0" step=".01" value="${line.quantity}"></td><td><label class="g1o-money-input">$<input aria-label="${h(line.category)} finish unit price" type="number" data-fin-field="unitCost" min="0" step=".01" value="${(line.unitCostCents / 100).toFixed(2)}"></label></td><td><div class="g1o-row-actions"><button type="button" data-save-finish>Save</button><button type="button" class="danger" data-delete-finish>Delete</button></div></td></tr>`).join("")}</tbody></table></div></article>`;
  }

  function buildify(project) {
    const stats = estimateStats(project);
    return `${projectHeader(project, "BUILDIFY & QUOTIFY", "Plan-linked cost control", "Upload creates the house. Its estimate, catalog comparison, intelligence and finishes all read from the same project record.")}
      ${syncStrip(project)}
      ${assumptions(project)}
      <div class="g1o-summary"><span><small>Plan documents</small><b>${(project.files || []).filter(file => !String(file.documentType).startsWith("module_evidence:")).length}</b><em>${(project.files || []).length ? "Stored with this house" : "Upload from the left rail"}</em></span><span><small>Material categories</small><b>${new Set((project.estimateLines || []).map(line => line.category)).size}</b><em>${(project.estimateLines || []).length} editable material lines</em></span><span><small>Materials</small><b>${money(stats.materials)}</b><em>Included plan-linked materials</em></span><span class="strong"><small>Baseline materials estimate</small><b>${money(stats.build)}</b><em>Labor and finishes excluded</em></span></div>
      ${(project.files || []).some(file => !String(file.documentType).startsWith("module_evidence:")) ? `<div class="g1o-file-strip"><span>PLAN SET</span>${project.files.filter(file => !String(file.documentType).startsWith("module_evidence:")).map(file => planFile(project, file)).join("")}</div>` : ""}
      ${estimateTable(project)}${catalogComparison(project)}${intelligence(project)}${finishes(project)}`;
  }

  function assistNav() {
    const tabs = [["overview", "Overview"], ["calendar", "Project calendar"], ["phases", "15 phases"], [7, "Schedule"], [8, "Tasks & forms"], [9, "Daily logs"], [11, "Photo evidence"], [12, "RFIs / submittals"], [13, "Quality & safety"], [17, "Change control"], [22, "Time & crews"], [25, "Trade portal"], ["modules", "All 11 tools"], ["model", "Plans + 3D"], ["activity", "Activity"]];
    return `<nav class="g1o-subnav g1o-assist-nav">${tabs.map(([id, label]) => typeof id === "number" ? `<button type="button" data-assist-module="${id}" class="${S.assistTab === "modules" && S.moduleNo === id ? "active" : ""}">${label}</button>` : `<button type="button" data-assist-tab="${id}" class="${S.assistTab === id ? "active" : ""}">${label}</button>`).join("")}</nav>`;
  }
  function phaseProgress(project) { const tasks = project.phaseTasks || []; return tasks.length ? Math.round(tasks.filter(t => t.completed).length / tasks.length * 100) : 0; }

  function assistOverview(project) {
    const progress = phaseProgress(project), records = project.moduleRecords || [], open = records.filter(r => !["complete", "closed", "approved"].includes(r.status)).length;
    const highUse = [7, 8, 9, 11, 12, 13, 17, 22].map(no => MODULES.find(m => m.no === no));
    return `<div class="g1o-summary"><span class="strong"><small>15-phase completion</small><b>${progress}%</b><em>${(project.phaseTasks || []).filter(t => t.completed).length} of ${(project.phaseTasks || []).length} controls complete</em></span><span><small>Execution records</small><b>${records.length}</b><em>${open} open actions</em></span><span><small>Operational tools</small><b>${MODULES.length}</b><em>Only Assistify-owned workflows</em></span><span><small>Shared events</small><b>${(project.events || []).length}</b><em>Visible across all platforms</em></span></div>
      <article class="g1o-card g1o-command-center"><div class="g1o-card-head"><div><span>MY WORK · FAST ROLE-BASED ACCESS</span><h2>Open a real workflow</h2><p>Jump directly into the selected house’s working register without hunting through modules.</p></div><button data-assist-tab="modules">Browse all 11</button></div><div class="g1o-quick-tools">${highUse.map(tool => { const count = records.filter(r => r.moduleNo === tool.no).length; return `<button data-assist-module="${tool.no}"><i>${String(tool.no).padStart(2, "0")}</i><span><b>${h(tool.short)}</b><small>${h(tool.capabilities[0])}</small></span><em>${count}</em></button>`; }).join("")}</div></article>
      <article class="g1o-card g1o-flow-map"><div class="g1o-card-head"><div><span>ONE WORKFLOW · ONE RECORD</span><h2>How the three platforms communicate</h2></div></div><div class="g1o-flow-steps"><span><i>Buildify</i><b>Plan + materials baseline</b><small>Feeds schedule inputs and change pricing</small></span><strong>→</strong><span><i>Assistify</i><b>Field execution + proof</b><small>Feeds progress, risks and approval requests</small></span><strong>→</strong><span><i>Growify</i><b>Client + revenue actions</b><small>Feeds acceptance, messages and payment status</small></span></div></article>
      <div class="g1o-two"><article class="g1o-card"><div class="g1o-card-head"><div><span>BUILD CONTROL</span><h2>Phase readiness</h2></div><button data-assist-tab="phases">Open checklist</button></div>${PHASES.map((name, i) => { const tasks = (project.phaseTasks || []).filter(t => t.phaseNo === i + 1), done = tasks.filter(t => t.completed).length, pct = tasks.length ? done / tasks.length * 100 : 0; return `<div class="g1o-phase-line"><i>${String(i + 1).padStart(2, "0")}</i><span><b>${h(name)}</b><em><u style="width:${pct}%"></u></em></span><strong>${done}/${tasks.length}</strong></div>`; }).join("")}</article>
      <article class="g1o-card"><div class="g1o-card-head"><div><span>RECENT ACTIVITY</span><h2>Shared house record</h2></div><button data-assist-tab="activity">All activity</button></div>${eventList(project, 12)}</article></div>`;
  }

  function phaseView(project) {
    return `<article class="g1o-card"><div class="g1o-card-head"><div><span>148-PAGE WORKBOOK · PHOENIX TEMPLATE</span><h2>15-phase execution checklist</h2><p>Each task, completion gate and status is saved to this house record.</p></div><b class="g1o-big-pct">${phaseProgress(project)}%</b></div><div class="g1o-phase-list">${PHASES.map((name, i) => { const tasks = (project.phaseTasks || []).filter(t => t.phaseNo === i + 1), done = tasks.filter(t => t.completed).length; return `<details class="g1o-phase" ${i === 0 ? "open" : ""}><summary><i>${String(i + 1).padStart(2, "0")}</i><span><b>${h(name)}</b><small>${done} of ${tasks.length} controls complete</small></span><em>${tasks.length ? Math.round(done / tasks.length * 100) : 0}%</em></summary><div class="g1o-phase-body"><p><b>Completion gate:</b> ${h(GATES[i])}</p>${tasks.map(task => `<label><input type="checkbox" data-phase-task="${h(task.id)}" ${task.completed ? "checked" : ""}><span>${h(task.label)}</span><em>${statusLabel(task.status)}</em></label>`).join("")}</div></details>`; }).join("")}</div></article>`;
  }

  function moduleCard(tool, project) {
    const records = (project.moduleRecords || []).filter(r => r.moduleNo === tool.no), open = records.filter(r => !["complete", "closed", "approved"].includes(r.status)).length;
    return `<button type="button" class="g1o-module-card ${S.moduleNo === tool.no ? "active" : ""}" data-module="${tool.no}" data-module-text="${h((tool.name + " " + tool.short + " " + tool.mission).toLowerCase())}"><i>${String(tool.no).padStart(2, "0")}</i><span><b>${h(tool.short)}</b><small>${h(tool.name)}</small></span><em>${records.length} records · ${open} open</em></button>`;
  }

  function moduleField(field, value, context) {
    const [key, label, type, options] = field, attr = context === "form" ? `name="payload_${h(key)}"` : `data-rec-payload="${h(key)}"`;
    const raw = type === "money" ? ((Number(value) || 0) / 100).toFixed(2) : (value ?? "");
    if (type === "select") return `<label>${h(label)}<select ${attr}>${options.map(option => `<option value="${h(option)}" ${String(raw) === option ? "selected" : ""}>${h(option)}</option>`).join("")}</select></label>`;
    return `<label>${h(label)}${type === "money" ? '<span class="g1o-field-money">$' : ""}<input ${attr} type="${type === "money" ? "number" : h(type)}" ${["money", "number"].includes(type) ? 'step=".01"' : ""} value="${h(raw)}">${type === "money" ? "</span>" : ""}</label>`;
  }

  function collectModulePayload(container, tool, formMode) {
    const result = {};
    tool.fields.forEach((field) => {
      const [key, , type] = field;
      const selector = formMode ? `[name="payload_${key}"]` : `[data-rec-payload="${key}"]`, input = container.querySelector(selector);
      if (!input) return;
      result[key] = type === "money" ? Math.round(Number(input.value || 0) * 100) : type === "number" ? Number(input.value || 0) : input.value;
    });
    return result;
  }

  function moduleKpi(tool, record) {
    const p = payload(record);
    if (tool.no === 7) return `<b>${Number(p.progress || 0)}%</b><small>${h(p.startDate || "No start")} → ${h(p.endDate || "No finish")}</small>`;
    if (tool.no === 9) return `<b>${Number(p.crewCount || 0)} crew · ${Number(p.laborHours || 0)} hrs</b><small>${Number(p.delayHours || 0)} delay hrs · ${h(p.weather || "conditions pending")}</small>`;
    if ([12, 17].includes(tool.no)) return `<b>${money(p.costImpactCents || 0)}</b><small>${Number(p.scheduleImpactDays || 0)} schedule days</small>`;
    if (tool.no === 22) return `<b>${Number(p.workers || 0)} people · ${Number(p.hours || 0)} hrs</b><small>${h(p.costCode || "No cost code")}</small>`;
    return `<b>${statusLabel(record.status)}</b><small>${h(record.dueDate || p.responseDue || p.expiresOn || "No due date")}</small>`;
  }

  function moduleWorkbench(project) {
    const tool = MODULES.find(m => m.no === S.moduleNo) || MODULES[0], records = (project.moduleRecords || []).filter(r => r.moduleNo === tool.no), groups = ["All", ...new Set(MODULES.map(m => m.group))], shown = MODULES.filter(m => S.moduleGroup === "All" || m.group === S.moduleGroup);
    return `<div class="g1o-module-layout"><div class="g1o-module-catalog"><div class="g1o-search wide"><input data-module-search placeholder="Search 11 execution tools"><b>${MODULES.length} active</b></div><div class="g1o-module-groups">${groups.map(group => `<button data-module-group-filter="${h(group)}" class="${S.moduleGroup === group ? "active" : ""}">${h(group)}</button>`).join("")}</div>${shown.map(m => moduleCard(m, project)).join("")}</div>
      <article class="g1o-card g1o-module-work"><div class="g1o-module-title"><i>${String(tool.no).padStart(2, "0")}</i><div><span>${h(tool.group.toUpperCase())}</span><h2>${h(tool.name)}</h2><p>${h(tool.mission)}</p></div></div><div class="g1o-capabilities">${tool.capabilities.map(cap => `<span>✓ ${h(cap)}</span>`).join("")}</div>
      <form data-module-form class="g1o-record-form"><h3>Create ${h(tool.recordType)}</h3><div class="g1o-core-fields"><label>Title<input name="title" required placeholder="New ${h(tool.recordType.toLowerCase())}"></label><label>Status<select name="status"><option>open</option><option>in_progress</option><option>waiting</option><option>approved</option><option>complete</option></select></label><label>Accountable owner<input name="owner" placeholder="Responsible person"></label><label>Due date<input name="dueDate" type="date"></label></div><div class="g1o-module-fields">${tool.fields.map(field => moduleField(field, "", "form")).join("")}</div><label>Scope, result or evidence<textarea name="notes" rows="3" placeholder="Record the requirement, decision, result or evidence link"></textarea></label>${tool.needsPhoto ? '<label class="g1o-photo-upload">Photo evidence<input name="evidencePhotos" type="file" accept=".png,.jpg,.jpeg,.webp,.tif,.tiff" multiple><small>Add one or more jobsite photos now, or attach more after saving.</small></label>' : ""}<button type="submit">Create ${h(tool.recordType)}</button></form>
      <div class="g1o-record-list"><h3>${records.length} ${h(tool.recordType)} record${records.length === 1 ? "" : "s"}</h3>${records.length ? records.map(record => moduleRecordRow(record, project)).join("") : `<p class="g1o-empty">No records yet. Add the first ${h(tool.recordType.toLowerCase())} above.</p>`}</div></article></div>`;
  }

  function moduleRecordRow(record, project) {
    const tool = MODULES.find(m => m.no === record.moduleNo) || MODULES[0], p = payload(record);
    const photos = (project.files || []).filter(file => file.documentType === `module_evidence:${record.id}`);
    return `<article class="g1o-record" data-module-record="${h(record.id)}"><header><div><b>${h(record.title)}</b><small>${h(record.recordType)} · ${h((record.updatedAt || record.createdAt || "").slice(0, 10))}</small></div><span>${moduleKpi(tool, record)}</span></header><div class="g1o-record-controls"><label>Status<select data-rec-field="status"><option ${record.status === "open" ? "selected" : ""}>open</option><option value="in_progress" ${record.status === "in_progress" ? "selected" : ""}>in progress</option><option ${record.status === "waiting" ? "selected" : ""}>waiting</option><option ${record.status === "approved" ? "selected" : ""}>approved</option><option ${record.status === "complete" ? "selected" : ""}>complete</option></select></label><label>Owner<input data-rec-field="owner" value="${h(record.owner)}" placeholder="Owner"></label><label>Due date<input data-rec-field="dueDate" type="date" value="${h(record.dueDate || "")}"></label>${tool.fields.map(field => moduleField(field, p[field[0]], "record")).join("")}<label class="g1o-record-notes">Notes / evidence<textarea data-rec-field="notes" rows="2">${h(record.notes)}</textarea></label></div>${tool.needsPhoto ? `<div class="g1o-evidence"><div class="g1o-evidence-head"><span><b>Photo evidence</b><small>${photos.length} attached</small></span><label>Add photos<input class="g1o-sr-file" type="file" data-module-photo="${h(record.id)}" accept=".png,.jpg,.jpeg,.webp,.tif,.tiff" multiple></label></div><div class="g1o-evidence-grid">${photos.length ? photos.map(file => `<a href="${h(fileHref(project, file))}" target="_blank" rel="noopener"><img src="${h(fileHref(project, file))}" alt="${h(file.filename)}"><small>${h(file.filename)}</small></a>`).join("") : '<p>No photos attached yet.</p>'}</div></div>` : ""}<footer><button type="button" data-save-module-record>Save changes</button><button type="button" class="danger" data-delete-module-record>Delete</button></footer></article>`;
  }

  function calendarEvents(project) {
    const events = [];
    (project.moduleRecords || []).forEach(record => {
      const p = payload(record), tool = MODULES.find(item => item.no === record.moduleNo);
      if (!tool) return;
      const dates = [
        [record.dueDate, "Due"], [p.startDate, "Starts"], [p.endDate, "Forecast finish"], [p.logDate, "Daily log"],
        [p.workDate, "Crew work"], [p.responseDue, "Response due"], [p.expiresOn, "Expires"]
      ];
      const seen = new Set();
      dates.forEach(([date, kind]) => {
        if (!date || seen.has(date)) return;
        seen.add(date); events.push({ date: String(date), kind, title: record.title, status: record.status, tool });
      });
    });
    return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }

  function calendarView(project) {
    const events = calendarEvents(project);
    const icsText = value => String(value || "").replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Builder Assist//Project Calendar//EN"];
    events.forEach((event, index) => { const day = event.date.replaceAll("-", ""); lines.push("BEGIN:VEVENT", `UID:${project.id}-${index}@builder-assist`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${icsText(event.title)}`, `DESCRIPTION:${icsText(event.tool.name)} - ${icsText(event.kind)}`, "END:VEVENT"); });
    lines.push("END:VCALENDAR");
    const href = "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
    return `<article class="g1o-card g1o-calendar"><div class="g1o-card-head"><div><span>PROJECT-SCOPED CALENDAR</span><h2>${h(project.name)} schedule and due dates</h2><p>Every Assistify record with a start, finish, due, log, work, response or expiration date appears here automatically.</p></div><a class="g1o-calendar-export" download="${h(project.name.replaceAll(" ", "-").toLowerCase())}-calendar.ics" href="${h(href)}">Export calendar (.ics)</a></div><div class="g1o-calendar-ready"><i aria-hidden="true">G</i><span><b>Google Calendar import ready</b><small>Export the .ics file, then use Google Calendar → Settings → Import &amp; export to choose the destination calendar. This is a one-time import, not two-way sync.</small></span></div><div class="g1o-calendar-list">${events.length ? events.map(event => `<button data-assist-module="${event.tool.no}"><time datetime="${h(event.date)}"><b>${h(event.date.slice(8, 10))}</b><small>${h(new Date(event.date + "T12:00:00").toLocaleString("en-US", { month: "short" }))}</small></time><span><i>${h(event.tool.short)}</i><b>${h(event.title)}</b><small>${h(event.kind)} · ${statusLabel(event.status)}</small></span><em>Open →</em></button>`).join("") : '<p class="g1o-empty">Add a date to any Assistify record and it will appear here.</p>'}</div></article>`;
  }

  function modelView(project) {
    const plans = (project.files || []).filter(file => !String(file.documentType).startsWith("module_evidence:")), plan = plans[0], href = plan ? fileHref(project, plan) : "", isSwenka = project.address.includes("12228 N 66th St"), floorImage = isSwenka ? "/project-plans/swenka-floor-plan.png" : "";
    return `<article class="g1o-card g1o-plan-model"><div class="g1o-card-head"><div><span>ACTIVE HOUSE · PLAN-TO-MODEL WORKSPACE</span><h2>${h(project.name)} plans and spatial view</h2><p>The selected house’s real plan set is displayed beside its project-specific spatial workspace—another property is never substituted.</p></div>${plan ? `<a href="${h(href)}" target="_blank" rel="noopener">Open full plan set</a>` : ""}</div>${plan ? `<div class="g1o-plan-model-grid"><section class="g1o-plan-pane"><header><span><b>Approved plan source</b><small>${h(plan.filename)} · ${statusLabel(plan.analysisStatus)}</small></span><label>Zoom<input type="range" min="70" max="180" value="100" data-plan-zoom></label></header><div class="g1o-plan-scroll">${floorImage ? `<img data-plan-image src="${floorImage}" alt="${h(project.name)} approved A103 floor plan">` : `<iframe src="${h(href)}#view=FitH" title="${h(project.name)} plan set"></iframe>`}</div></section><section class="g1o-spatial-pane"><header><span>PLAN-LINKED 2.5D PREVIEW</span><b>${h(project.name)}</b><small>Actual A103 sheet · selected house only · not BIM geometry</small></header>${floorImage ? `<div class="g1o-spatial-stage"><div class="g1o-spatial-floor"><img src="${floorImage}" alt=""></div><i class="wall w1"></i><i class="wall w2"></i><i class="wall w3"></i></div>` : '<div class="g1o-model-pending"><b>Plan linked</b><span>A house-specific 3D geometry file has not been generated for this uploaded plan set yet.</span></div>'}<div class="g1o-spatial-facts"><span><small>Conditioned area</small><b>${Number(project.squareFeet).toLocaleString()} sf</b></span><span><small>Garage</small><b>${project.garageBays} bays</b></span><span><small>Source</small><b>${h(plan.documentType)}</b></span></div></section></div>` : '<p class="g1o-empty">Upload a plan set from the house rail to activate the plan and spatial workspace.</p>'}</article>`;
  }
  function eventList(project, limit) {
    const events = (project.events || []).slice(0, limit || 60);
    return events.length ? `<div class="g1o-events">${events.map(event => `<div><i></i><span><b>${h(event.title)}</b><small>${h(event.detail)} · ${h((event.createdAt || "").replace("T", " ").slice(0, 16))}</small></span><em>${statusLabel(event.eventType)}</em></div>`).join("")}</div>` : '<p class="g1o-empty">No activity recorded yet.</p>';
  }
  function activityView(project) { return `<article class="g1o-card"><div class="g1o-card-head"><div><span>AUDITABLE PROJECT HISTORY</span><h2>Cross-application activity</h2><p>Buildify, Assistify and Growify actions are recorded against this house.</p></div></div>${eventList(project, 60)}</article>`; }

  function assistify(project) {
    let body = S.assistTab === "calendar" ? calendarView(project) : S.assistTab === "phases" ? phaseView(project) : S.assistTab === "modules" ? moduleWorkbench(project) : S.assistTab === "model" ? modelView(project) : S.assistTab === "activity" ? activityView(project) : assistOverview(project);
    return `${projectHeader(project, "ASSISTIFY", "Construction execution without overlap", "Eleven workbook-backed tools operate real schedules, logs, RFIs, photo evidence, quality, changes, crews and trade actions for the selected house.")}${syncStrip(project)}${assistNav()}${body}`;
  }

  const GROW_TABS = [["dashboard", "Dashboard"], ["crm", "CRM"], ["campaigns", "Campaigns"], ["inbox", "Inbox"], ["appointments", "Appointments"], ["proposals", "Proposals"], ["payments", "Payments"], ["automations", "Automations"], ["reports", "Reports"]];
  function growNav() { return `<nav class="g1o-subnav g1o-grow-tabs">${GROW_TABS.map(([id, label]) => `<button type="button" data-grow-tab="${id}" class="${S.growTab === id ? "active" : ""}">${label}</button>`).join("")}</nav>`; }
  function growRecords(project, kind) { return (project.growifyRecords || []).filter(r => r.kind === kind); }
  function growDashboard(project) {
    const leads = growRecords(project, "lead"), campaigns = growRecords(project, "campaign"), invoices = growRecords(project, "invoice"), proposals = growRecords(project, "proposal");
    const pipeline = leads.filter(x => !["lost", "won"].includes(x.status)).reduce((s, x) => s + x.valueCents, 0);
    const won = leads.filter(x => x.status === "won").reduce((s, x) => s + x.valueCents, 0);
    const collected = invoices.filter(x => x.status === "paid").reduce((s, x) => s + x.valueCents, 0);
    return `<div class="g1o-summary"><span class="strong"><small>Open pipeline</small><b>${money(pipeline)}</b><em>${leads.length} correlated lead records</em></span><span><small>Won value</small><b>${money(won)}</b><em>${leads.filter(x => x.status === "won").length} won</em></span><span><small>Active campaigns</small><b>${campaigns.filter(x => x.status === "active").length}</b><em>${campaigns.length} total campaigns</em></span><span><small>Collected</small><b>${money(collected)}</b><em>${invoices.filter(x => x.status === "paid").length} paid invoices</em></span></div>
      <div class="g1o-two"><article class="g1o-card"><div class="g1o-card-head"><div><span>LEAD-TO-REFERRAL</span><h2>${h(project.name)} lifecycle</h2></div><button data-grow-tab="crm">Open CRM</button></div>${leads.length ? leads.map(leadCard).join("") : '<p class="g1o-empty">No leads yet.</p>'}</article>
      <article class="g1o-card"><div class="g1o-card-head"><div><span>REVENUE ACTIONS</span><h2>Next actions</h2></div></div>${growActionSummary(project, proposals, invoices, campaigns)}</article></div>`;
  }
  function growActionSummary(project, proposals, invoices, campaigns) {
    const rows = [
      ["Campaigns", campaigns.filter(x => x.status === "active").length + " active", "campaigns"], ["Proposals", proposals.filter(x => x.status !== "accepted").length + " pending", "proposals"],
      ["Payments", invoices.filter(x => x.status !== "paid").length + " outstanding", "payments"], ["Automations", growRecords(project, "automation").filter(x => x.status === "active").length + " running", "automations"]
    ];
    return `<div class="g1o-action-list">${rows.map(([label, value, tab]) => `<button data-grow-tab="${tab}"><span><b>${label}</b><small>${value}</small></span><i>→</i></button>`).join("")}</div>`;
  }
  function leadCard(lead) { const p = payload(lead); return `<div class="g1o-lead"><div><b>${h(lead.title)}</b><small>${h(lead.contactName || "Contact pending")} · ${h(p.source || "Direct")}</small></div><span>${money(lead.valueCents)}</span><em>${statusLabel(lead.status)}</em></div>`; }

  function growForm(kind, labels) {
    const isValue = ["lead", "proposal", "invoice"].includes(kind), isContact = ["lead", "message", "appointment"].includes(kind);
    return `<form data-grow-form="${kind}" class="g1o-record-form"><h3>Add ${h(labels.singular)}</h3><div><label>${h(labels.title)}<input name="title" required></label>${isContact ? '<label>Contact name<input name="contactName"></label><label>Email<input type="email" name="email"></label><label>Phone<input name="phone"></label>' : ""}${isValue ? '<label>Value ($)<input type="number" name="value" min="0" step=".01"></label>' : ""}<label>Status<select name="status">${(labels.statuses || ["active", "paused", "complete"]).map(s => `<option value="${h(s)}">${statusLabel(s)}</option>`).join("")}</select></label></div><label>${h(labels.detail || "Details")}<textarea name="detail" rows="3"></textarea></label><button type="submit">Create ${h(labels.singular)}</button></form>`;
  }
  const GROW_CONFIG = {
    crm: { kind: "lead", singular: "lead", title: "Opportunity / property", detail: "Next action, lead source or notes", statuses: ["new", "qualified", "appointment", "proposal", "won", "lost"] },
    campaigns: { kind: "campaign", singular: "campaign", title: "Campaign name", detail: "Audience, channels and message goal", statuses: ["draft", "active", "paused", "complete"] },
    inbox: { kind: "message", singular: "message", title: "Subject / conversation", detail: "Message content", statuses: ["draft", "queued", "sent", "replied"] },
    appointments: { kind: "appointment", singular: "appointment", title: "Meeting / site visit", detail: "Date, time, location and preparation", statuses: ["scheduled", "confirmed", "complete", "cancelled"] },
    proposals: { kind: "proposal", singular: "proposal", title: "Proposal name", detail: "Scope, version and signature notes", statuses: ["draft", "sent", "viewed", "accepted", "declined"] },
    payments: { kind: "invoice", singular: "invoice", title: "Invoice / deposit", detail: "Due date, method and collection notes", statuses: ["draft", "sent", "due", "paid", "overdue"] },
    automations: { kind: "automation", singular: "automation", title: "Automation name", detail: "Trigger → action → stop condition", statuses: ["active", "paused"] }
  };

  function growCrud(project, tab) {
    const config = GROW_CONFIG[tab], records = growRecords(project, config.kind);
    return `<div class="g1o-grow-layout"><article class="g1o-card">${growForm(config.kind, config)}</article><article class="g1o-card"><div class="g1o-card-head"><div><span>${h(tab.toUpperCase())}</span><h2>${records.length} ${h(config.singular)} record${records.length === 1 ? "" : "s"}</h2><p>Every record below is correlated to ${h(project.name)}.</p></div></div><div class="g1o-grow-records">${records.length ? records.map(record => growRecordRow(record, config)).join("") : `<p class="g1o-empty">No ${h(config.singular)} records yet.</p>`}</div></article></div>`;
  }
  function growRecordRow(record, config) {
    const p = payload(record);
    return `<div class="g1o-grow-record" data-grow-record="${h(record.id)}"><div class="g1o-grow-record-head"><span><b>${h(record.title)}</b><small>${h(record.contactName || p.audience || config.singular)} · ${h((record.updatedAt || record.createdAt || "").slice(0, 10))}</small></span>${record.valueCents ? `<strong>${money(record.valueCents)}</strong>` : ""}</div><div class="g1o-grow-edit"><select data-grow-field="status">${config.statuses.map(s => `<option value="${h(s)}" ${record.status === s ? "selected" : ""}>${statusLabel(s)}</option>`).join("")}</select><input data-grow-field="title" value="${h(record.title)}"><input data-grow-field="contactName" value="${h(record.contactName)}" placeholder="Contact"><input data-grow-field="email" value="${h(record.email)}" placeholder="Email"><input data-grow-field="phone" value="${h(record.phone)}" placeholder="Phone">${["lead", "proposal", "invoice"].includes(record.kind) ? `<label class="g1o-money-input">$<input data-grow-field="value" type="number" step=".01" value="${(record.valueCents / 100).toFixed(2)}"></label>` : ""}<textarea data-grow-field="detail" rows="2">${h(p.detail || p.nextAction || p.action || "")}</textarea><button type="button" data-save-grow-record>Save</button><button type="button" class="danger" data-delete-grow-record>Delete</button></div></div>`;
  }
  function growReports(project) {
    const leads = growRecords(project, "lead"), won = leads.filter(x => x.status === "won"), proposals = growRecords(project, "proposal"), invoices = growRecords(project, "invoice");
    const leadValue = leads.reduce((s, x) => s + x.valueCents, 0), wonValue = won.reduce((s, x) => s + x.valueCents, 0), proposalValue = proposals.reduce((s, x) => s + x.valueCents, 0), invoiced = invoices.reduce((s, x) => s + x.valueCents, 0), collected = invoices.filter(x => x.status === "paid").reduce((s, x) => s + x.valueCents, 0);
    return `<article class="g1o-card"><div class="g1o-card-head"><div><span>LIVE PROJECT KPIs</span><h2>${h(project.name)} growth report</h2><p>Calculated directly from this house’s Growify records—no demo totals.</p></div></div><div class="g1o-report-grid"><span><small>Total opportunity value</small><b>${money(leadValue)}</b></span><span><small>Won value</small><b>${money(wonValue)}</b></span><span><small>Close rate</small><b>${leads.length ? Math.round(won.length / leads.length * 100) : 0}%</b></span><span><small>Proposal value</small><b>${money(proposalValue)}</b></span><span><small>Invoiced</small><b>${money(invoiced)}</b></span><span><small>Collected</small><b>${money(collected)}</b></span></div><div class="g1o-funnel"><i style="--w:100%"><span>Leads</span><b>${leads.length}</b></i><i style="--w:${leads.length ? Math.max(12, proposals.length / leads.length * 100) : 12}%"><span>Proposals</span><b>${proposals.length}</b></i><i style="--w:${leads.length ? Math.max(12, won.length / leads.length * 100) : 12}%"><span>Won</span><b>${won.length}</b></i></div></article>`;
  }
  function growify(project) {
    const body = S.growTab === "dashboard" ? growDashboard(project) : S.growTab === "reports" ? growReports(project) : growCrud(project, S.growTab);
    return `${projectHeader(project, "GROWIFY", "The full front-office application", "CRM, campaigns, conversations, appointments, proposals, payments, automations and reports all operate on the selected house.")}${syncStrip(project)}${growNav()}${body}`;
  }

  window.viewContractorPortal = function (sub) {
    S.app = sub === "assistify-operations" ? "assistify" : ["buildify", "assistify", "growify"].includes(sub) ? sub : "buildify";
    if (!S.loaded && !S.loading) queueMicrotask(hydrate);
    if (!S.loaded || !active()) return loadingView();
    const project = active();
    return shell(S.app === "assistify" ? assistify(project) : S.app === "growify" ? growify(project) : buildify(project));
  };

  document.addEventListener("click", async event => {
    const target = event.target.closest("button,a,label"); if (!target) return;
    if (target.matches("[data-g1o-retry]")) { hydrate(); return; }
    if (target.dataset.g1oProject) { S.activeId = target.dataset.g1oProject; S.compareCategory = "All"; sessionStorage.setItem("g1o-active", S.activeId); draw(false); return; }
    if (target.dataset.assistTab) { S.assistTab = target.dataset.assistTab; draw(); return; }
    if (target.dataset.assistModule) { S.moduleNo = Number(target.dataset.assistModule); S.assistTab = "modules"; draw(); return; }
    if (target.dataset.growTab) { S.growTab = target.dataset.growTab; draw(); return; }
    if (target.dataset.module) { S.moduleNo = Number(target.dataset.module); draw(); return; }
    if (target.dataset.moduleGroupFilter) { S.moduleGroup = target.dataset.moduleGroupFilter; draw(); return; }
    if (target.matches("[data-save-finish]")) { const row = target.closest("[data-finish-row]"); await mutate("update_finish", { id: row.dataset.finishRow, selected: row.querySelector('[data-fin-field="selected"]').checked, item: row.querySelector('[data-fin-field="item"]').value, vendor: row.querySelector('[data-fin-field="vendor"]').value, quantity: Number(row.querySelector('[data-fin-field="quantity"]').value), unitCostCents: Math.round(Number(row.querySelector('[data-fin-field="unitCost"]').value) * 100) }); draw(); return; }
    if (target.matches("[data-delete-finish]")) { const row = target.closest("[data-finish-row]"); if (!window.confirm("Delete this finish selection?")) return; await mutate("delete_record", { id: row.dataset.finishRow, recordType: "finish" }); draw(); return; }
    if (target.matches("[data-save-module-record]")) { const row = target.closest("[data-module-record]"), rec = (active().moduleRecords || []).find(x => x.id === row.dataset.moduleRecord), tool = MODULES.find(m => m.no === rec.moduleNo); await mutate("update_module_record", { id: rec.id, status: row.querySelector('[data-rec-field="status"]').value, owner: row.querySelector('[data-rec-field="owner"]').value, dueDate: row.querySelector('[data-rec-field="dueDate"]').value, notes: row.querySelector('[data-rec-field="notes"]').value, payload: collectModulePayload(row, tool, false) }); draw(); return; }
    if (target.matches("[data-delete-module-record]")) { const row = target.closest("[data-module-record]"); if (!window.confirm("Delete this Assistify record and its attached photo evidence?")) return; await mutate("delete_record", { id: row.dataset.moduleRecord, recordType: "module" }); draw(); return; }
    if (target.matches("[data-save-grow-record]")) { const row = target.closest("[data-grow-record]"), rec = (active().growifyRecords || []).find(x => x.id === row.dataset.growRecord); await mutate("update_growify_record", { id: rec.id, status: row.querySelector('[data-grow-field="status"]').value, title: row.querySelector('[data-grow-field="title"]').value, contactName: row.querySelector('[data-grow-field="contactName"]').value, email: row.querySelector('[data-grow-field="email"]').value, phone: row.querySelector('[data-grow-field="phone"]').value, valueCents: row.querySelector('[data-grow-field="value"]') ? Math.round(Number(row.querySelector('[data-grow-field="value"]').value) * 100) : rec.valueCents, payload: { ...payload(rec), detail: row.querySelector('[data-grow-field="detail"]').value } }); draw(); return; }
    if (target.matches("[data-delete-grow-record]")) { const row = target.closest("[data-grow-record]"); if (!window.confirm("Delete this Growify record?")) return; await mutate("delete_record", { id: row.dataset.growRecord, recordType: "growify" }); draw(); return; }
  }, true);

  document.addEventListener("change", async event => {
    const input = event.target;
    if (input.matches("[data-g1o-upload]")) {
      const files = [...(input.files || [])]; if (!files.length) return;
      const validationError = validateFiles(files, false); if (validationError) { toast(validationError, true); input.value = ""; return; }
      busy(true); toast(`Creating one house from ${files.length} document${files.length === 1 ? "" : "s"}…`);
      try {
        const houseName = files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
        const upload = await uploadToken(files, "new-house");
        const form = new FormData(); form.append("createProjectName", houseName || "New House"); files.forEach(file => form.append("plans", file));
        form.append("idempotencyKey", upload.token);
        const response = await fetch(API, { method: "POST", body: form }), result = await response.json();
        if (!response.ok) throw new Error(result.error || "House creation failed");
        localStorage.removeItem(upload.storageKey);
        const created = result.project;
        replaceProject(created); S.activeId = created.id; sessionStorage.setItem("g1o-active", S.activeId); S.app = "buildify"; history.replaceState(null, "", "#/member-portal/buildify"); toast(`${files.length} documents linked to one new house`); draw(false);
      } catch (error) { toast(error.message || "Upload did not complete. Incomplete plan sets are rolled back.", true); } finally { busy(false); input.value = ""; }
      return;
    }
    if (input.matches("[data-g1o-category-select]")) { S.compareCategory = input.value; draw(); return; }
    if (input.matches("[data-module-photo]")) {
      const files = [...(input.files || [])]; if (!files.length) return;
      const validationError = validateFiles(files, true); if (validationError) { toast(validationError, true); input.value = ""; return; }
      busy(true);
      try { await uploadProjectFiles(active().id, files, input.dataset.modulePhoto); toast(`${files.length} photo${files.length === 1 ? "" : "s"} attached`); draw(); }
      catch (error) { toast(error.message || "Photo upload failed", true); }
      finally { busy(false); input.value = ""; }
      return;
    }
    if (input.matches("[data-phase-task]")) { await mutate("toggle_phase_task", { id: input.dataset.phaseTask, completed: input.checked }, true); draw(); return; }
    if (input.matches("[data-est-field]")) {
      const row = input.closest("[data-est-row]"); await mutate("update_estimate_line", { id: row.dataset.estRow, included: row.querySelector('[data-est-field="included"]').checked, quantity: Number(row.querySelector('[data-est-field="quantity"]').value), unitCostCents: Math.round(Number(row.querySelector('[data-est-field="unitCost"]').value) * 100) }, true); draw(); return;
    }
  }, true);

  document.addEventListener("input", event => {
    const input = event.target;
    if (input.matches("[data-module-search]")) { const q = input.value.toLowerCase(); document.querySelectorAll("[data-module-text]").forEach(row => row.style.display = !q || row.dataset.moduleText.includes(q) ? "" : "none"); }
    if (input.matches("[data-plan-zoom]")) { const image = document.querySelector("[data-plan-image]"); if (image) image.style.width = input.value + "%"; }
  });

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.matches("[data-g1o-project-form]")) { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const saved = await mutate("update_project", { patch: data }); if (saved) await mutate("recalculate_estimate", {}, true); draw(); return; }
    if (form.matches("[data-finish-form]")) { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const saved = await mutate("add_finish", { category: data.category, item: data.item, vendor: data.vendor, quantity: Number(data.quantity || 1), unitCostCents: Math.round(Number(data.unitCost || 0) * 100), selected: true }); if (saved) form.reset(); draw(); return; }
    if (form.matches("[data-module-form]")) {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form)), tool = MODULES.find(m => m.no === S.moduleNo) || MODULES[0], photoInput = form.querySelector('[name="evidencePhotos"]'), photos = photoInput ? [...photoInput.files] : [];
      const validationError = validateFiles(photos, true); if (photos.length && validationError) { toast(validationError, true); return; }
      const saved = await mutate("add_module_record", { moduleNo: tool.no, recordType: tool.recordType, title: data.title, status: data.status, owner: data.owner, dueDate: data.dueDate, notes: data.notes, payload: collectModulePayload(form, tool, true) });
      if (saved && photos.length && S.lastMutation && S.lastMutation.recordId) {
        busy(true); try { await uploadProjectFiles(saved.id, photos, S.lastMutation.recordId); toast(`${photos.length} photo${photos.length === 1 ? "" : "s"} attached`); } catch (error) { toast(error.message || "Record saved, but photo upload failed", true); } finally { busy(false); }
      }
      draw(); return;
    }
    if (form.matches("[data-grow-form]")) { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); await mutate("add_growify_record", { kind: form.dataset.growForm, title: data.title, status: data.status, contactName: data.contactName || "", email: data.email || "", phone: data.phone || "", valueCents: Math.round(Number(data.value || 0) * 100), payload: { detail: data.detail || "" } }); draw(); return; }
  }, true);

  try {
    if (typeof render === "function") render();
  } catch (error) { console.error(error); }
})();
