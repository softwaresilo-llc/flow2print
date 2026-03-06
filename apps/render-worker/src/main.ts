import { readEnvironment } from "@flow2print/config";

const env = readEnvironment();

console.log("[render-worker] booted", {
  rabbitmq: env.FLOW2PRINT_RABBITMQ_URL,
  bucket: env.FLOW2PRINT_S3_BUCKET
});

