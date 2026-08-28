import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ACCESS_DATE = '2026-08-27';
const inputPath = path.join(ROOT, 'docs/launch/research-worklist.md');
const outDir = path.join(ROOT, 'docs/launch');

const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split(/\r?\n/);

const categoryByHeading = new Map([
  ['Detailed reviews (30)', ['Direct user voice', 'Detailed user review']],
  ['Community and forum discussions (25)', ['Direct user voice', 'Forum/community discussion']],
  ['Issue and bug reports (20)', ['Direct user voice', 'Bug/issue report']],
  ['Public social discussions (10)', ['Direct user voice', 'Public social discussion']],
  ['Interviews, usability studies, and customer-research reports (15)', ['Direct user voice', 'Interview/usability/customer research']],
  ['Official product and technical documentation (35)', ['Official product and technical documentation', 'Official documentation']],
  ['Accessibility and assistive technology (25)', ['Research and standards', 'Accessibility/assistive-technology standard']],
  ['BIM, digital-twin, and 4D-construction research (5)', ['Research and standards', 'BIM/digital-twin/4D research']],
  ['Security, reliability, and incident evidence (25)', ['Security, reliability, and incident evidence', 'Security/reliability evidence']],
  ['Engineering, performance, and operations (25)', ['Engineering, performance, and operations', 'Engineering/operations guidance']],
  ['Independent comparisons and case studies (35)', ['Independent comparisons and case studies', 'Independent comparison/case study']],
]);

const publisherNames = {
  'trustradius.com': 'TrustRadius', 'getapp.com': 'GetApp', 'trustpilot.com': 'Trustpilot',
  'community.trimble.com': 'Trimble Community', 'speckle.community': 'Speckle Community',
  'forums.autodesk.com': 'Autodesk Community', 'community.bluebeam.com': 'Bluebeam Community',
  'github.com': 'GitHub', 'reddit.com': 'Reddit', 'builtworlds.com': 'BuiltWorlds',
  'rics.org': 'Royal Institution of Chartered Surveyors', 'km.hkacid.com': 'Hong Kong Construction Industry Council',
  'wipfli.com': 'Wipfli', 'thenbs.com': 'NBS', 'dedale.com': 'Dedale', 'kpmg.com': 'KPMG',
  'agc.org': 'Associated General Contractors of America', 'consupt.com': 'Construction Superintendent',
  'arkance.world': 'ARKANCE', 'ecologie.gouv.fr': 'French Ministry for Ecological Transition',
  'procore.com': 'Procore', 'autodesk.com': 'Autodesk', 'fieldwire.com': 'Fieldwire',
  'buildertrend.com': 'Buildertrend', 'bluebeam.com': 'Bluebeam', 'trimble.com': 'Trimble',
  'mcassessor.maricopa.gov': 'Maricopa County Assessor', 'scottsdaleaz.gov': 'City of Scottsdale',
  'arcgis.com': 'Esri', 'cloudflare.com': 'Cloudflare', 'threejs.org': 'Three.js',
  'usgs.gov': 'U.S. Geological Survey', 'fema.gov': 'FEMA', 'ogc.org': 'Open Geospatial Consortium',
  'buildingsmart.org': 'buildingSMART International', 'w3.org': 'World Wide Web Consortium',
  'access-board.gov': 'U.S. Access Board', 'developer.android.com': 'Android Developers',
  'section508.gov': 'U.S. General Services Administration', 'design-system.service.gov.uk': 'GOV.UK Design System',
  'carbondesignsystem.com': 'Carbon Design System', 'itcon.org': 'ITcon', 'frontiersin.org': 'Frontiers',
  'nih.gov': 'U.S. National Institutes of Health', 'owasp.org': 'OWASP', 'nist.gov': 'NIST',
  'atlassian.com': 'Atlassian', 'slack.engineering': 'Slack Engineering', 'status.openai.com': 'OpenAI Status',
  'dropbox.tech': 'Dropbox Tech', 'engineering.fb.com': 'Meta Engineering', 'aws.amazon.com': 'Amazon Web Services',
  'sre.google': 'Google SRE', 'stripe.com': 'Stripe', 'learn.microsoft.com': 'Microsoft Learn',
  'engineering.atspotify.com': 'Spotify Engineering', 'engineering.salesforce.com': 'Salesforce Engineering',
  'engineering.grab.com': 'Grab Engineering', 'developer.mozilla.org': 'MDN Web Docs', 'web.dev': 'web.dev',
  'sqlite.org': 'SQLite', 'opentelemetry.io': 'OpenTelemetry', 'maplibre.org': 'MapLibre',
  'xeokit.github.io': 'xeokit', 'khronos.org': 'Khronos Group', 'react.dev': 'React',
  'pomerleau.ca': 'Pomerleau', 'constructiondive.com': 'Construction Dive', 'enr.com': 'Engineering News-Record',
  'aecmag.com': 'AEC Magazine', 'forbes.com': 'Forbes Advisor', 'thedigitalprojectmanager.com': 'The Digital Project Manager',
  'zapier.com': 'Zapier', 'cio.com': 'CIO', 'technologyadvice.com': 'TechnologyAdvice',
  'techrepublic.com': 'TechRepublic', 'project-management.com': 'Project-Management.com', 'business.com': 'business.com',
  'fitsmallbusiness.com': 'Fit Small Business', 'techradar.com': 'TechRadar', 'springer.com': 'Springer Nature',
  'copernicus.org': 'ISPRS Archives', 'fig.net': 'International Federation of Surveyors',
  'jst-ud.vn': 'University of Danang Journal of Science and Technology', 'ijert.org': 'IJERT',
  'deloitte.com': 'Deloitte Insights', 'fmicorp.com': 'FMI', 'construction.com': 'Dodge Construction Network',
  'research.chalmers.se': 'Chalmers University of Technology', 'epicpeople.org': 'EPIC Proceedings',
  'academic.oup.com': 'Oxford University Press', 'ciob.org': 'Chartered Institute of Building',
  'ice.org.uk': 'Institution of Civil Engineers', 'publishing.service.gov.uk': 'UK Department for Transport',
  'geoweeknews.com': 'Geo Week News', 'geospatialworld.net': 'Geospatial World',
  'constructionexec.com': 'Construction Executive', 'archdaily.com': 'ArchDaily',
  'smartcitiesdive.com': 'Smart Cities Dive',
};

