import { z } from "zod";
declare const environmentSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    FLOW2PRINT_PUBLIC_URL: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_API_URL: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_POSTGRES_URL: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_REDIS_URL: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_RABBITMQ_URL: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_S3_ENDPOINT: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_S3_ACCESS_KEY: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_S3_SECRET_KEY: z.ZodDefault<z.ZodString>;
    FLOW2PRINT_S3_BUCKET: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type Flow2PrintEnvironment = z.infer<typeof environmentSchema>;
export declare function readEnvironment(source?: NodeJS.ProcessEnv): Flow2PrintEnvironment;
export {};
