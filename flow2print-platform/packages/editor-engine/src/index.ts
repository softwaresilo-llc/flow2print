import type { Flow2PrintDocument } from "@flow2print/design-document";

export const summarizeDocument = (document: Flow2PrintDocument) => ({
  surfaceCount: document.surfaces.length,
  layerCount: document.surfaces.reduce((total, surface) => total + surface.layers.length, 0),
  assetCount: document.assets.length
});
