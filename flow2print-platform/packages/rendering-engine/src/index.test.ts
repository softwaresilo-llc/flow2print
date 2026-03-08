import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import { renderProjectOutputs } from "./index.js";

test("renderProjectOutputs creates non-stub preview and PDFs from document content", async () => {
  const outputs = await renderProjectOutputs({
    projectId: "prj_test",
    projectVersionId: "prv_test",
    preflightStatus: "pass",
    assets: [],
    document: {
      schemaVersion: "1.0.0",
      projectId: "prj_test",
      projectVersionId: "prv_test",
      tenantId: "org_public",
      blueprintVersionId: "bpv_test",
      templateVersionId: null,
      locale: "en-US",
      currency: "USD",
      units: "mm",
      assets: [],
      variables: {},
      metadata: {},
      surfaces: [
        {
          surfaceId: "front",
          label: "Front",
          flags: ["printable"],
          artboard: { width: 90, height: 50 },
          bleedBox: { x: 0, y: 0, width: 90, height: 50 },
          safeBox: { x: 3, y: 3, width: 84, height: 44 },
          layers: [
            {
              id: "lyr_text",
              type: "text",
              name: "Headline",
              visible: true,
              locked: false,
              x: 8,
              y: 10,
              width: 60,
              height: 10,
              rotation: 0,
              opacity: 1,
              metadata: {
                text: "Flow2Print",
                color: "#1b2430",
                fontSize: 20,
                fontWeight: "700",
                textAlign: "left"
              }
            },
            {
              id: "lyr_shape",
              type: "shape",
              name: "Accent",
              visible: true,
              locked: false,
              x: 8,
              y: 28,
              width: 24,
              height: 10,
              rotation: 0,
              opacity: 1,
              metadata: {
                fill: "#dbe8ff"
              }
            },
            {
              id: "lyr_qr",
              type: "qr",
              name: "QR",
              visible: true,
              locked: false,
              x: 68,
              y: 8,
              width: 14,
              height: 14,
              rotation: 0,
              opacity: 1,
              metadata: {
                value: "https://flow2print.example.com"
              }
            },
            {
              id: "lyr_barcode",
              type: "barcode",
              name: "Barcode",
              visible: true,
              locked: false,
              x: 40,
              y: 30,
              width: 36,
              height: 10,
              rotation: 0,
              opacity: 1,
              metadata: {
                value: "5901234123457"
              }
            }
          ]
        },
        {
          surfaceId: "back",
          label: "Back",
          flags: ["printable"],
          artboard: { width: 90, height: 50 },
          bleedBox: { x: 0, y: 0, width: 90, height: 50 },
          safeBox: { x: 3, y: 3, width: 84, height: 44 },
          layers: [
            {
              id: "lyr_back_text",
              type: "text",
              name: "Backline",
              visible: true,
              locked: false,
              x: 8,
              y: 12,
              width: 54,
              height: 10,
              rotation: 0,
              opacity: 1,
              metadata: {
                text: "Back side",
                color: "#334e68",
                fontSize: 16,
                fontWeight: "600",
                textAlign: "left"
              }
            }
          ]
        }
      ]
    }
  });

  const previewMetadata = await sharp(outputs.previewPng).metadata();

  assert.ok(outputs.previewPng.byteLength > 8_000);
  assert.ok(outputs.productionPdf.byteLength > 3_000);
  assert.ok(outputs.proofPdf.byteLength > 3_500);
  assert.ok((previewMetadata.width ?? 0) > 800);
  assert.ok((previewMetadata.height ?? 0) > 1_000);
  assert.ok(outputs.productionPdf.subarray(0, 4).toString("utf8").startsWith("%PDF"));
  assert.ok(outputs.proofPdf.subarray(0, 4).toString("utf8").startsWith("%PDF"));
});
