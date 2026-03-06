import Fastify from "fastify";
import { randomUUID } from "node:crypto";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "identity-service",
  PORT: process.env.PORT ?? "3101"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.post("/v1/guests", async () => ({
  id: `usr_${randomUUID()}`,
  type: "guest",
  tenantId: "public"
}));

app.get("/v1/me", async () => ({
  id: "usr_demo",
  email: "demo@flow2print.local",
  roles: ["system_admin"],
  tenantId: "public"
}));

await app.listen({ port: PORT, host: "0.0.0.0" });
