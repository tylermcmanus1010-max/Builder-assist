(function(global){
'use strict';

var MAX_BYTES=50*1024*1024,MAX_ENTRIES=2500;
var APPROVED_HASH='61b4dd3ee3a7738d6d8bba58455d31178c0149c4c6257b8b220db6ef1f52bd52';
var KNOWN_MODELS={};KNOWN_MODELS[APPROVED_HASH]='approvedplans-4752-25-assistify-model.json';

function hex(buffer){return Array.from(new Uint8Array(buffer)).map(function(byte){return byte.toString(16).padStart(2,'0');}).join('');}
function safeTitle(name){return String(name||'Imported plan').replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()||'Imported plan';}
function normalize(text){return String(text||'').replace(/\s+/g,' ').trim().slice(0,500);}
function kindFor(text){
  if(/\b(?:shall|must|required|provide|install|verify|contractor|code)\b/i.test(text))return'requirement-or-note';
  if(/\b\d+(?:\.\d+)?\s*(?:ft|feet|in|inch|inches|mm|cm|sf|sq\.?\s*ft)\b|\b\d+['\"]/.test(text))return'dimension-or-performance-value';
  if(/\b(?:schedule|legend|calculation|table)\b/i.test(text))return'schedule-or-calculation';
  if(text.length<45&&/^[A-Z0-9][A-Z0-9 &/().'-]+$/.test(text))return'room-label';
  return'drawing-text';
}
function disciplinesFor(text){
  var rules=[['architectural',/\b(?:wall|door|window|room|floor|ceiling|finish)\b/i],['structural',/\b(?:beam|joist|truss|footing|foundation|rebar|structural)\b/i],['mechanical',/\b(?:hvac|duct|mechanical|air handler|exhaust)\b/i],['electrical',/\b(?:electrical|panel|circuit|receptacle|lighting)\b/i],['plumbing',/\b(?:plumbing|water|sewer|drain|fixture)\b/i],['civil',/\b(?:grading|drainage|utility|survey|parcel|site plan)\b/i]];
  var found=rules.filter(function(rule){return rule[1].test(text);}).map(function(rule){return rule[0];});return found.length?found:['general'];
}
function pageLines(content){
  var lines=[],current=[],lastY=null;
  function flush(){var line=normalize(current.join(' '));if(line)lines.push(line);current=[];}
  (content.items||[]).forEach(function(item){var value=normalize(item.str),y=item.transform&&item.transform[5];if(!value)return;if(lastY!==null&&Number.isFinite(y)&&Math.abs(y-lastY)>2)flush();current.push(value);if(item.hasEOL)flush();if(Number.isFinite(y))lastY=y;});flush();return lines;
}
function emptyFact(){return{state:'UNVERIFIED',value:null,sourceRefs:[]};}
function buildModel(file,sha,pages){
  var documentId='pdf-'+sha.slice(0,16),seen=new Map(),occurrences=0,pageLineCounts={},pagesWithText=0,truncated=false;
  pages.forEach(function(lines,pageIndex){pageLineCounts[String(pageIndex+1)]=lines.length;if(lines.length)pagesWithText++;occurrences+=lines.length;lines.forEach(function(text){var key=text.toLowerCase();if(seen.has(key)){var existing=seen.get(key);existing.occurrences.push({sheet:'Page '+(pageIndex+1),page:pageIndex+1,region:'PDF text layer'});existing.occurrenceCount=existing.occurrences.length;return;}if(seen.size>=MAX_ENTRIES){truncated=true;return;}var entry={id:'pdf-note-'+String(seen.size+1).padStart(4,'0'),text:text,kind:kindFor(text),modelAction:'REVIEW_PDF_TEXT',disciplines:disciplinesFor(text),occurrences:[{sheet:'Page '+(pageIndex+1),page:pageIndex+1,region:'PDF text layer'}],occurrenceCount:1,firstSource:{page:pageIndex+1,region:'PDF text layer'},rationale:'Imported from the PDF text layer; verify against the drawing before applying it to geometry.'};seen.set(key,entry);});});
  var entries=Array.from(seen.values()),kindCounts={};entries.forEach(function(entry){kindCounts[entry.kind]=(kindCounts[entry.kind]||0)+1;});
  var sourceRef={documentId:documentId,page:1,region:'Document text layer'};
  return{schemaVersion:'1.0.0',project:{id:documentId,displayName:'PDF review - '+safeTitle(file.name),status:'INFERRED'},units:'ft',sources:{documents:[{id:documentId,title:file.name,sha256:sha,pageCount:pages.length,revision:'Browser PDF import',status:'CURRENT'}]},facts:{planNoteRegister:{state:'INFERRED',value:{entries:entries,coverage:{pageCount:pages.length,pagesWithExtractedText:pagesWithText,nonemptyLineOccurrences:occurrences,uniqueNormalizedEntries:entries.length,pageLineCounts:pageLineCounts,actionCounts:{REVIEW_PDF_TEXT:entries.length},kindCounts:kindCounts,truncated:truncated}},unit:null,confidence:.7,sourceRefs:[sourceRef],derivation:'PDF.js text-layer extraction; every entry requires human review against the drawing.'}},parcel:emptyFact(),terrain:emptyFact(),systems:emptyFact(),mapRegistration:emptyFact(),geometry:{elements:[]},takeoff:{items:[]},unresolved:[{id:'geometry',label:'Plan-derived 3D geometry',state:'UNVERIFIED',reason:'PDF text was indexed, but geometry was not inferred automatically.'},{id:'pdf-review',label:'Drawing review',state:'UNVERIFIED',reason:'Imported text must be checked against dimensions, symbols, schedules, and visual drawing context.'},{id:'parcel',label:'Parcel and survey registration',state:'UNVERIFIED',reason:'No reviewed legal survey control has been applied.'}]};
}
async function importFile(file,onProgress){
  if(!file)throw new Error('Choose a PDF file.');if(file.size>MAX_BYTES)throw new Error('PDF exceeds the 50 MB prototype limit.');if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')throw new Error('Only PDF files are supported.');
  if(onProgress)onProgress('Hashing '+file.name+'…');var buffer=await file.arrayBuffer(),sha=hex(await crypto.subtle.digest('SHA-256',buffer)),known=KNOWN_MODELS[sha];
  if(known){if(onProgress)onProgress('Recognized reviewed ApprovedPlans set…');var response=await fetch(known,{cache:'no-store'});if(!response.ok)throw new Error('The reviewed ApprovedPlans model could not be loaded.');return{model:await response.json(),kind:'reviewed',sha256:sha,summary:'Recognized the reviewed ApprovedPlans PDF and loaded its plan-traceable 3D model.'};}
  if(onProgress)onProgress('Reading PDF pages locally…');var pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.min.mjs';var pdf=await pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:true}).promise,pages=[];
  for(var pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){if(onProgress)onProgress('Extracting page '+pageNumber+' of '+pdf.numPages+'…');var page=await pdf.getPage(pageNumber),content=await page.getTextContent();pages.push(pageLines(content));page.cleanup();}
  var model=buildModel(file,sha,pages),count=model.facts.planNoteRegister.value.entries.length,textPages=model.facts.planNoteRegister.value.coverage.pagesWithExtractedText;
  return{model:model,kind:'review',sha256:sha,summary:'Indexed '+count+' unique text entries across '+textPages+' of '+pages.length+' page(s). Geometry remains unverified.'};
}

global.AssistifyPdf={importFile:importFile,knownModelForHash:function(hash){return KNOWN_MODELS[String(hash||'').toLowerCase()]||null;},MAX_BYTES:MAX_BYTES};
})(window);
