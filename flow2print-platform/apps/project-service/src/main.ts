import Fastify from "fastify";
import { randomUUID } from "node:crypto";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "project-service",
  PORT: process.env.PORT ?? "3104"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });
const store = getRuntimeStore();

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.post("/v1/projects", async () => ({
  id: `prj_${randomUUID()}`,
  status: "draft"
}));

app.get("/v1/projects", async () => ({
  docs: await store.listProjects()
}));

app.get("/v1/projects/:id", async (request, reply) => {
  const project = await store.getProject(String((request.params as { id: string }).id));
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send({
    ...project.project,
    version: project.version,
    document: project.version.document
  });
});

await app.listen({ port: PORT, host: "0.0.0.0" });
