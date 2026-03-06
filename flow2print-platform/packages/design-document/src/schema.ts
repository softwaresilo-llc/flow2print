import { z } from "zod";

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive()
});

const layerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "image", "shape", "svg", "group", "barcode", "qr", "placeholder", "technical", "cutline", "foldline", "gluezone"]),
  name: z.string().min(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const surfaceSchema = z.object({
  surfaceId: z.string().min(1),
  label: z.string().min(1),
  artboard: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  bleedBox: rectSchema,
  safeBox: rectSchema,
  printArea: rectSchema.optional(),
  technicalOverlayRef: z.string().optional(),
  mockupRef: z.string().optional(),
  layers: z.array(layerSchema).default([]),
  flags: z.array(z.enum(["printable", "proofOnly", "technicalOnly"])).default([])
});

const assetRefSchema = z.object({
  assetId: z.string().min(1),
  role: z.enum(["source", "derived", "font", "technical"]).default("source")
});

export const flow2PrintDocumentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  projectId: z.string().min(1),
  projectVersionId: z.string().min(1),
  tenantId: z.string().min(1),
  blueprintVersionId: z.string().min(1),
  templateVersionId: z.string().min(1).nullable(),
  locale: z.string().min(2),
  currency: z.string().min(3),
  units: z.literal("mm"),
  surfaces: z.array(surfaceSchema).min(1),
  assets: z.array(assetRefSchema).default([]),
  variables: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Flow2PrintDocument = z.infer<typeof flow2PrintDocumentSchema>;
