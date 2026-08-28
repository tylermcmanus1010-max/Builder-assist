import fs from "node:fs";

const out = new URL("../docs/launch/research-synthesis.json", import.meta.url);
const patterns = (items) => items.map(([pattern, source_ids, implication], index) => ({ rank:index+1, pattern, source_ids, implication }));

const delights = patterns([
  ["Fast time from first upload to a useful project view",["S001","S011","S086","S097"],"Make the controlled plan register and first model state the first successful outcome."],
  ["One project context shared across estimating, delivery and customer workflows",["S012","S016","S220","S223"],"Keep a persistent project rail and one server-side project identifier."],
  ["Field access on phones and tablets",["S031","S052","S053","S055"],"Use large reachable controls, internal scrolling and a compact mobile tool dock."],
  ["Visual understanding of construction intent",["S088","S099","S161","S163"],"Use inspectable 3D linked to plan evidence."],
  ["Quick search, filters and organization",["S008","S019","S025","S229"],"Keep projects, stages, layers and records easy to locate."],
  ["One multi-document plan-set upload",["S094","S096","S098","S110"],"Accept related sheets together and report one atomic project outcome."],
  ["Plan viewing and markup near field records",["S037","S040","S111","S113"],"Keep source sheets reachable from selected objects and workflow records."],
  ["Reliable measurement with unit feedback",["S038","S041","S113"],"Always show units and distinguish model measurements from written controls."],
  ["Useful interrupted/offline behavior",["S107","S108","S120"],"Preserve safe preferences and never report unsynced writes as saved."],
  ["Collaboration without losing responsibility",["S087","S091","S217","S230"],"Expose owner, status, due date and history."],
  ["Timely notifications tied to a clear action",["S089","S222","S224"],"Make alerts actionable and traceable to the project record."],
  ["Integrations that reduce re-entry",["S090","S228","S230"],"Integrate only when failure and ownership are visible."],
  ["Reusable project templates",["S014","S026","S219"],"Keep construction-stage defaults editable without cloning unrelated data."],
  ["Construction scheduling connected to work",["S016","S162","S163","S241"],"Link visible stages to actual objects and source tasks."],
  ["Photo evidence organized by place and purpose",["S018","S091","S223"],"Persist image evidence on the owning project/record."],
  ["Daily field records that are quick to complete",["S017","S022","S087"],"Use short forms, sensible defaults and a durable audit trail."],
  ["Undo, retry and recovery instead of punishment",["S120","S155","S156","S184","S186"],"Preserve work, use idempotency and explain the safe next action."],
  ["Revision history and clear controlling plans",["S056","S103","S111"],"Inventory every sheet, revision and superseded state."],
  ["Export and data ownership",["S006","S021","S228"],"Keep source files and structured evidence portable."],
  ["Source traceability for model claims",["S076","S080","S161","S165"],"Attach source sheet/detail and evidence state to significant objects."],
  ["Transparent processing and save status",["S045","S048","S170","S200"],"Use honest loading, success and error states with incident IDs."],
  ["Responsive layouts that keep controls visible",["S121","S137","S139","S198"],"Bind the workspace to the viewport and scroll only intentional panels."],
  ["Keyboard-operable alternatives",["S136","S138","S142","S144"],"Provide semantic tool buttons, focus containment and a nonvisual object register."],
  ["Layer isolation for trade-specific work",["S032","S044","S050","S114"],"Expose synchronized layers and an underground isolation mode."],
  ["Section and clipping inspection",["S114","S150","S151","S154"],"Make cutaway/section controls stable and resettable."],
  ["4D sequencing that explains build order",["S162","S163","S241","S242"],"Use exactly 12 object-driven stages with cumulative/current modes."],
  ["Authoritative parcel context",["S115","S116","S117","S118"],"Record agency, record, retrieval date, CRS and confidence."],
  ["Terrain and grade context",["S212","S243","S245"],"Show existing/proposed grades without undisclosed exaggeration."],
  ["Professional presentation that remains technically honest",["S092","S099","S236","S240"],"Pair realistic/technical views with visible uncertainty."],
  ["AI assistance that accelerates review without replacing judgment",["S076","S077","S080","S084"],"Keep AI output reviewable, source-linked and explicitly non-authoritative."]
]);

