import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("runtime store finalization creates report and artifacts", async () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const schema = `rt_${randomUUID().replace(/-/g, "")}`;
  const baseDatabaseUrl =
    process.env.DATABASE_URL ??
    process.env.FLOW2PRINT_POSTGRES_URL ??
    "postgresql://flow2print:flow2print@127.0.0.1:55433/flow2print";
  const databaseUrl = `${baseDatabaseUrl}${baseDatabaseUrl.includes("?") ? "&" : "?"}schema=${schema}`;
  const dataDir = resolve(repoRoot, `.flow2print-runtime-test-${schema}`);

  execFileSync("psql", [baseDatabaseUrl, "-c", `CREATE SCHEMA IF NOT EXISTS "${schema}"`], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  execFileSync("pnpm", ["--filter", "@flow2print/database", "db:migrate:deploy"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    },
    stdio: "ignore"
  });

  process.env.DATABASE_URL = databaseUrl;
  process.env.FLOW2PRINT_DATA_DIR = dataDir;

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
  await access(join(dataDir, "artifacts", launch.projectId, finalized.version.id, "preview.png"));
  await access(join(dataDir, "artifacts", launch.projectId, finalized.version.id, "production.pdf"));
  await access(join(dataDir, "artifacts", launch.projectId, finalized.version.id, "proof.pdf"));
  assert.equal(quoteLink?.state, "quote_linked");
  assert.equal(orderLink?.state, "order_linked");
  assert.equal(persistedLink?.externalOrderRef, "order-1000");

  execFileSync("psql", [baseDatabaseUrl, "-c", `DROP SCHEMA IF EXISTS "${schema}" CASCADE`], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  delete process.env.DATABASE_URL;
  delete process.env.FLOW2PRINT_DATA_DIR;
});
