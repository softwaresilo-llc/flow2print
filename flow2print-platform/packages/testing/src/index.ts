import type { Flow2PrintDocument } from "@flow2print/design-document";

export const sampleDocument = (): Flow2PrintDocument => ({
  schemaVersion: "1.0.0",
  projectId: "prj_demo",
  projectVersionId: "prv_demo",
  tenantId: "org_public",
  blueprintVersionId: "bpv_business_card",
  templateVersionId: null,
  locale: "en-US",
  currency: "USD",
  units: "mm",
  surfaces: [
    {
      surfaceId: "front",
      label: "Front",
      artboard: {
        width: 90,
        height: 50
      },
      bleedBox: { x: 0, y: 0, width: 94, height: 54 },
      safeBox: { x: 2, y: 2, width: 86, height: 46 },
      layers: [],
      flags: ["printable"]
    }
  ],
  assets: [],
  variables: {},
  metadata: {}
});