const pains = patterns([
  ["Slow, complex onboarding before a first useful result",["S001","S009","S086"],"Minimize setup and show a controlled result early."],
  ["Too many menus and modules with unclear starting points",["S005","S013","S025"],"Use progressive disclosure and task-oriented labels."],
  ["Decorative dashboards whose controls do not complete work",["S004","S012","S023"],"Remove dead controls and test every visible action."],
  ["Mobile model viewer loads blank",["S031","S052","S053"],"Provide loading/failure states and a nonvisual fallback."],
  ["Large models run slowly or freeze",["S042","S047","S054","S191"],"Cap DPR/geometry and release GPU resources."],
  ["Viewer loses the model or traps the camera",["S033","S044","S050"],"Provide stable fit/reset and bounded controls."],
  ["Uploads fail without explaining which file caused it",["S048","S094","S098","S166"],"Validate per file and return an actionable message."],
  ["Refresh loses upload or viewer progress",["S056","S107","S120"],"Persist critical state and keep retries idempotent."],
  ["Duplicate clicks create duplicate projects or side effects",["S184","S186","S187"],"Use server-side idempotency keys."],
  ["Silent sync conflicts overwrite newer work",["S108","S185","S204"],"Detect conflicts and never silently overwrite."],
  ["Plan revisions are hard to identify",["S056","S103","S111"],"Show revision, approval and superseded status."],
  ["Missing sheet inventory hides scope",["S076","S083","S097"],"Register every supplied sheet before modeling."],
  ["One-click AI quantities look precise but are wrong",["S076","S077","S080","S084"],"Require human verification and written-dimension controls."],
  ["Model geometry is not traceable to drawings",["S081","S088","S161"],"Store object provenance and ambiguity."],
  ["Inferred geometry looks identical to verified geometry",["S082","S165","S236"],"Use visible and textual evidence states."],
  ["4D sequence is an animation with no task/object linkage",["S162","S163","S241"],"Drive visibility from stage metadata."],
  ["Underground systems are hidden by terrain/building",["S099","S114","S245"],"Provide x-ray, cutaway and underground-only modes."],
  ["Detailed utility routes are invented where plans are schematic",["S076","S080","S164"],"Represent zones or mark not shown."],
  ["GIS boundaries are treated as survey accuracy",["S115","S116","S118"],"Display agency caveats and keep legal-layout gate closed."],
  ["Parcel IDs and lot areas conflict across sources",["S115","S117","S243"],"Show the conflict until authoritative reconciliation."],
  ["Road frontage is confused with pavement or ROW",["S116","S118","S243"],"Model distinct line types and verify the frontage intersection."],
  ["Adjacent owner names substitute for parcel IDs",["S115","S117"],"Use sourced APNs or 'Parcel ID unavailable'."],
  ["Terrain exaggeration is undisclosed",["S212","S243"],"Default true scale and label any exaggeration."],
  ["Section/clipping controls are difficult to reset",["S114","S150","S154"],"Provide a stable reset path."],
  ["Floating panels become lost offscreen",["S121","S137","S194"],"Dock/clamp panels and provide Reset Layout."],
  ["Nested scrolling traps users",["S139","S140","S198"],"Keep page scrolling disabled and panel scrolling intentional."],
  ["Controls run offscreen at high zoom",["S137","S139","S140"],"Reflow the shell and use scrollable tool rails."],
  ["Tiny touch targets fail in field use",["S052","S055","S147"],"Use reachable, labeled touch controls."],
  ["Keyboard focus disappears or escapes dialogs",["S138","S142","S148"],"Use visible focus and focus containment."],
  ["Canvas-only data excludes screen-reader users",["S136","S144","S149"],"Provide a structured object/provenance table."],
  ["Color alone communicates verification",["S140","S143","S160"],"Pair color with explicit status text."],
  ["Error messages expose internals or offer no recovery",["S155","S156","S170"],"Use safe copy, incident IDs and retry guidance."],
  ["False success is shown before storage commits",["S170","S184","S201"],"Confirm D1/R2 persistence first."],
  ["Authentication fallback merges unrelated customers",["S168","S173","S175"],"Fail closed without identity."],
  ["Client-only authorization permits direct-object access",["S168","S174","S175"],"Enforce workspace ownership in every server query."],
  ["Cross-site mutation requests are accepted",["S167","S169"],"Verify same-origin intent."],
  ["Uploaded file type is trusted from its extension",["S166","S171"],"Validate MIME, extension and signature."],
  ["Predictable storage keys expose private plans",["S166","S174"],"Use opaque workspace/project/file keys."],
  ["Partial R2/D1 writes leave orphan projects",["S119","S201","S204"],"Use compensation, transaction boundaries and reconciliation."],
  ["Failures cannot be correlated by operators",["S169","S214","S215"],"Emit privacy-safe incident IDs and structured context."],
  ["Logs collect plan contents or private values",["S171","S173","S214"],"Log identifiers and failure class, not document content."],
  ["Integration failures disappear",["S089","S169","S222"],"Surface integration state and retry ownership."],
  ["Notification noise obscures critical actions",["S089","S224"],"Tie notifications to severity and next action."],
  ["Pricing limits or fees surprise users",["S006","S010","S021"],"State scope/limits before the user commits time."],
  ["Exports are incomplete or trap data",["S006","S021","S228"],"Provide documented portable outputs."],
  ["Templates carry stale data into a new project",["S014","S103","S202"],"Separate reusable structure from project evidence."],
  ["Team permissions are unclear",["S087","S173","S217"],"Show role and scope; default secondary viewers to least privilege."],
  ["No rollback exists after a bad release",["S179","S180","S188"],"Maintain immutable versions and exact rollback steps."],
  ["Health checks report app uptime while dependencies fail",["S178","S182","S209"],"Check critical dependency health."],
  ["A passing build is mistaken for a passing user journey",["S086","S191","S200"],"Require rendered critical-path and failure passes."]
]);

