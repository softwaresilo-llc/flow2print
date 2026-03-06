import Fastify from "fastify";

import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "commerce-connector-service",
  PORT: process.env.PORT ?? "3107"
});

const app = Fastify({ loggerInstance: createLogger(SERVICE_NAME) });
const store = getRuntimeStore();

app.get("/healthz", async () => ({ ok: true, service: SERVICE_NAME }));

app.post("/v1/connectors/magento2/quote-links", async (request, reply) => {
  const body = request.body as {
    projectId?: string;
    externalQuoteRef?: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  };
  if (!body.projectId || !body.externalQuoteRef) {
    return reply.status(400).send({ code: "project_id_and_external_quote_ref_required" });
  }
  const link = await store.createQuoteLink({
    projectId: body.projectId,
    externalQuoteRef: body.externalQuoteRef,
    externalStoreId: body.externalStoreId,
    externalProductRef: body.externalProductRef,
    externalCustomerRef: body.externalCustomerRef,
    returnUrl: body.returnUrl
  });
  if (!link) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.status(201).send(link);
});

app.post("/v1/connectors/magento2/order-links", async (request, reply) => {
  const body = request.body as {
    projectId?: string;
    externalOrderRef?: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  };
  if (!body.projectId || !body.externalOrderRef) {
    return reply.status(400).send({ code: "project_id_and_external_order_ref_required" });
  }
  const link = await store.createOrderLink({
    projectId: body.projectId,
    externalOrderRef: body.externalOrderRef,
    externalStoreId: body.externalStoreId,
    externalProductRef: body.externalProductRef,
    externalCustomerRef: body.externalCustomerRef,
    returnUrl: body.returnUrl
  });
  if (!link) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.status(201).send(link);
});

app.get("/v1/connectors/magento2/projects/:projectId/status", async (request, reply) => {
  const status = await store.getCommerceStatus(String((request.params as { projectId: string }).projectId));
  if (!status) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send(status);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
