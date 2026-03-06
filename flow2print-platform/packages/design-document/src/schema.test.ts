import test from "node:test";
import assert from "node:assert/strict";

import { validateFlow2PrintDocument } from "./index.js";

test("validates a minimal flow2print document", () => {
  const result = validateFlow2PrintDocument({
    schemaVersion: "1.0.0",
    projectId: "prj_1",
    projectVersionId: "prv_1",
    tenantId: "org_1",
    blueprintVersionId: "bpv_1",
    templateVersionId: null,
    locale: "en-US",
    currency: "USD",
    units: "mm",
    surfaces: [
      {
        surfaceId: "front",
        label: "Front",
        artboard: { width: 90, height: 50 },
        bleedBox: { x: 0, y: 0, width: 94, height: 54 },
        safeBox: { x: 2, y: 2, width: 90, height: 50 },
        layers: [],
        flags: ["printable"]
      }
    ],
    assets: [],
    variables: {},
    metadata: {}
  });

  assert.equal(result.success, true);
});

test("rejects a document without surfaces", () => {
  const result = validateFlow2PrintDocument({
    schemaVersion: "1.0.0",
    projectId: "prj_1",
    projectVersionId: "prv_1",
    tenantId: "org_1",
    blueprintVersionId: "bpv_1",
    templateVersionId: null,
    locale: "en-US",
    currency: "USD",
    units: "mm",
    surfaces: [],
    assets: [],
    variables: {},
    metadata: {}
  });

  assert.equal(result.success, false);
});
