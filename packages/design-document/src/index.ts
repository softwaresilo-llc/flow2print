import { z } from "zod";

const boxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive()
});

const sharedLayerSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "shape", "svg", "group", "barcode", "qr", "placeholder", "technical", "cutline", "foldline", "gluezone"]),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const textLayerSchema = sharedLayerSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontFamilyRef: z.string(),
  fontSizePt: z.number().positive(),
  lineHeight: z.number().positive(),
  color: z.string()
});

const imageLayerSchema = sharedLayerSchema.extend({
  type: z.literal("image"),
  assetRef: z.string(),
  fitMode: z.enum(["contain", "cover", "stretch", "manual"]).default("contain"),
  crop: boxSchema.nullable().default(null)
});

const genericLayerSchema = sharedLayerSchema.extend({
  type: z.enum(["shape", "svg", "group", "barcode", "qr", "placeholder", "technical", "cutline", "foldline", "gluezone"])
});

export const documentLayerSchema = z.union([
  textLayerSchema,
  imageLayerSchema,
  genericLayerSchema
]);

export const surfaceSchema = z.object({
  surfaceId: z.string(),
  label: z.string(),
  artboard: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }),
  bleedBox: boxSchema,
  safeBox: boxSchema,
  printArea: boxSchema.optional(),
  technicalOverlayRef: z.string().optional(),
  mockupRef: z.string().optional(),
  layers: z.array(documentLayerSchema)
});

export const flow2PrintDocumentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  projectId: z.string(),
  projectVersionId: z.string(),
  tenantId: z.string(),
  blueprintVersionId: z.string(),
  templateVersionId: z.string().nullable(),
  locale: z.string(),
  currency: z.string(),
  units: z.literal("mm"),
  surfaces: z.array(surfaceSchema).min(1),
  assets: z.array(z.string()).default([]),
  variables: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type Flow2PrintDocument = z.infer<typeof flow2PrintDocumentSchema>;

export const sampleDocument: Flow2PrintDocument = {
  schemaVersion: "1.0.0",
  projectId: "prj_demo_business_card",
  projectVersionId: "prv_demo_business_card_v1",
  tenantId: "org_demo",
  blueprintVersionId: "bpv_business_card_v1",
  templateVersionId: "tpv_business_card_v1",
  locale: "de-DE",
  currency: "EUR",
  units: "mm",
  surfaces: [
    {
      surfaceId: "front",
      label: "Front",
      artboard: {
        width: 85,
        height: 55
      },
      bleedBox: {
        x: 0,
        y: 0,
        width: 91,
        height: 61
      },
      safeBox: {
        x: 3,
        y: 3,
        width: 79,
        height: 49
      },
      layers: [
        {
          id: "layer_name",
          type: "text",
          name: "Primary Name",
          visible: true,
          locked: false,
          x: 10,
          y: 14,
          width: 55,
          height: 12,
          rotation: 0,
          opacity: 1,
          text: "Flow2Print",
          fontFamilyRef: "font_inter",
          fontSizePt: 18,
          lineHeight: 1.2,
          color: "#111827",
          metadata: {}
        }
      ]
    }
  ],
  assets: [],
  variables: {},
  metadata: {
    channel: "portal"
  }
};

export function validateDocument(input: unknown): Flow2PrintDocument {
  return flow2PrintDocumentSchema.parse(input);
}