const trustKillers = patterns([
  ["Invented plan, parcel, utility or dimensional data",["S076","S080","S115"],"Block field use and label unresolved."],
  ["False success after a failed or partial save",["S170","S184","S201"],"Never announce completion before persistence."],
  ["Cross-customer access or fallback identity",["S168","S173","S175"],"Fail closed and isolate every query."],
  ["A 2.5D preview labeled a digital twin",["S161","S163","S241"],"Use real 3D and honest maturity labels."],
  ["Legal-survey language applied to GIS reference data",["S115","S116","S118"],"Preserve agency accuracy caveats."],
  ["Unexplained AI certainty",["S076","S077","S084"],"Show evidence and human-review gates."],
  ["Plans uploaded but missing after refresh",["S048","S056","S120"],"Verify storage and provide retry/recovery."],
  ["Duplicate house/project creation",["S184","S186","S187"],"Use idempotency."],
  ["Unannounced revision mismatch",["S056","S103","S111"],"Expose controlling revision."],
  ["Viewer controls that do nothing",["S031","S043","S045"],"Remove or implement every control."],
  ["Critical tools hidden offscreen",["S137","S139","S194"],"Viewport-bound layout and reset."],
  ["Errors that blame the user but offer no recovery",["S155","S156","S200"],"Explain failure and safe next step."],
  ["Sensitive plan data in logs or predictable URLs",["S166","S171","S174"],"Minimize and protect identifiers."],
  ["Permissions that exist only in the interface",["S168","S174","S175"],"Server enforcement."],
  ["Parcel/APN conflict silently resolved by assumption",["S115","S117"],"Display conflict pending authority."],
  ["Detailed MEP routing invented from schematic plans",["S076","S080","S164"],"Use zones/not shown."],
  ["No way to recover a lost camera or layout",["S033","S044","S121"],"Stable reset."],
  ["Unmonitored production failure",["S169","S179","S214"],"Logs, health and alert ownership."],
  ["No credible rollback after release",["S179","S180","S188"],"Immutable version and rehearsal."],
  ["Affiliate/vendor claims presented as independent user truth",["S216","S227","S250"],"Record bias and corroborate."]
]);

