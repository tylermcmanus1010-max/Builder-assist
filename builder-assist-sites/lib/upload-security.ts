export function validIdempotencyKey(value: string) {
  return /^[a-zA-Z0-9:_-]{16,128}$/.test(value);
}

export function safeStorageFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[.-]+|-+$/g, "").slice(0, 180) || "upload";
}

export async function hasExpectedFileSignature(file: Blob, extension: string) {
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (extension === "pdf") return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (extension === "png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (extension === "jpg" || extension === "jpeg") return starts(0xff, 0xd8, 0xff);
  if (extension === "webp") return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (extension === "tif" || extension === "tiff") return starts(0x49, 0x49, 0x2a, 0x00) || starts(0x4d, 0x4d, 0x00, 0x2a);
  if (extension === "dxf") return /^0\s+SECTION\b/i.test(new TextDecoder().decode(bytes).replace(/^\uFEFF/, "").trimStart());
  return false;
}
