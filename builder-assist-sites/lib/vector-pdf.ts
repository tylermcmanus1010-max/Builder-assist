import { BLUEPRINT_IR_SCHEMA_VERSION, stableBlueprintId, validateBlueprintIR, type BlueprintDimension, type BlueprintGeometryCandidate, type BlueprintIR, type BlueprintTextBlock, type BlueprintVectorPrimitive } from "./blueprint-ir.ts";

export class VectorPdfExtractionError extends Error {}

type PdfObject = { id: number; body: string };
type PathLine = { start: { x: number; y: number }; end: { x: number; y: number } };

function pdfString(value: string) {
  return value.replace(/\\([nrtbf()\\])/g, (_match, escaped: string) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" })[escaped] || escaped).replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function parseObjects(source: string) {
  const objects: PdfObject[] = [];
  for (const match of source.matchAll(/(?:^|[\r\n])(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g)) objects.push({ id: Number(match[1]), body: match[2] });
  return objects;
}

export function countVectorPdfPages(bytes: ArrayBuffer | Uint8Array) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const source = new TextDecoder("latin1").decode(data);
  if (!source.startsWith("%PDF-") || /\/Encrypt\b/.test(source)) return undefined;
  const count = parseObjects(source).filter((object) => /\/Type\s*\/Page\b/.test(object.body)).length;
  return count || undefined;
}

async function contentStream(object: PdfObject, warnings: BlueprintIR["warnings"], pageNumber: number) {
  const match = object.body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!match) return "";
  if (!/\/FlateDecode\b/.test(object.body)) return match[1];
  if (typeof DecompressionStream === "undefined") {
    warnings.push({ code: "compressed_stream_unsupported", message: "A compressed PDF content stream could not be decoded in this runtime.", pageNumber });
    return "";
  }
  try {
    const compressed = Uint8Array.from(match[1], (character) => character.charCodeAt(0) & 0xff);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new TextDecoder("latin1").decode(await new Response(stream).arrayBuffer());
  } catch {
    warnings.push({ code: "compressed_stream_invalid", message: "A compressed PDF content stream was invalid and was skipped.", pageNumber });
    return "";
  }
}

function textBlocks(content: string, sheetId: string, viewportId: string, pageNumber: number): BlueprintTextBlock[] {
  const blocks: BlueprintTextBlock[] = [];
  for (const textObject of content.matchAll(/BT\b([\s\S]*?)ET\b/g)) {
    const body = textObject[1];
    const matrix = [...body.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td\b/g)].at(-1);
    const tm = [...body.matchAll(/-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\b/g)].at(-1);
    const font = [...body.matchAll(/\/(?:[^\s]+)\s+(\d+(?:\.\d+)?)\s+Tf\b/g)].at(-1);
    const strings = [...body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj\b/g)].map((match) => pdfString(match[1]));
    for (const array of body.matchAll(/\[((?:.|\r|\n)*?)\]\s*TJ\b/g)) strings.push([...array[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((match) => pdfString(match[1])).join(""));
    const text = strings.join(" ").trim();
    if (!text) continue;
    const x = Number(tm?.[1] ?? matrix?.[1] ?? 0);
    const y = Number(tm?.[2] ?? matrix?.[2] ?? 0);
    const fontSize = Number(font?.[1] ?? 10);
    blocks.push({
      textBlockId: stableBlueprintId("txt", sheetId, pageNumber, x.toFixed(3), y.toFixed(3), text),
      sheetId, viewportId, pageNumber,
      bounds: { x, y: y - fontSize * .25, width: Math.max(fontSize, text.length * fontSize * .52), height: fontSize * 1.2 },
      text, extractionMethod: "embedded_pdf_text", confidence: .99,
    });
  }
  return blocks;
}

