import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("runtime store finalization creates report and artifacts", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "flow2print-store-"));
  process.env.FLOW2PRINT_STATE_FILE = join(tempDir, "state.json");

  const { getRuntimeStore } = await import("./index.js");
  const store = getRuntimeStore();

  const launch = await store.createLaunchSession({
    connectorType: "magento2",
    externalStoreId: "default",
    externalProductRef: "SKU-BUSINESS-CARD",
    customer: {
      email: "demo@example.com",
      isGuest: false
    },
    locale: "en-US",
    currency: "USD",
    returnUrl: "http://localhost/return",
    options: {}
  });

  const projectBefore = await store.getProject(launch.projectId);
  assert.ok(projectBefore);

  const finalized = await store.finalizeProjectById(launch.projectId, {
    approvalIntent: "auto",
    proofMode: "digital"
  });

  assert.ok(finalized);
  assert.equal(finalized.project.status, "finalized");
  assert.equal(finalized.report.status, "warn");
  assert.equal(finalized.artifacts.length, 3);

  const report = await store.getLatestPreflightReport(launch.projectId);
  const artifacts = await store.getProjectArtifacts(launch.projectId);
  const commerceStatus = await store.getCommerceStatus(launch.projectId);
  const quoteLink = await store.createQuoteLink({
    projectId: launch.projectId,
    externalQuoteRef: "quote-1000"
  });
  const orderLink = await store.createOrderLink({
    projectId: launch.projectId,
    externalOrderRef: "order-1000"
  });
  const persistedLink = await store.getCommerceLinkByProject(launch.projectId);

  assert.ok(report);
  assert.equal(report?.id, finalized.report.id);
  assert.equal(artifacts.length, 3);
  assert.equal(commerceStatus?.artifacts.length, 3);
  assert.equal(commerceStatus?.projectVersionId, finalized.version.id);
  assert.equal(commerceStatus?.preflightStatus, "warn");
  await access(join(tempDir, ".flow2print-runtime", "artifacts", launch.projectId, finalized.version.id, "preview.png"));
  await access(join(tempDir, ".flow2print-runtime", "artifacts", launch.projectId, finalized.version.id, "production.pdf"));
  await access(join(tempDir, ".flow2print-runtime", "artifacts", launch.projectId, finalized.version.id, "proof.pdf"));
  assert.equal(quoteLink?.state, "quote_linked");
  assert.equal(orderLink?.state, "order_linked");
  assert.equal(persistedLink?.externalOrderRef, "order-1000");

  await rm(tempDir, { recursive: true, force: true });
  delete process.env.FLOW2PRINT_STATE_FILE;
});
