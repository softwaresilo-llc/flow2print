import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FLOW2PRINT_PUBLIC_URL: z.string().url().default("http://localhost:8080"),
  FLOW2PRINT_API_URL: z.string().url().default("http://localhost:4000"),
  FLOW2PRINT_POSTGRES_URL: z.string().default("postgres://postgres:postgres@localhost:5432/flow2print"),
  FLOW2PRINT_REDIS_URL: z.string().default("redis://localhost:6379"),
  FLOW2PRINT_RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  FLOW2PRINT_S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  FLOW2PRINT_S3_ACCESS_KEY: z.string().default("minio"),
  FLOW2PRINT_S3_SECRET_KEY: z.string().default("minio123"),
  FLOW2PRINT_S3_BUCKET: z.string().default("flow2print-local")
});

export type Flow2PrintEnvironment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Flow2PrintEnvironment {
  return environmentSchema.parse(source);
}
