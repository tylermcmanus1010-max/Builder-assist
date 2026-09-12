import { Container, getContainer } from "@cloudflare/containers";

export class OpenTakeoffContainer extends Container<Env> {
  defaultPort = 8080;
  // Longer than the bridge's 30-minute idle session lifetime.
  sleepAfter = "35m";
  envVars = {
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PORT: "8080",
    DATA_DIR: "/tmp/opentakeoff",
    CONNECTOR_TOKEN: this.env.CONNECTOR_TOKEN,
    ALLOWED_HOSTS: "localhost,127.0.0.1",
    ALLOWED_ORIGINS: "",
  };
}

function error(status: number, message: string): Response {
  return Response.json({ error: message }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 401 ? { "WWW-Authenticate": 'Bearer realm="opentakeoff"' } : {}),
    },
  });
}

async function authorized(request: Request, token: string): Promise<boolean> {
  const header = request.headers.get("authorization") || "";
  const candidate = header.startsWith("Bearer ") && header.length < 4096 ? header.slice(7) : "";
  const encoder = new TextEncoder();
  const [expected, received] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(token)),
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
  ]);
  return crypto.subtle.timingSafeEqual(expected, received);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // This endpoint is for authenticated server/IDE clients. Do not strip Origin
    // to turn browser requests into trusted server requests.
    if (request.headers.has("origin")) return error(403, "Browser origins are not allowed");
    if (typeof env.CONNECTOR_TOKEN !== "string" || new TextEncoder().encode(env.CONNECTOR_TOKEN).byteLength < 32 || /\s/.test(env.CONNECTOR_TOKEN)) {
      return error(503, "Connector authentication is not configured");
    }
    if (!await authorized(request, env.CONNECTOR_TOKEN)) return error(401, "Authentication required");

    const incoming = new URL(request.url);
    const allowedPath = ["/mcp", "/plans", "/files", "/healthz"].includes(incoming.pathname) || incoming.pathname.startsWith("/files/");
    if (!allowedPath) return error(404, "Route not found");
    if (!["GET", "POST", "DELETE"].includes(request.method)) return error(405, "Method not allowed");

    const upstream = new URL(request.url);
    upstream.protocol = "http:";
    upstream.hostname = "localhost";
    upstream.port = "8080";
    const headers = new Headers(request.headers);
    headers.set("Host", "localhost:8080");
    const forwarded = new Request(upstream, {
      method: request.method,
      headers,
      body: request.body,
      signal: request.signal,
      redirect: "manual",
    });

    try {
      // Keep all MCP session IDs on the same process. The bridge owns per-session
      // isolation and quotas; random routing would lose its in-memory sessions.
      return await getContainer(env.OPENTAKEOFF, "builder-assist-opentakeoff-v1").fetch(forwarded);
    } catch {
      console.error(JSON.stringify({ event: "opentakeoff_upstream_unavailable" }));
      return error(503, "Connector is temporarily unavailable; retry or initialize a new session");
    }
  },
} satisfies ExportedHandler<Env>;
