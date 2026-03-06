import Fastify from "fastify";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "asset-service",
  PORT: process.env.PORT ?? "3105"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });
const store = getRuntimeStore();

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.get("/v1/assets", async () => ({
  docs: await store.listAssets()
}));

app.post("/v1/assets", async (request, reply) => {
  const body = request.body as {
    filename?: string;
    kind?: "image" | "svg" | "pdf" | "font" | "technical";
    mimeType?: string;
    widthPx?: number | null;
    heightPx?: number | null;
  };
  if (!body.filename) {
    return reply.status(400).send({ code: "filename_required" });
  }

  const asset = await store.createAsset({
    filename: body.filename,
    kind: body.kind,
    mimeType: body.mimeType,
    widthPx: body.widthPx,
    heightPx: body.heightPx
  });
  return reply.status(201).send(asset);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
