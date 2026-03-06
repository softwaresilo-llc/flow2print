"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnvironment = readEnvironment;
const zod_1 = require("zod");
const environmentSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    FLOW2PRINT_PUBLIC_URL: zod_1.z.string().url().default("http://localhost:8080"),
    FLOW2PRINT_API_URL: zod_1.z.string().url().default("http://localhost:4000"),
    FLOW2PRINT_POSTGRES_URL: zod_1.z.string().default("postgres://postgres:postgres@localhost:5432/flow2print"),
    FLOW2PRINT_REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    FLOW2PRINT_RABBITMQ_URL: zod_1.z.string().default("amqp://guest:guest@localhost:5672"),
    FLOW2PRINT_S3_ENDPOINT: zod_1.z.string().url().default("http://localhost:9000"),
    FLOW2PRINT_S3_ACCESS_KEY: zod_1.z.string().default("minio"),
    FLOW2PRINT_S3_SECRET_KEY: zod_1.z.string().default("minio123"),
    FLOW2PRINT_S3_BUCKET: zod_1.z.string().default("flow2print-local")
});
function readEnvironment(source = process.env) {
    return environmentSchema.parse(source);
}
//# sourceMappingURL=index.js.map