function pathLines(content: string) {
  const withoutText = content.replace(/BT\b[\s\S]*?ET\b/g, " ");
  const tokens = withoutText.match(/-?(?:\d+\.\d+|\d+|\.\d+)|[A-Za-z*]+/g) || [];
  const stack: number[] = [];
  const lines: PathLine[] = [];
  let current: { x: number; y: number } | null = null;
  for (const token of tokens) {
    const number = Number(token);
    if (Number.isFinite(number)) { stack.push(number); continue; }
    if (token === "m" && stack.length >= 2) current = { x: stack.at(-2)!, y: stack.at(-1)! };
    else if (token === "l" && stack.length >= 2 && current) {
      const end = { x: stack.at(-2)!, y: stack.at(-1)! };
      lines.push({ start: current, end });
      current = end;
    } else if (token === "re" && stack.length >= 4) {
      const [x, y, width, height] = stack.slice(-4);
      lines.push(
        { start: { x, y }, end: { x: x + width, y } },
        { start: { x: x + width, y }, end: { x: x + width, y: y + height } },
        { start: { x: x + width, y: y + height }, end: { x, y: y + height } },
        { start: { x, y: y + height }, end: { x, y } },
      );
      current = { x, y };
    } else if (["S", "s", "f", "F", "B", "b", "n"].includes(token)) current = null;
    stack.length = 0;
  }
  return lines;
}

