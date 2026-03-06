import Fastify from "fastify";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "production-service",
  PORT: process.env.PORT ?? "3106"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });
const store = getRuntimeStore();

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.get("/v1/projects/:id/preflight", async (request, reply) => {
  const projectId = String((request.params as { id: string }).id);
  const report = await store.getLatestPreflightReport(projectId);
  if (!report) {
    return reply.status(404).send({ code: "preflight_report_not_found" });
  }
  return reply.send(report);
});

app.get("/v1/projects/:id/artifacts", async (request, reply) => {
  const projectId = String((request.params as { id: string }).id);
  const artifacts = await store.getProjectArtifacts(projectId);
  if (artifacts.length === 0) {
    return reply.status(404).send({ code: "artifacts_not_found" });
  }
  return reply.send({ docs: artifacts });
});

await app.listen({ port: PORT, host: "0.0.0.0" });
