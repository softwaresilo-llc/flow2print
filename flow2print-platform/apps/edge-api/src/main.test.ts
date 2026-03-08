import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const waitForHealthy = async (baseUrl: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the service is ready.
    }
    await delay(150);
  }

  throw new Error(`edge-api did not become healthy at ${baseUrl}`);
};

test("edge-api serves finalize flow, commerce status, and artifact downloads", async () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const schema = `edge_${randomUUID().replace(/-/g, "")}`;
  const baseDatabaseUrl =
    process.env.DATABASE_URL ??
    process.env.FLOW2PRINT_POSTGRES_URL ??
    "postgresql://flow2print:flow2print@127.0.0.1:55433/flow2print";
  const databaseUrl = `${baseDatabaseUrl}${baseDatabaseUrl.includes("?") ? "&" : "?"}schema=${schema}`;
  const dataDir = resolve(repoRoot, `.flow2print-runtime-test-${schema}`);
  const port = "3020";
  const baseUrl = `http://127.0.0.1:${port}`;

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

  const server = spawn("node", ["dist/main.nest.js"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      PORT: port,
      DATABASE_URL: databaseUrl,
      FLOW2PRINT_DATA_DIR: dataDir
    },
    stdio: "ignore"
  });

  try {
    await waitForHealthy(baseUrl);

    const auth = await fetch(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "demo@flow2print.local",
        password: "demo1234"
      })
    }).then((response) =>
      response.json() as Promise<{
        session: {
          token: string;
        };
      }>
    );

    const launch = await fetch(`${baseUrl}/v1/launch-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({
        connectorType: "magento2",
        externalStoreId: "default",
        externalProductRef: "SKU-BUSINESS-CARD",
        customer: {
          email: "edge@example.com",
          isGuest: false
        },
        locale: "en-US",
        currency: "USD",
        returnUrl: "http://localhost/return",
        options: {}
      })
    }).then((response) => response.json() as Promise<{ projectId: string }>);

    const project = await fetch(`${baseUrl}/v1/projects/${launch.projectId}`, {
      headers: {
        Authorization: `Bearer ${auth.session.token}`
      }
    }).then((response) =>
      response.json() as Promise<{
        document: {
          surfaces: Array<{
            layers: Array<unknown>;
          }>;
        };
      }>
    );

    const updatedDocument = {
      ...project.document,
      surfaces: project.document.surfaces.map((surface, index) =>
        index === 0
          ? {
              ...surface,
              layers: [
                ...surface.layers,
                {
                  id: "lyr_api_test",
                  type: "text",
                  name: "API test layer",
                  visible: true,
                  locked: false,
                  x: 10,
                  y: 10,
                  width: 40,
                  height: 12,
                  rotation: 0,
                  opacity: 1,
                  metadata: { text: "API test" }
                }
              ]
            }
          : surface
      )
    };

    await fetch(`${baseUrl}/v1/projects/${launch.projectId}/autosave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({ document: updatedDocument })
    });

    const finalized = await fetch(`${baseUrl}/v1/projects/${launch.projectId}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({
        approvalIntent: "auto",
        proofMode: "digital"
      })
    }).then((response) =>
      response.json() as Promise<{
        artifacts: Array<{ href: string }>;
        preflightReport: { status: string };
      }>
    );

    await fetch(`${baseUrl}/v1/connectors/magento2/order-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.session.token}`
      },
      body: JSON.stringify({
        projectId: launch.projectId,
        externalOrderRef: "order-edge-test",
        externalStoreId: "default",
        externalProductRef: "SKU-BUSINESS-CARD"
      })
    });

    const status = await fetch(`${baseUrl}/v1/connectors/magento2/projects/${launch.projectId}/status`, {
      headers: {
        Authorization: `Bearer ${auth.session.token}`
      }
    }).then(
      (response) =>
        response.json() as Promise<{
          status: string;
          projectVersionId: string;
          preflightStatus: string;
          artifacts: Array<{ href: string }>;
        }>
    );

    const previewResponse = await fetch(`${baseUrl}${finalized.artifacts[0]?.href ?? ""}`);
    const productionResponse = await fetch(`${baseUrl}${finalized.artifacts[1]?.href ?? ""}`);

    assert.equal(finalized.preflightReport.status, "pass");
    assert.equal(status.status, "ordered");
    assert.equal(status.preflightStatus, "pass");
    assert.ok(status.projectVersionId.length > 0);
    assert.equal(status.artifacts.length, 3);
    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.headers.get("content-type"), "image/png");
    assert.equal(productionResponse.status, 200);
    assert.equal(productionResponse.headers.get("content-type"), "application/pdf");
    assert.ok((await previewResponse.arrayBuffer()).byteLength > 0);
    assert.ok((await productionResponse.arrayBuffer()).byteLength > 0);
  } finally {
    server.kill("SIGTERM");
    execFileSync("psql", [baseDatabaseUrl, "-c", `DROP SCHEMA IF EXISTS "${schema}" CASCADE`], {
      cwd: repoRoot,
      stdio: "ignore"
    });
  }
});
