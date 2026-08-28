declare module "cloudflare:workers" {
  // Runtime bindings are injected by Sites; concrete D1/R2 members are declared below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: any;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

// Drizzle supplies the operational D1 surface at compile time.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface D1Database {}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}
