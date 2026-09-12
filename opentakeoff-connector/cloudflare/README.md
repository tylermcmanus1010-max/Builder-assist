# OpenTakeoff connector on Cloudflare

The Cloudflare service and GitHub build integration are registered. The first
connector deployment is pending validation. This package runs the parent Node
connector in one `lite` Container, fronted by an authenticated Worker, separate
from the Builder Assist Sites application.

## Request and session behavior

Every public request, including `/healthz`, requires `Authorization: Bearer ...`.
The Worker rejects any browser `Origin` header and validates the token before
looking up or waking a container. It does not enable browser CORS.

The Worker forwards a streamed request to `localhost:8080` and sets the internal
Host accordingly. The original bearer token remains present for the bridge's
independent authentication check. Runtime settings pass `CONNECTOR_TOKEN` through
the Container's `envVars`; the secret is never a Docker build argument.

A constant Durable Object name and `max_instances: 1` keep every MCP request on
the same process. The bridge isolates sessions and bounds their resource use.
The container sleeps after 35 idle minutes, exceeding the bridge's default
30-minute idle timeout. Restarts, image rollouts and host failures still discard
temporary uploads and sessions. Export results before closing a session; on a
lost session, initialize again and re-upload source files. This is not durable
project-file storage.

## Local validation

From this `cloudflare` folder:

```sh
npm ci
npm run check
npm run deploy:worker-dry-run
npm run deploy:dry-run
```

The Worker-only dry run validates and bundles the Worker without attempting a
container image build. The full dry run also attempts to build the parent Docker
image and requires a Docker-compatible engine. Neither command deploys resources.
Workers Builds can perform the image build when local Docker is unavailable.

## Workers Builds configuration

Connect the intended GitHub repository to a **new** Worker named
`builder-assist-opentakeoff` in account `cd940fbd991c8d01260a88ef3840a019`.
Use repository `tylermcmanus1010-max/Builder-assist` with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `opentakeoff-connector` |
| Build command | `npm --prefix cloudflare ci && npm --prefix cloudflare run check` |
| Deploy command | `npm --prefix cloudflare run deploy` |
| Production branch | `codex/opentakeoff-cloudflare` |
| Non-production branch builds | Disabled |
| Node.js version | `24.20.0` (checked in as `.node-version`) |
| Build variable | `SKIP_DEPENDENCY_INSTALL=1` |

The build root includes both the Dockerfile and `cloudflare/wrangler.jsonc`, as
required by the Containers deployment guidance. The deploy script runs the pinned
Wrangler from its own `cloudflare` package. The configuration uses `../Dockerfile`
and `image_build_context: ".."` so the connector's package lock, server and
Dockerfile remain in the image build context. Both package
lockfiles must be committed. Do not substitute `wrangler versions upload` for
the deploy command: it does not publish or roll out container images.

The build variable skips automatic dependency installation at the connector root;
the explicit build command installs the Worker package, and the Dockerfile installs
the separate Node measurement runtime from its own lockfile.

Before the first deployment, create the new Worker's runtime secret
`CONNECTOR_TOKEN` using the Cloudflare dashboard or `npx wrangler secret put
CONNECTOR_TOKEN` from this folder. Use a randomly generated secret of at least
32 bytes without whitespace, and save the same value in the authorized calling
service's secret storage. Never place it in source, build variables, command
arguments, or a URL. Creating a secret or first deploying may create a Worker;
perform those steps only when ready to enable hosting.

Hosting requires Workers Paid with Containers enabled, a Docker-enabled Workers
Builds execution environment, the Cloudflare GitHub App authorized for the repo,
and a build token with the deployment permissions. API automation additionally
needs a user-scoped API token with Workers Builds Configuration Edit; the current
Wrangler OAuth session was denied access to the Builds token endpoint.

After a successful deployment, obtain the actual workers.dev hostname from the
deployment result. Configure callers with its `/mcp` URL and the runtime bearer
secret. Verify authenticated health, initialize, tools/list, upload and a
measurement/export before connecting production project data.

## Official references

- [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/)
- [Container class and named routing](https://developers.cloudflare.com/containers/reference/container-class/)
- [Container runtime environment and secrets](https://developers.cloudflare.com/containers/examples/env-vars-and-secrets/)
- [Workers Builds setup](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
