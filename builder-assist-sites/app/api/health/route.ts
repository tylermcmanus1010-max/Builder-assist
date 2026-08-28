import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { gen1Workspaces } from "../../../db/schema";

export const dynamic = "force-dynamic";

type DependencyCheck = {
  status: "ready" | "failed";
  latencyMs: number;
};

async function timed(check: () => Promise<unknown>): Promise<DependencyCheck> {
  const started = performance.now();
  try {
    await check();
    return { status: "ready", latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { status: "failed", latencyMs: Math.round(performance.now() - started) };
  }
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const [database, storage] = await Promise.all([
    timed(async () => {
      // Provider reachability alone is insufficient: a fresh or failed release
      // can answer SELECT 1 while every user query fails because migrations are
      // missing. Read one application table so readiness reflects usable D1.
      await getDb().select({ id: gen1Workspaces.id }).from(gen1Workspaces).limit(1);
    }),
    timed(async () => {
      if (!env.BUCKET) throw new Error("Storage binding unavailable");
      // A missing reserved object is a valid result; completing the head request
      // verifies that the binding and provider are reachable without user data.
      await env.BUCKET.head("__builder_assist_readiness_probe__");
    }),
  ]);
  const ready = database.status === "ready" && storage.status === "ready";
  if (!ready) console.error(`Builder Assist readiness failed [${requestId}]`, { database: database.status, storage: storage.status });
  return Response.json(
    { status: ready ? "ready" : "degraded", requestId, dependencies: { database, storage } },
    {
      status: ready ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        ...(ready ? {} : { "retry-after": "30" }),
      },
    },
  );
}
