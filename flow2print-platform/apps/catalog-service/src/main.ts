import Fastify from "fastify";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "catalog-service",
  PORT: process.env.PORT ?? "3102"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });
const store = getRuntimeStore();

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.get("/v1/blueprints", async () => ({
  docs: await store.getBlueprints()
}));

await app.listen({ port: PORT, host: "0.0.0.0" });