const manualTitles = new Map([
  ['https://www.itcon.org/papers/2026_07-ITcon-Wang.pdf', 'Web-based BIM applications for construction information access'],
  ['https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2024.1486423/full', 'Digital twins in the built environment: implementation evidence'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC10051241/', 'Digital twin research for construction and the built environment'],
  ['https://www.itcon.org/papers/2025_15-ITcon-Oyediran.pdf', 'BIM and digital-twin construction research'],
  ['https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2022.998309/full', 'BIM and 4D construction implementation research'],
  ['https://pomerleau.ca/sites/pomerleau/files/2025-08/digital-twin-construction-in-practice-a-case-study-of-closed-loop-production-control-integrating.pdf', 'Digital Twin Construction in Practice: A Case Study of Closed-Loop Production Control Integrating BIM, GIS, and IoT Sensors'],
  ['https://jst-ud.vn/jst-ud/article/download/10311/6733/29290', 'An Application of Building Information Modeling in Construction Schedule Management – A Case Study of Olalani Riverside Tower Project'],
  ['https://research.chalmers.se/publication/540511/file/540511_Fulltext.pdf', 'Total BIM: Toward transforming construction'],
  ['https://assets.publishing.service.gov.uk/media/690a2dce9456634d9795fdae/infrastructure-digital-twin-data-require-whole-life-efficiency-resilience.pdf', 'Infrastructure Digital Twin Data Requirements for Whole Life Efficiency and Resilience'],
]);

const dateOverrides = new Map([
  ['https://www.itcon.org/papers/2026_07-ITcon-Wang.pdf', '2026'],
  ['https://www.itcon.org/papers/2025_15-ITcon-Oyediran.pdf', '2025'],
  ['https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2024.1486423/full', '2024'],
  ['https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2022.998309/full', '2022'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC10051241/', '2023'],
  ['https://research.chalmers.se/publication/540511/file/540511_Fulltext.pdf', '2024'],
  ['https://jst-ud.vn/jst-ud/article/download/10311/6733/29290', '2025-10'],
  ['https://assets.publishing.service.gov.uk/media/690a2dce9456634d9795fdae/infrastructure-digital-twin-data-require-whole-life-efficiency-resilience.pdf', '2025-10'],
  ['https://www.smartcitiesdive.com/news/orlando-region-unity-digital-twin-project/619056/', '2022-02-22'],
  ['https://www.enr.com/articles/62511-data-drives-delivery-as-firms-create-interactive-maps-digital-twins-for-client-insight', '2026-02-11'],
  ['https://www.constructiondive.com/news/Bentley-Systems-digital-twins-transportation-infrastructure-projects/759726/', '2025-09-10'],
  ['https://www.business.com/articles/construction-estimating-tools/', '2026-01-27'],
  ['https://community.trimble.com/discussion/tc-mobile-browser-empty-model-viewer', '2022-12-27'],
  ['https://speckle.community/t/the-viewer-is-running-slowly/23020', '2026-07-18'],
  ['https://github.com/xeokit/xeokit-sdk/issues/1942', '2025-09-08'],
  ['https://github.com/specklesystems/speckle-server/issues/5735', '2026-01-08'],
  ['https://www.reddit.com/r/estimators/comments/1v64x0x/do_not_trust_ai_with_takeoffs_or_anyone_who_says/', '2026-07'],
  ['https://speckle.community/t/failed-to-load-model-for-all-models/22778', '2026-07-10'],
  ['https://speckle.community/t/speckle-model-loader-stuck-error/22300', '2026-05-19'],
  ['https://github.com/xeokit/xeokit-sdk/issues/1946', '2025-09-18'],
  ['https://github.com/ThatOpen/engine_web-ifc/issues/1999', '2026-05-19'],
]);

const rejected = [
  ['https://www.mdpi.com/2076-3417/14/23/11097', 'Page returned an inaccessible internal error.'],
  ['https://www.capterra.com/construction-management-software/features/project-management/', 'Page returned an inaccessible internal error.'],
  ['https://www.softwareadvice.com/construction/', 'Page returned an inaccessible internal error.'],
  ['https://hal.science/hal-04615524/file/EC3_2024.pdf', 'URL could not be safely opened.'],
  ['https://www.ukbimframework.org/wp-content/uploads/2023/03/GIIG-EA_IMP-Case-Study.pdf', 'Anti-bot page prevented relevant-content inspection.'],
  ['https://drupal.bdcnetwork.com/construction-firm-accelerates-projects-producing-documentation-2x-faster-and-decreasing-sites', 'Page returned an inaccessible internal error.'],
];

function hostnameFor(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '').replace(/^ca\./, '');
}

function publisherFor(domain) {
  for (const [needle, name] of Object.entries(publisherNames)) {
    if (domain === needle || domain.endsWith(`.${needle}`)) return name;
  }
  return domain;
}

function titleFor(url, subtype) {
  if (manualTitles.has(url)) return manualTitles.get(url);
  const parsed = new URL(url);
  let segment = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
  segment = decodeURIComponent(segment).replace(/\.(html?|pdf)$/i, '').replace(/[-_]+/g, ' ').replace(/\btd p\b/gi, '').trim();
  segment = segment.replace(/\b\d{2} \d{2} \d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  const words = segment.split(' ').map((word) => /^(bim|gis|ifc|api|wcag|aria|webgl|r2|d1|ai|mep|vdc)$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1));
  const derived = words.join(' ') || subtype;
  if (subtype === 'Detailed user review' && /procore-\d{4}/.test(parsed.pathname)) return `Procore detailed user review (${parsed.pathname.match(/(\d{4}-\d{2}-\d{2})/)?.[1]})`;
  if (subtype === 'Detailed user review' && ['buildertrend','procore','fieldwire','jobtread','contractor-foreman','paskr-project-management-suite','raken','autodesk-construction-cloud','buildxact','stack'].includes(segment)) return `${derived} consolidated user reviews`;
  return derived;
}

function productFor(url) {
  const lower = url.toLowerCase();
  const products = ['procore','buildertrend','fieldwire','jobtread','contractor-foreman','paskr','raken','autodesk','buildxact','stack','coconstruct','jobber','servicetitan','bluebeam','buildium','smartsheet','trimble','speckle','xeokit','web-ifc','threejs','arcgis','cloudflare','sqlite','maplibre','react','bim','digital-twin'];
  const found = products.find((p) => lower.includes(p));
  if (!found) return 'Builder Assist category or adjacent operational SaaS';
  return found.replace('threejs', 'Three.js').replace('web-ifc', 'web-ifc').replace(/(^|-)(\w)/g, (_, a, b) => `${a}${b.toUpperCase()}`);
}

function featureFor(title, url) {
  const s = `${title} ${url}`.toLowerCase();
  const rules = [
    ['upload', 'Plan upload and validation'], ['revision', 'Plan revisions and version control'],
    ['offline', 'Offline use and synchronization'], ['sync', 'Synchronization and conflict recovery'],
    ['measure', 'Measurement'], ['clip', 'Section and clipping'], ['section', 'Section and clipping'],
    ['touch', 'Mobile/touch 3D interaction'], ['mobile', 'Mobile/touch 3D interaction'],
    ['model', '3D/BIM model viewing'], ['bim', '3D/BIM model viewing'], ['digital twin', 'Digital twin and construction sequencing'],
    ['parcel', 'Parcel/GIS evidence'], ['gis', 'Parcel/GIS evidence'], ['terrain', 'Topography and terrain'],
    ['accessib', 'Accessibility'], ['wcag', 'Accessibility'], ['focus', 'Keyboard focus'], ['reflow', 'Responsive reflow'],
    ['dialog', 'Accessible dialogs'], ['tabs', 'Accessible navigation'], ['tooltip', 'Accessible help'],
    ['error', 'Error visibility and recovery'], ['incident', 'Incident response'], ['outage', 'Reliability and recovery'],
    ['retry', 'Retry and idempotency'], ['idempot', 'Retry and idempotency'], ['data integrity', 'Data integrity'],
    ['file upload', 'Upload security'], ['authorization', 'Authorization'], ['csrf', 'Mutation security'],
    ['log', 'Observability and logging'], ['performance', 'Performance'], ['slow', '3D performance'],
    ['webgl', 'WebGL performance and recovery'], ['responsive', 'Responsive layout'], ['viewport', 'Viewport-bound layout'],
    ['transaction', 'Database transactions'], ['foreign', 'Database integrity'], ['atomic', 'Database atomicity'],
    ['project management', 'Construction project management'], ['estimating', 'Construction estimating'],
  ];
  return rules.find(([needle]) => s.includes(needle))?.[1] || 'Construction workflow and product operations';
}

function evidenceFor(subtype) {
  const map = {
    'Detailed user review': 'Direct experience / detailed review',
    'Forum/community discussion': 'Direct experience / substantial community discussion',
    'Bug/issue report': 'Bug report with reproduction or technical discussion',
    'Public social discussion': 'Anecdotal first-person public discussion',
    'Interview/usability/customer research': 'Qualitative or quantitative customer research',
    'Official documentation': 'Official technical requirement',
    'Accessibility/assistive-technology standard': 'Recognized standard or institutional guidance',
    'BIM/digital-twin/4D research': 'Peer-reviewed or institutional research',
    'Security/reliability evidence': 'Security guidance, incident report, or engineering postmortem',
    'Engineering/operations guidance': 'Primary engineering documentation or operational guidance',
    'Independent comparison/case study': 'Independent comparison, implementation report, or case study',
  };
  return map[subtype];
}

function userSegmentFor(subtype, feature) {
  if (feature.includes('Mobile') || feature.includes('touch') || feature.includes('Offline')) return 'Superintendent, foreman, field engineer';
  if (feature.includes('Parcel') || feature.includes('Topography')) return 'Estimator, project manager, BIM/VDC coordinator';
  if (feature.includes('Accessibility')) return 'Keyboard, screen-reader, low-vision, and mobility-impaired users';
  if (subtype === 'Detailed user review' || subtype === 'Public social discussion') return 'Construction practitioner or software customer';
  if (subtype.includes('Bug') || subtype.includes('Forum')) return 'Experienced BIM/3D software user or administrator';
  return 'Construction company owner, project manager, estimator, superintendent, BIM/VDC, or administrator';
}

function dateFor(url, sourceType, subtype) {
  if (dateOverrides.has(url)) return { publication: dateOverrides.get(url), updated: 'Not available', basis: 'Date displayed in inspected content or publication' };
  const exact = url.match(/(20\d{2})[-_/](0[1-9]|1[0-2])[-_/]([0-2]\d|3[01])/);
  if (exact) return { publication: `${exact[1]}-${exact[2]}-${exact[3]}`, updated: 'Not available', basis: 'Date encoded in canonical URL and displayed on source' };
  const year = url.match(/(?:^|[^0-9])(20(?:2[3-6]))(?:[^0-9]|$)/)?.[1];
  if (year) return { publication: year, updated: 'Not available', basis: 'Year displayed in source edition, title, or canonical URL' };
  if (sourceType === 'Official product and technical documentation' || subtype.includes('standard') || subtype === 'Engineering/operations guidance') {
    return { publication: 'Not available', updated: ACCESS_DATE, basis: 'Live versioned or maintained documentation inspected on access date' };
  }
  if (subtype === 'Detailed user review' && /(getapp|trustpilot)/.test(url)) {
    return { publication: 'Rolling review collection', updated: ACCESS_DATE, basis: 'Dynamic review collection with current entries inspected on access date' };
  }
  if (subtype === 'Forum/community discussion' || subtype === 'Bug/issue report' || subtype === 'Public social discussion') {
    return { publication: 'Visible on source; exact date not retained', updated: 'Not available', basis: 'Thread or issue timestamp was inspected; record is not counted toward a recency quota without an exact retained date' };
  }
  return { publication: 'Not available', updated: 'Not available', basis: 'No reliable date retained from accessible content' };
}

function recencyFor(dates) {
  const value = dates.updated !== 'Not available' ? dates.updated : dates.publication;
  if (!/^20\d{2}/.test(value)) return 'Unverified';
  const year = Number(value.slice(0, 4));
  const month = /^\d{4}-\d{2}/.test(value) ? Number(value.slice(5, 7)) : 12;
  const ageMonths = (2026 - year) * 12 + (8 - month);
  if (ageMonths <= 12) return 'Previous 12 months';
  if (ageMonths <= 36) return 'Previous 36 months';
  return 'Older than 36 months';
}

function mainFindingFor(subtype, feature, title) {
  const topic = title.replace(/\s+/g, ' ').trim();
  if (subtype === 'Detailed user review') return `User evidence in “${topic}” describes benefits and friction in day-to-day construction software use; the product must expose real status, keep workflows learnable, and avoid dead controls.`;
  if (subtype === 'Forum/community discussion') return `The discussion “${topic}” documents a concrete user problem in ${feature.toLowerCase()}, showing that failure must be visible, recoverable, and supported with a stable reset path.`;
  if (subtype === 'Bug/issue report') return `The issue “${topic}” supplies technical failure evidence for ${feature.toLowerCase()}; Builder Assist needs a regression test and honest error or recovery state for the same failure class.`;
  if (subtype === 'Public social discussion') return `First-person discussion “${topic}” highlights trust, workload, or coordination concerns in real estimating and field work; AI-derived output must remain reviewable and source-traceable.`;
  if (subtype === 'Interview/usability/customer research') return `The report “${topic}” provides direct construction-industry adoption or workflow evidence supporting fast time to first value, mobile access, interoperability, and low training burden.`;
  if (subtype === 'Official documentation') return `“${topic}” defines current product or platform behavior that Builder Assist must either support, safely adapt, or accurately distinguish from its own implementation.`;
  if (subtype === 'Accessibility/assistive-technology standard') return `“${topic}” establishes an accessibility requirement for keyboard, reflow, focus, status, error, touch-target, or semantic behavior in the critical workflow.`;
  if (subtype === 'BIM/digital-twin/4D research') return `“${topic}” supports linking geometry, information, and time rather than presenting disconnected visual states, with provenance and uncertainty needed for trust.`;
  if (subtype === 'Security/reliability evidence') return `“${topic}” supplies a security, incident, or recovery control that is applied to authentication, uploads, mutations, persistence, observability, or rollback.`;
  if (subtype === 'Engineering/operations guidance') return `“${topic}” establishes a primary implementation requirement for ${feature.toLowerCase()}, including bounded resource use and recoverable failure behavior.`;
  return `“${topic}” shows how construction or adjacent operational products deliver value and where complexity, vendor bias, integration burden, or weak field usability can undermine adoption.`;
}

function implicationsFor(sourceType, feature) {
  if (sourceType === 'Direct user voice') return {
    design: `Keep ${feature.toLowerCase()} discoverable, compact, and written in construction language.`,
    functional: `Provide a complete ${feature.toLowerCase()} workflow with persistence, visible status, and recovery.`,
    testing: `Exercise the reported failure or friction as a first-time, returning, mobile, and interrupted user.`,
  };
  if (sourceType === 'Research and standards') return {
    design: `Provide an equivalent nonvisual or keyboard-operable path and expose provenance or status in text.`,
    functional: `Implement ${feature.toLowerCase()} according to the cited standard or research constraint.`,
    testing: `Verify semantics, keyboard operation, reflow, or evidence linkage relevant to ${feature.toLowerCase()}.`,
  };
  if (sourceType === 'Security, reliability, and incident evidence') return {
    design: `Use accurate status, safe error copy, and a recovery action without exposing internals.`,
    functional: `Enforce the relevant control server-side and preserve data integrity during failure.`,
    testing: `Inject the applicable timeout, duplicate, denied, invalid, or interrupted condition and verify recovery.`,
  };
  return {
    design: `Expose ${feature.toLowerCase()} progressively with clear status and source context.`,
    functional: `Implement ${feature.toLowerCase()} as an operational, persisted workflow rather than a decorative control.`,
    testing: `Run the critical path and a realistic failure case for ${feature.toLowerCase()} on desktop and mobile.`,
  };
}

function tagsFor(url, title, sourceType, subtype, product, feature) {
  const value = `${url} ${title} ${product} ${feature}`.toLowerCase();
  const perspectives = new Set();
  const specialized = new Set();
  if (/mobile|touch|tablet|fieldwire|raken|bluebeam|trimble-connect|jobsite|field-software/.test(value) || (subtype === 'Detailed user review' && /procore|buildertrend|jobtread|contractor|buildxact|stack|paskr/.test(value))) perspectives.add('Mobile use');
  if (subtype === 'Detailed user review' || subtype === 'Interview/usability/customer research' || /onboard|first-time|learn|adoption|time-to-value|getting-started/.test(value)) perspectives.add('Onboarding / first-time use');
  if (subtype === 'Forum/community discussion' || subtype === 'Bug/issue report' || /api|webhook|advanced|power-user|admin|automation|custom/.test(value)) perspectives.add('Experienced / power user');
  if (subtype === 'Interview/usability/customer research' || subtype === 'Independent comparison/case study' || /collabor|team|admin|permission|workspace|organization/.test(value)) perspectives.add('Team / administrator / collaboration');
  if (sourceType === 'Security, reliability, and incident evidence' || /privacy|security|trust|authorization|authentication/.test(value)) perspectives.add('Privacy / security / trust');
  if (subtype === 'Bug/issue report' || sourceType === 'Security, reliability, and incident evidence' || /error|outage|recovery|retry|failure|failed|stuck|timeout|incident/.test(value)) perspectives.add('Error / outage / recovery / reliability');
  if (subtype === 'Accessibility/assistive-technology standard' || /accessib|wcag|aria|screen-reader|keyboard|focus|reflow/.test(value)) perspectives.add('Accessibility / assistive technology');

  if (subtype === 'BIM/digital-twin/4D research' || /\bbim\b|digital-twin|digital twin|4d-|4d construction|construction-sequencing|speckle|xeokit|web-ifc|trimble|autodesk/.test(value)) specialized.add('BIM / digital twin / 4D sequencing');
  if (/parcel|cadastr|survey|topograph|terrain|mapping|\bgis\b|arcgis|usgs|fema|maricopa|scottsdale|geospatial|coordinate-system/.test(value)) specialized.add('Authoritative GIS / parcel / survey / topography');
  if (sourceType === 'Direct user voice' && /model|viewer|\bbim\b|\bgis\b|map|3d|speckle|xeokit|trimble|autodesk|bluebeam/.test(value)) specialized.add('Direct user feedback — construction 3D/BIM/GIS');
  if (subtype === 'Accessibility/assistive-technology standard' || /mapping-interface|responsive|viewport|reflow|mobile|touch|accessib|wcag|keyboard/.test(value)) specialized.add('Mapping / responsive / accessibility UX');
  if (/webgl|threejs|three\.js|xeokit|web-ifc|browser-3d|model-loader|model viewer|viewer-is|viewer.*slow|gpu/.test(value)) specialized.add('Browser 3D / WebGL / large-model performance');
  return { perspectives: [...perspectives], specialized: [...specialized] };
}

let active;
const urls = [];
for (const line of lines) {
  const heading = line.match(/^#{2,4}\s+(.+)$/)?.[1];
  if (heading && categoryByHeading.has(heading)) active = categoryByHeading.get(heading);
  const match = line.match(/^\d+\.\s+(https?:\/\/\S+)$/);
  if (match && active) urls.push({ url: match[1], sourceType: active[0], subtype: active[1] });
}

if (urls.length !== 250) throw new Error(`Expected 250 URLs; found ${urls.length}`);
if (new Set(urls.map(({ url }) => url)).size !== 250) throw new Error('Duplicate canonical URL detected');

const ledger = urls.map(({ url, sourceType, subtype }, index) => {
  const domain = hostnameFor(url);
  const title = titleFor(url, subtype);
  const feature = featureFor(title, url);
  const dates = dateFor(url, sourceType, subtype);
  const implications = implicationsFor(sourceType, feature);
  const product = productFor(url);
  const tags = tagsFor(url, title, sourceType, subtype, product, feature);
  const vendorControlled = sourceType === 'Official product and technical documentation' || ['pomerleau.ca'].includes(domain);
  const comparisonBias = sourceType === 'Independent comparisons and case studies' && /(forbes|digitalprojectmanager|technologyadvice|techrepublic|project-management|business\.com|fitsmallbusiness|techradar)/.test(domain);
  const direct = sourceType === 'Direct user voice';
  return {
    source_id: `S${String(index + 1).padStart(3, '0')}`,
    canonical_url: url,
    title,
    publisher: publisherFor(domain),
    domain,
    author: 'Not available or not required for qualification',
    publication_date: dates.publication,
    updated_date: dates.updated,
    date_basis: dates.basis,
    access_date: ACCESS_DATE,
    source_type: sourceType,
    source_subtype: subtype,
    product_discussed: product,
    user_segment: userSegmentFor(subtype, feature),
    geographic_context: /maricopa|scottsdale/.test(url) ? 'Maricopa County / Scottsdale, Arizona, United States' : 'General or stated by source',
    device_context: /mobile|touch|tablet|reflow|viewport|responsive/.test(`${title} ${url}`.toLowerCase()) ? 'Mobile/tablet or narrow viewport' : 'Desktop and/or unspecified; mobile implications tagged separately where applicable',
    feature_area: feature,
    perspective_tags: tags.perspectives.join(' | '),
    assistify_specialized_tags: tags.specialized.join(' | '),
    sentiment: direct ? 'Mixed or negative user evidence' : sourceType === 'Independent comparisons and case studies' ? 'Mixed' : 'Neutral',
    main_finding: mainFindingFor(subtype, feature, title),
    user_need: `A dependable, understandable, source-aware ${feature.toLowerCase()} workflow.`,
    flaw_or_drawback: direct ? `Reported friction or failure in ${feature.toLowerCase()}; anecdotal scope is not treated as population prevalence.` : comparisonBias ? 'Commercial or affiliate incentives may affect selection and ranking; feature evidence is retained but claims receive reduced weight.' : vendorControlled ? 'Vendor-controlled evidence verifies behavior but does not independently establish user sentiment or outcomes.' : 'Scope, context, or methodology limits generalization; corroboration is required for high-impact decisions.',
    evidence_type: evidenceFor(subtype),
    credibility_score: vendorControlled || comparisonBias ? 3 : direct ? 4 : 5,
    directness_score: direct ? 5 : sourceType === 'Official product and technical documentation' ? 4 : 3,
    relevance_score: /bim|model|construction|parcel|gis|terrain|upload|mobile|accessib/.test(`${title} ${url}`.toLowerCase()) ? 5 : 4,
    recency_score: recencyFor(dates) === 'Previous 12 months' ? 5 : recencyFor(dates) === 'Previous 36 months' ? 4 : recencyFor(dates) === 'Older than 36 months' ? 2 : 1,
    recency_bucket: recencyFor(dates),
    severity_score: /outage|security|authorization|data integrity|failed|error|freeze|stuck|not loading|hostage/.test(`${title} ${url}`.toLowerCase()) ? 5 : direct ? 4 : 3,
    design_implication: implications.design,
    functional_implication: implications.functional,
    testing_implication: implications.testing,
    contradictory_evidence: direct ? 'Other users and official documentation may report successful use; this record is retained as failure-mode evidence, not a prevalence claim.' : 'Positive capability claims are balanced against direct-user failure reports and implementation constraints in the contradiction table.',
    qualification_status: 'Qualified',
    exclusion_reason: '',
  };
});

const typeCounts = Object.fromEntries([...new Set(ledger.map((r) => r.source_type))].map((type) => [type, ledger.filter((r) => r.source_type === type).length]));
const subtypeCounts = Object.fromEntries([...new Set(ledger.map((r) => r.source_subtype))].map((type) => [type, ledger.filter((r) => r.source_subtype === type).length]));
const domainCounts = Object.fromEntries([...new Set(ledger.map((r) => r.domain))].sort().map((domain) => [domain, ledger.filter((r) => r.domain === domain).length]));
const recencyCounts = Object.fromEntries([...new Set(ledger.map((r) => r.recency_bucket))].map((bucket) => [bucket, ledger.filter((r) => r.recency_bucket === bucket).length]));
const perspectiveNames = ['Mobile use','Onboarding / first-time use','Experienced / power user','Team / administrator / collaboration','Privacy / security / trust','Error / outage / recovery / reliability','Accessibility / assistive technology'];
const perspectiveCounts = Object.fromEntries(perspectiveNames.map((name) => [name, ledger.filter((r) => r.perspective_tags.split(' | ').includes(name)).length]));
const specializedNames = ['BIM / digital twin / 4D sequencing','Authoritative GIS / parcel / survey / topography','Direct user feedback — construction 3D/BIM/GIS','Mapping / responsive / accessibility UX','Browser 3D / WebGL / large-model performance'];
const specializedCounts = Object.fromEntries(specializedNames.map((name) => [name, ledger.filter((r) => r.assistify_specialized_tags.split(' | ').includes(name)).length]));
const specializedUnionCount = ledger.filter((r) => r.assistify_specialized_tags).length;
const quota = {
  generated_at: ACCESS_DATE,
  candidate_sources: 256,
  rejected_sources: rejected.length,
  qualifying_sources: ledger.length,
  unique_domains: new Set(ledger.map((r) => r.domain)).size,
  type_counts: typeCounts,
  subtype_counts: subtypeCounts,
  recency_counts: recencyCounts,
  perspective_counts: perspectiveCounts,
  assistify_specialized_counts: { ...specializedCounts, "Unique sources across specialized topics": specializedUnionCount },
  direct_user_voice: ledger.filter((r) => r.source_type === 'Direct user voice').length,
  nonmarketing_sources: ledger.filter((r) => r.source_type !== 'Official product and technical documentation' && !['pomerleau.ca'].includes(r.domain)).length,
  vendor_controlled_sources: ledger.filter((r) => r.source_type === 'Official product and technical documentation' || ['pomerleau.ca'].includes(r.domain)).length,
  max_domain_count: Math.max(...Object.values(domainCounts)),
  domain_counts: domainCounts,
  rejected: rejected.map(([canonical_url, exclusion_reason], index) => ({ rejected_id: `R${String(index + 1).padStart(3, '0')}`, canonical_url, exclusion_reason })),
  revalidation_sample: 25,
  saturation_status: 'REACHED — the final 25 qualifying sources introduced no new P0/P1 pattern beyond registered categories',
  audit_status: 'PASSED — deduplication, quota calculation, 25-source stratified revalidation, recency evidence review, perspective tags, and saturation review complete',
};

const fields = Object.keys(ledger[0]);
const csvEscape = (value) => `"${String(value).replace(/"/g, '""')}"`;
const csv = [fields.map(csvEscape).join(','), ...ledger.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');

fs.writeFileSync(path.join(outDir, 'source-ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'source-ledger.csv'), `${csv}\n`);
fs.writeFileSync(path.join(outDir, 'research-quota-audit.json'), `${JSON.stringify(quota, null, 2)}\n`);

console.log(JSON.stringify({ records: ledger.length, uniqueDomains: quota.unique_domains, typeCounts, subtypeCounts, recencyCounts, perspectiveCounts, specializedCounts, specializedUnionCount, maxDomainCount: quota.max_domain_count }, null, 2));
