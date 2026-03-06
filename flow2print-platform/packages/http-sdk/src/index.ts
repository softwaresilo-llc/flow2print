import { z } from "zod";

export const launchSessionRequestSchema = z.object({
  connectorType: z.literal("magento2"),
  externalStoreId: z.string().min(1),
  externalProductRef: z.string().min(1),
  templateId: z.string().min(1).nullable().optional(),
  externalVariantRef: z.string().min(1).optional(),
  customer: z.object({
    externalCustomerRef: z.string().min(1).optional(),
    email: z.email(),
    isGuest: z.boolean()
  }),
  locale: z.string().min(2),
  currency: z.string().min(3),
  returnUrl: z.url(),
  options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const launchSessionResponseSchema = z.object({
  launchSessionId: z.string().min(1),
  projectId: z.string().min(1),
  designerUrl: z.string().min(1),
  expiresAt: z.iso.datetime()
});

export const finalizeProjectRequestSchema = z.object({
  approvalIntent: z.enum(["auto", "request"]).default("auto"),
  proofMode: z.enum(["none", "digital"]).default("digital")
});

export const applyTemplateRequestSchema = z.object({
  templateId: z.string().min(1).nullable()
});

export const finalizeProjectResponseSchema = z.object({
  projectId: z.string().min(1),
  finalVersionId: z.string().min(1),
  state: z.literal("finalized"),
  approvalState: z.enum(["not_required", "pending", "approved"]),
  jobs: z.array(z.object({
    jobId: z.string().min(1),
    jobType: z.enum(["preflight", "preview", "proof_pdf", "production_pdf"]),
    status: z.enum(["queued", "running", "succeeded", "failed"])
  }))
});

export type LaunchSessionRequest = z.infer<typeof launchSessionRequestSchema>;
export type LaunchSessionResponse = z.infer<typeof launchSessionResponseSchema>;
export type FinalizeProjectRequest = z.infer<typeof finalizeProjectRequestSchema>;
export type ApplyTemplateRequest = z.infer<typeof applyTemplateRequestSchema>;
export type FinalizeProjectResponse = z.infer<typeof finalizeProjectResponseSchema>;
