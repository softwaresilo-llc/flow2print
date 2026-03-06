import { readBaseServiceConfig } from "@flow2print/config";
import { createLogger } from "@flow2print/logging";

const { SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "preflight-worker"
});

const logger = createLogger(SERVICE_NAME);
logger.info({ service: SERVICE_NAME }, "Preflight worker bootstrap ready");
