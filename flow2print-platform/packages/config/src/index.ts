import { z } from "zod";

const baseServiceSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SERVICE_NAME: z.string().min(1).default("flow2print-service")
});

const publicAppSchema = z.object({
  DESIGNER_APP_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\/+$/, "") : undefined))
});

export type BaseServiceConfig = z.infer<typeof baseServiceSchema>;
export type PublicAppConfig = z.infer<typeof publicAppSchema>;

export const readBaseServiceConfig = (env: NodeJS.ProcessEnv): BaseServiceConfig => {
  return baseServiceSchema.parse(env);
};

export const readPublicAppConfig = (env: NodeJS.ProcessEnv): PublicAppConfig => {
  return publicAppSchema.parse(env);
};
