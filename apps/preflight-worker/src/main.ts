import { readEnvironment } from "@flow2print/config";

const env = readEnvironment();

console.log("[preflight-worker] booted", {
  rabbitmq: env.FLOW2PRINT_RABBITMQ_URL,
  redis: env.FLOW2PRINT_REDIS_URL
});

