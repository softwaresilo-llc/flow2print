import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { spawn } from "node:child_process";

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
  const tempDir = await mkdtemp(join(tmpdir(), "flow2print-edge-"));
  const port = "3020";
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("node", ["dist/main.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      FLOW2PRINT_STATE_FILE: join(tempDir, "state.json"),
      FLOW2PRINT_DATA_DIR: join(tempDir, "runtime")
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
    await rm(tempDir, { recursive: true, force: true });
  }
});