function dimensions(blocks: BlueprintTextBlock[]): BlueprintDimension[] {
  const output: BlueprintDimension[] = [];
  for (const block of blocks) {
    if (/\bSCALE\b/i.test(block.text)) continue;
    for (const match of block.text.matchAll(/(\d+)\s*['′]\s*-\s*(\d+)\s*["″]/g)) {
      output.push({ dimensionId: stableBlueprintId("dim", block.textBlockId, match.index || 0), sheetId: block.sheetId, viewportId: block.viewportId, pageNumber: block.pageNumber, sourceTextBlockId: block.textBlockId, text: match[0], value: Number(match[1]) + Number(match[2]) / 12, units: "ft", confidence: .99 });
    }
  }
  return output;
}

function wallCandidates(primitives: BlueprintVectorPrimitive[], ratio: number | null, heightFeet?: number): BlueprintGeometryCandidate[] {
  const axisLines = primitives.map((primitive) => {
    const horizontal = Math.abs(primitive.start.y - primitive.end.y) <= .25;
    const vertical = Math.abs(primitive.start.x - primitive.end.x) <= .25;
    if (!horizontal && !vertical) return null;
    const length = Math.hypot(primitive.end.x - primitive.start.x, primitive.end.y - primitive.start.y);
    if (length < 72) return null;
    return { primitive, horizontal, a1: horizontal ? Math.min(primitive.start.x, primitive.end.x) : Math.min(primitive.start.y, primitive.end.y), a2: horizontal ? Math.max(primitive.start.x, primitive.end.x) : Math.max(primitive.start.y, primitive.end.y), offset: horizontal ? primitive.start.y : primitive.start.x };
  }).filter((line): line is NonNullable<typeof line> => line !== null);
  const used = new Set<string>();
  const output: BlueprintGeometryCandidate[] = [];
  for (let index = 0; index < axisLines.length; index += 1) {
    const first = axisLines[index];
    if (used.has(first.primitive.primitiveId)) continue;
    const second = axisLines.slice(index + 1).find((candidate) => candidate.horizontal === first.horizontal && !used.has(candidate.primitive.primitiveId) && Math.abs(candidate.a1 - first.a1) <= 1 && Math.abs(candidate.a2 - first.a2) <= 1 && Math.abs(candidate.offset - first.offset) >= 2 && Math.abs(candidate.offset - first.offset) <= 18);
    if (!second) continue;
    used.add(first.primitive.primitiveId); used.add(second.primitive.primitiveId);
    const center = (first.offset + second.offset) / 2;
    const points = first.horizontal ? [{ x: (first.a1 + second.a1) / 2, y: center }, { x: (first.a2 + second.a2) / 2, y: center }] : [{ x: center, y: (first.a1 + second.a1) / 2 }, { x: center, y: (first.a2 + second.a2) / 2 }];
    const sourceIds = [first.primitive.primitiveId, second.primitive.primitiveId].sort();
    output.push({ geometryId: stableBlueprintId("geo", first.primitive.sheetId, ...sourceIds), sheetId: first.primitive.sheetId, viewportId: first.primitive.viewportId, pageNumber: first.primitive.pageNumber, kind: "wall_centerline", points: points as [{ x: number; y: number }, { x: number; y: number }], thicknessPdfPoints: Math.abs(first.offset - second.offset), heightFeet, sourcePrimitiveIds: sourceIds, extractionMethod: "vector_parallel_faces", confidence: ratio ? .94 : .68, assumptions: ["Parallel vector faces are interpreted as a preliminary wall centerline and require user confirmation."], reviewStatus: "requires_review" });
  }
  return output;
}

export async function extractVectorPdf(bytes: ArrayBuffer | Uint8Array, input: { projectId: string; revisionId: string; sourceDocumentId: string; sheetIds: string[]; extractedAt: string }): Promise<BlueprintIR> {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const source = new TextDecoder("latin1").decode(data);
  if (!source.startsWith("%PDF-")) throw new VectorPdfExtractionError("The source is not a PDF document.");
  if (/\/Encrypt\b/.test(source)) throw new VectorPdfExtractionError("Encrypted PDFs are unsupported and were not processed.");
  const objects = parseObjects(source);
  const pageObjects = objects.filter((object) => /\/Type\s*\/Page\b/.test(object.body));
  if (!pageObjects.length) throw new VectorPdfExtractionError("The PDF has no readable page objects.");
  const warnings: BlueprintIR["warnings"] = [];
  const sheets: BlueprintIR["sheets"] = [];
  const viewports: BlueprintIR["viewports"] = [];
  const allText: BlueprintTextBlock[] = [];
  const allVectors: BlueprintVectorPrimitive[] = [];
  for (let pageIndex = 0; pageIndex < pageObjects.length; pageIndex += 1) {
    const page = pageObjects[pageIndex];
    const pageNumber = pageIndex + 1;
    const sheetId = input.sheetIds[pageIndex];
    if (!sheetId) throw new VectorPdfExtractionError(`No persisted sheet identity exists for PDF page ${pageNumber}.`);
    const media = page.body.match(/\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/) || source.match(/\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/);
    const width = media ? Number(media[3]) - Number(media[1]) : 612;
    const height = media ? Number(media[4]) - Number(media[2]) : 792;
    const refs = [...page.body.matchAll(/\/Contents\s+(?:\[\s*)?(\d+)\s+\d+\s+R/g)].map((match) => Number(match[1]));
    const contents = (await Promise.all(refs.map(async (id) => contentStream(objects.find((object) => object.id === id) || { id, body: "" }, warnings, pageNumber)))).join("\n");
    const titleProbe = [...contents.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((match) => pdfString(match[1])).join(" ");
    const classification = /\bFLOOR\s+PLAN\b/i.test(titleProbe) ? "floor_plan" : /\bGENERAL\s+NOTES\b/i.test(titleProbe) ? "notes" : "unknown";
    const viewportId = stableBlueprintId("vpt", input.revisionId, input.sourceDocumentId, pageNumber, classification);
    sheets.push({ sheetId, pageNumber, title: titleProbe.match(/[^\n]{1,80}/)?.[0] || `PDF page ${pageNumber}`, width, height, units: "pdf_pt", classification, confidence: classification === "unknown" ? .45 : .96 });
    viewports.push({ viewportId, projectId: input.projectId, revisionId: input.revisionId, sourceDocumentId: input.sourceDocumentId, sheetId, pageNumber, bounds: { x: 0, y: 0, width, height }, classification, discipline: classification === "floor_plan" ? "architectural" : "unknown", confidence: classification === "unknown" ? .45 : .96 });
    const blocks = textBlocks(contents, sheetId, viewportId, pageNumber);
    allText.push(...blocks);
    allVectors.push(...pathLines(contents).map((line) => ({ primitiveId: stableBlueprintId("vec", sheetId, line.start.x.toFixed(3), line.start.y.toFixed(3), line.end.x.toFixed(3), line.end.y.toFixed(3)), sheetId, viewportId, pageNumber, kind: "line" as const, start: line.start, end: line.end, units: "pdf_pt" as const, extractionMethod: "embedded_pdf_vector" as const, confidence: .99 })));
  }
  const dims = dimensions(allText);
  const scaleCandidates: BlueprintIR["scaleCandidates"] = [];
  for (const block of allText) {
    const match = block.text.match(/(?:SCALE\s*:?\s*)?(\d+\/\d+|\d+(?:\.\d+)?)\s*["″]\s*=\s*(\d+)\s*['′](?:\s*-\s*(\d+)\s*["″])?/i);
    if (!match) continue;
    const drawingInches = match[1].includes("/") ? Number(match[1].split("/")[0]) / Number(match[1].split("/")[1]) : Number(match[1]);
    const ratio = (Number(match[2]) * 12 + Number(match[3] || 0)) / drawingInches;
    const pageDimensions = dims.filter((dimension) => dimension.viewportId === block.viewportId);
    const pageLines = allVectors.filter((line) => line.viewportId === block.viewportId && Math.min(line.start.y, line.end.y) > 100 && Math.abs(line.start.y - line.end.y) <= .25);
    const verifiedDimension = pageDimensions.find((dimension) => pageLines.some((line) => Math.abs(Math.abs(line.end.x - line.start.x) * ratio / 864 - dimension.value) <= Math.max(.05, dimension.value * .01)));
    scaleCandidates.push({ scaleCandidateId: stableBlueprintId("scl", block.textBlockId, ratio), viewportId: block.viewportId, sourceTextBlockId: block.textBlockId, writtenScale: match[0].trim(), ratio, status: verifiedDimension ? "dimension_verified" : "candidate", confidence: verifiedDimension ? .99 : .78, dimensionIds: verifiedDimension ? [verifiedDimension.dimensionId] : [] });
  }
  const heightBlock = allText.find((block) => /WALL\s+HEIGHT/i.test(block.text));
  const heightMatch = heightBlock?.text.match(/(\d+)\s*['′]\s*-\s*(\d+)\s*["″]/);
  const heightFeet = heightMatch ? Number(heightMatch[1]) + Number(heightMatch[2]) / 12 : undefined;
  const verifiedScale = scaleCandidates.find((candidate) => candidate.status === "dimension_verified");
  const candidates = wallCandidates(allVectors, verifiedScale?.ratio ?? null, heightFeet);
  const organizedNotes = allText.filter((block) => /GENERAL\s+NOTES|EXTERIOR\s+WALLS|WALL\s+HEIGHT/i.test(block.text)).map((block) => ({ noteId: stableBlueprintId("note", block.textBlockId), projectId: input.projectId, revisionId: input.revisionId, sourceDocumentId: input.sourceDocumentId, sheetId: block.sheetId, viewportId: block.viewportId, pageNumber: block.pageNumber, sourceBounds: block.bounds, category: /EXTERIOR\s+WALLS/i.test(block.text) ? "materials" as const : /HEIGHT/i.test(block.text) ? "dimensions" as const : "general_notes" as const, discipline: "architectural" as const, title: /GENERAL\s+NOTES/i.test(block.text) ? "General notes" : /HEIGHT/i.test(block.text) ? "Wall height" : "Wall assembly note", text: block.text, sourceTextBlockIds: [block.textBlockId], extractionMethod: "embedded_pdf_text" as const, confidence: .98, assumptions: [], reviewStatus: "requires_review" as const }));
  if (!verifiedScale) warnings.push({ code: "scale_requires_review", message: "No written scale was cross-checked against a matching printed dimension." });
  if (!candidates.length) warnings.push({ code: "walls_not_detected", message: "No parallel vector wall faces were detected." });
  return validateBlueprintIR({ schemaVersion: BLUEPRINT_IR_SCHEMA_VERSION, projectId: input.projectId, revisionId: input.revisionId, sourceDocumentId: input.sourceDocumentId, extractedAt: input.extractedAt, parser: { name: "buildscope-vector-pdf", version: "0.1.0" }, status: candidates.length && verifiedScale ? "ready" : "partial", sheets, viewports, scaleCandidates, vectorPrimitives: allVectors, textBlocks: allText, organizedNotes, dimensions: dims, geometryCandidates: candidates, warnings, provenance: sheets.flatMap((sheet) => ([{ provenanceId: stableBlueprintId("prv", input.sourceDocumentId, sheet.pageNumber, "text"), sourceDocumentId: input.sourceDocumentId, pageNumber: sheet.pageNumber, method: "embedded_pdf_text" as const, parserVersion: "0.1.0" as const }, { provenanceId: stableBlueprintId("prv", input.sourceDocumentId, sheet.pageNumber, "vector"), sourceDocumentId: input.sourceDocumentId, pageNumber: sheet.pageNumber, method: "embedded_pdf_vector" as const, parserVersion: "0.1.0" as const }])) });
}