const mustNotText = [
  "Create a project row before an upload can be safely completed","Treat a retry as a new upload intent","Trust extension or browser MIME alone","Expose R2 keys to the client","Use a shared fallback account","Authorize a project from client state","Return raw exceptions","Report success before D1/R2 commit","Delete unrelated project data during cleanup","Leave an upload batch permanently processing without operator visibility",
  "Call a 2.5D canvas a digital twin","Render one project’s geometry for another house","Invent a parcel ID","Invent boundary dimensions or bearings","Invent frontage length","Confuse pavement, centerline, ROW and frontage","Substitute owner names for adjacent APNs","Call GIS reference geometry survey-accurate","Silently choose between conflicting APNs","Silently choose between conflicting lot areas",
  "Generate detailed MEP routing absent from plans","Make assumed geometry look verified","Hide unresolved values","Scale from pixels when written dimensions control","Claim precision beyond the source","Build from floor plans alone","Ignore superseded or controlling revisions","Reset the camera during stage changes","Make stages decorative slides","Prevent returning to an earlier stage",
  "Allow tools to leave the viewport","Create nested page scroll traps","Hide tools at 200% zoom","Use color as the only evidence cue","Offer canvas-only information","Trap keyboard focus outside a dialog","Use tiny unlabeled touch targets","Lose panels permanently offscreen","Omit Escape/cancel behavior","Remove reset layout or fit-to-view recovery",
  "Silence failed network requests","Overwrite newer multi-tab state silently","Queue external side effects without idempotency","Log private plan content","Hide integration failure","Rely on app-up health checks that ignore dependencies","Deploy a destructive migration without backup/rollback","Claim mobile support without rendering it","Claim accessibility without keyboard/semantic checks","Issue GO while any P0/P1 or research gate is open"
];
const mustNotSources = ["S166","S184","S171","S174","S168","S175","S170","S201","S204","S169","S161","S088","S115","S116","S118","S117","S164","S076","S080","S165","S083","S103","S033","S163","S162","S137","S139","S140","S136","S142","S147","S121","S155","S108","S186","S214","S179","S178","S188","S191"];
const mustNot = mustNotText.map((rule,index)=>({rank:index+1,rule,source_ids:[mustNotSources[index%mustNotSources.length]],verification:index<10?"Upload/auth/recovery test":index<20?"Parcel evidence audit":index<30?"Plan/model manifest audit":index<40?"Viewport/keyboard audit":"Release/operations gate"}));

const result = {
  generated_at:"2026-08-27",
  language_note:"Patterns summarize qualifying evidence; counts are not population prevalence. Direct-user reports remain anecdotal unless a controlled study measured them.",
  user_delight_catalog:delights,
  user_pain_catalog:pains,
  trust_killer_catalog:trustKillers,
  abandonment_trigger_catalog:pains.filter((_,index)=>[0,1,2,3,6,7,11,12,24,25,26,31,32,42,43].includes(index)),
  accessibility_risk_catalog:pains.filter((_,index)=>[26,27,28,29,30].includes(index)),
  mobile_risk_catalog:pains.filter((_,index)=>[3,4,24,25,26,27].includes(index)),
  operational_risk_catalog:pains.filter((_,index)=>index>=31),
  builder_assist_must_not_rules:mustNot,
  research_limitations:[
    "Ninety-five qualifying sources have no retained exact publication/update date and are excluded from recency quotas.",
    "Public reviews and community reports overrepresent motivated users and do not establish prevalence.",
    "Vendor documentation verifies product behavior, not user sentiment or outcomes.",
    "Commercial comparisons may contain affiliate incentives and receive reduced credibility scores.",
    "No representative Builder Assist usability study was run in this environment; satisfaction remains unverified.",
    "The official parcel record endpoint blocked full content retrieval, so parcel reconciliation remains a launch blocker."
  ]
};
if (delights.length < 30 || pains.length < 50 || trustKillers.length < 20 || mustNot.length < 50) throw new Error("Synthesis floor not met");
fs.writeFileSync(out,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify({delights:delights.length,pains:pains.length,trust_killers:trustKillers.length,must_not:mustNot.length,abandonment_triggers:result.abandonment_trigger_catalog.length},null,2));
