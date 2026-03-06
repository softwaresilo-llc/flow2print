import test from "node:test";
import assert from "node:assert/strict";

import { createProjectAggregate, finalizeProject } from "./index.js";

test("creates an apparel project aggregate from a launch session request", () => {
  const aggregate = createProjectAggregate({
    connectorType: "magento2",
    externalStoreId: "default",
    externalProductRef: "SKU-TSHIRT-BLACK",
    customer: {
      email: "demo@example.com",
      isGuest: false
    },
    locale: "en-US",
    currency: "USD",
    returnUrl: "http://localhost/return",
    options: {
      size: "L"
    }
  });

  assert.equal(aggregate.project.blueprintId, "bp_tshirt");
  assert.equal(aggregate.project.status, "draft");
  assert.equal(aggregate.commerceLink.state, "launch_created");
  assert.equal(aggregate.project.commerceLinkId, aggregate.commerceLink.id);
  assert.equal(aggregate.projectVersion.document.surfaces[0]?.surfaceId, "front_zone");
});

test("finalizeProject promotes a draft into a final version and output jobs", () => {
  const aggregate = createProjectAggregate({
    connectorType: "magento2",
    externalStoreId: "default",
    externalProductRef: "SKU-BUSINESS-CARD",
    customer: {
      email: "demo@example.com",
      isGuest: true
    },
    locale: "en-US",
    currency: "USD",
    returnUrl: "http://localhost/return",
    options: {}
  });

  const finalized = finalizeProject(aggregate.project, aggregate.projectVersion, "digital", "request");

  assert.equal(finalized.project.status, "finalized");
  assert.equal(finalized.project.approvalState, "pending");
  assert.equal(finalized.version.isFinal, true);
  assert.equal(finalized.project.latestJobs.length, 4);
});
