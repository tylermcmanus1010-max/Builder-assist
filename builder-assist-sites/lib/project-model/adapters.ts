export type BlueprintFormat = "vector_pdf" | "raster_pdf" | "image" | "dxf" | "dwg" | "ifc" | "dgn" | "rvt" | "cobie" | "schedule" | "specification";
export type AdapterAvailability = "native" | "delegated" | "supporting_only" | "unsupported";

export type SourceDescriptor = {
  filename: string;
  contentType: string;
  firstBytes?: Uint8Array;
  pdfHasVectorOperators?: boolean;
};

export type AdapterDecision = {
  format: BlueprintFormat;
  availability: AdapterAvailability;
  adapterId: string;
  reason?: string;
};

const extensionOf = (filename: string) => filename.split(".").pop()?.toLowerCase() ?? "";

export function selectBlueprintAdapter(source: SourceDescriptor): AdapterDecision {
  const extension = extensionOf(source.filename);
  if (extension === "pdf") {
    return source.pdfHasVectorOperators
      ? { format: "vector_pdf", availability: "native", adapterId: "pdf-vector-v1" }
      : { format: "raster_pdf", availability: "native", adapterId: "pdf-raster-v1" };
  }
  if (["png", "jpg", "jpeg", "tif", "tiff", "webp"].includes(extension)) {
    return { format: "image", availability: "native", adapterId: "raster-image-v1" };
  }
  if (extension === "dxf") return { format: "dxf", availability: "native", adapterId: "dxf-v1" };
  if (extension === "dwg") return { format: "dwg", availability: "delegated", adapterId: "dwg-approved-service-v1", reason: "Requires an approved conversion or parsing service" };
  if (extension === "ifc") return { format: "ifc", availability: "delegated", adapterId: "ifc-approved-service-v1", reason: "Authenticated BIM parser is not bundled in the browser runtime" };
  if (extension === "dgn") return { format: "dgn", availability: "delegated", adapterId: "dgn-approved-service-v1", reason: "Requires an approved adapter or conversion service" };
  if (extension === "rvt") return { format: "rvt", availability: "delegated", adapterId: "rvt-autodesk-export-v1", reason: "Requires an authorized Autodesk-compatible export" };
  if (["xlsx", "xls", "csv"].includes(extension)) return { format: "schedule", availability: "supporting_only", adapterId: "structured-schedule-v1" };
  if (["docx", "txt"].includes(extension)) return { format: "specification", availability: "supporting_only", adapterId: "specification-v1" };
  return { format: "specification", availability: "unsupported", adapterId: "unsupported-v1", reason: "No safe adapter is registered for this file type" };
}
