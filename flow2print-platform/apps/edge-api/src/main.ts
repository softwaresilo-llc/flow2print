import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { readFile } from "node:fs/promises";

import { readBaseServiceConfig, readPublicAppConfig } from "@flow2print/config";
import { validateFlow2PrintDocument } from "@flow2print/design-document";
import type { ApiTokenScope } from "@flow2print/domain";
import {
  applyTemplateRequestSchema,
  finalizeProjectRequestSchema,
  launchSessionRequestSchema
} from "@flow2print/http-sdk";
import { createLogger } from "@flow2print/logging";
import { getRuntimeStore } from "@flow2print/runtime-store";

const { PORT, SERVICE_NAME } = readBaseServiceConfig({
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? "edge-api",
  PORT: process.env.PORT ?? "3000"
});
const { DESIGNER_APP_URL } = readPublicAppConfig(process.env);

const logger = createLogger(SERVICE_NAME);
const app = Fastify({ loggerInstance: logger });
const store = getRuntimeStore();
const getBearerToken = (authorizationHeader?: string) => authorizationHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;
const scopeIncludes = (ownedScopes: string[], requiredScopes: string[]) => requiredScopes.some((scope) => ownedScopes.includes(scope));

const readAuthContext = async (authorizationHeader?: string) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  const session = await store.getUserBySessionToken(token);
  if (session) {
    return {
      kind: "session" as const,
      session
    };
  }

  const apiToken = await store.getApiTokenBySecret(token);
  if (apiToken) {
    return {
      kind: "api-token" as const,
      apiToken
    };
  }

  return null;
};

const requireSessionRole = async (
  request: FastifyRequest,
  reply: FastifyReply,
  roles: Array<"admin" | "manager" | "customer">,
  forbiddenCode = "auth_required"
) => {
  const auth = await readAuthContext(request.headers.authorization);
  if (!auth) {
    return reply.status(401).send({ code: "auth_required" });
  }
  if (auth.kind !== "session" || !roles.includes(auth.session.user.role)) {
    return reply.status(403).send({ code: forbiddenCode });
  }
  return auth.session;
};

const requireSessionOrApiScope = async (
  request: FastifyRequest,
  reply: FastifyReply,
  options: {
    roles?: Array<"admin" | "manager" | "customer">;
    scopes?: string[];
    forbiddenCode?: string;
  }
) => {
  const auth = await readAuthContext(request.headers.authorization);
  if (!auth) {
    return reply.status(401).send({ code: "auth_required" });
  }

  if (auth.kind === "session") {
    if (!options.roles || options.roles.includes(auth.session.user.role)) {
      return auth;
    }
  }

  if (auth.kind === "api-token") {
    if (!options.scopes || scopeIncludes(auth.apiToken.scopes, options.scopes)) {
      return auth;
    }
  }

  return reply.status(403).send({ code: options.forbiddenCode ?? "access_denied" });
};

await app.register(cors, { origin: true });

app.get("/healthz", async () => ({
  ok: true,
  service: SERVICE_NAME
}));

app.post("/v1/auth/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return reply.status(400).send({ code: "email_and_password_required" });
  }
  const result = await store.createAuthSession(body.email, body.password);
  if (!result) {
    return reply.status(401).send({ code: "invalid_credentials" });
  }
  return reply.send(result);
});

app.get("/v1/auth/session", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ code: "auth_required" });
  }
  const result = await store.getUserBySessionToken(token);
  if (!result) {
    return reply.status(401).send({ code: "session_not_found" });
  }
  return reply.send(result);
});

app.post("/v1/auth/logout", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ code: "auth_required" });
  }
  await store.revokeSession(token);
  return reply.send({ ok: true });
});

app.post("/v1/auth/forgot-password", async (request, reply) => {
  const body = request.body as { email?: string };
  if (!body.email) {
    return reply.status(400).send({ code: "email_required" });
  }
  const result = await store.createPasswordReset(body.email);
  return reply.send({
    ok: true,
    resetRequested: Boolean(result),
    token: result?.reset.token ?? null
  });
});

app.post("/v1/auth/reset-password", async (request, reply) => {
  const body = request.body as { token?: string; password?: string };
  if (!body.token || !body.password) {
    return reply.status(400).send({ code: "token_and_password_required" });
  }
  const result = await store.resetPassword(body.token, body.password);
  if (!result) {
    return reply.status(404).send({ code: "reset_token_not_found" });
  }
  return reply.send({ ok: true });
});

app.patch("/v1/auth/profile", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session) {
    return reply.status(401).send({ code: "auth_required" });
  }
  const body = request.body as { email?: string; displayName?: string };
  const updated = await store.updateOwnProfile(session.user.id, body);
  if (!updated) {
    return reply.status(404).send({ code: "user_not_found" });
  }
  if ("conflict" in updated) {
    return reply.status(409).send({ code: "email_already_exists" });
  }
  return reply.send(updated);
});

app.post("/v1/auth/change-password", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session) {
    return reply.status(401).send({ code: "auth_required" });
  }
  const body = request.body as { currentPassword?: string; nextPassword?: string };
  if (!body.currentPassword || !body.nextPassword) {
    return reply.status(400).send({ code: "current_and_next_password_required" });
  }
  const changed = await store.changeOwnPassword(session.user.id, body.currentPassword, body.nextPassword);
  if (!changed) {
    return reply.status(400).send({ code: "current_password_invalid" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/users", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  return reply.send({ docs: await store.listUsers() });
});

app.post("/v1/users", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as { email?: string; displayName?: string; password?: string; role?: "admin" | "manager" | "customer" };
  if (!body.email || !body.displayName || !body.password) {
    return reply.status(400).send({ code: "email_display_name_and_password_required" });
  }
  const user = await store.createUser({
    email: body.email,
    displayName: body.displayName,
    password: body.password,
    role: body.role
  });
  if (!user) {
    return reply.status(409).send({ code: "user_already_exists" });
  }
  return reply.status(201).send(user);
});

app.patch("/v1/users/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    email?: string;
    displayName?: string;
    password?: string;
    role?: "admin" | "manager" | "customer";
    status?: "active" | "disabled";
  };
  const user = await store.updateUser(String((request.params as { id: string }).id), body);
  if (!user) {
    return reply.status(404).send({ code: "user_not_found" });
  }
  if ("conflict" in user) {
    return reply.status(409).send({ code: "email_already_exists" });
  }
  return reply.send(user);
});

app.delete("/v1/users/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const deleted = await store.deleteUser(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "user_not_found" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/api-tokens", async (request, reply) => {
  const session = await requireSessionRole(request, reply, ["admin"], "admin_required");
  if (!session || "statusCode" in session) {
    return;
  }
  return reply.send({ docs: await store.listApiTokens() });
});

app.post("/v1/api-tokens", async (request, reply) => {
  const session = await requireSessionRole(request, reply, ["admin"], "admin_required");
  if (!session || "statusCode" in session) {
    return;
  }
  const body = request.body as {
    label?: string;
    scopes?: ApiTokenScope[];
    expiresAt?: string | null;
  };
  if (!body.label || !Array.isArray(body.scopes) || !body.scopes.length) {
    return reply.status(400).send({ code: "label_and_scopes_required" });
  }
  const created = await store.createApiToken({
    label: body.label,
    scopes: body.scopes,
    expiresAt: body.expiresAt ?? null,
    createdByUserId: session.user.id
  });
  return reply.status(201).send({
    ...created.record,
    token: created.token
  });
});

app.patch("/v1/api-tokens/:id", async (request, reply) => {
  const session = await requireSessionRole(request, reply, ["admin"], "admin_required");
  if (!session || "statusCode" in session) {
    return;
  }
  const body = request.body as {
    label?: string;
    scopes?: ApiTokenScope[];
    expiresAt?: string | null;
    status?: "active" | "revoked";
  };
  const token = await store.updateApiToken(String((request.params as { id: string }).id), body);
  if (!token) {
    return reply.status(404).send({ code: "api_token_not_found" });
  }
  return reply.send(token);
});

app.delete("/v1/api-tokens/:id", async (request, reply) => {
  const session = await requireSessionRole(request, reply, ["admin"], "admin_required");
  if (!session || "statusCode" in session) {
    return;
  }
  const deleted = await store.deleteApiToken(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "api_token_not_found" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/mail-log", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin"],
    scopes: ["mail:read", "admin:read"],
    forbiddenCode: "admin_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  return reply.send({ docs: await store.listMailLog() });
});

app.get("/v1/email-templates", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  return reply.send({ docs: await store.listEmailTemplates() });
});

app.post("/v1/email-templates", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    label?: string;
    kind?: "password_reset";
    subject?: string;
    bodyHtml?: string;
    previewText?: string;
  };
  if (!body.label || !body.kind || !body.subject || !body.bodyHtml || !body.previewText) {
    return reply.status(400).send({ code: "label_kind_subject_body_and_preview_required" });
  }
  return reply.status(201).send(
    await store.createEmailTemplate({
      label: body.label,
      kind: body.kind,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      previewText: body.previewText
    })
  );
});

app.patch("/v1/email-templates/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    label?: string;
    kind?: "password_reset";
    subject?: string;
    bodyHtml?: string;
    previewText?: string;
  };
  const template = await store.updateEmailTemplate(String((request.params as { id: string }).id), body);
  if (!template) {
    return reply.status(404).send({ code: "email_template_not_found" });
  }
  return reply.send(template);
});

app.delete("/v1/email-templates/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const deleted = await store.deleteEmailTemplate(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "email_template_not_found" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/email-templates/:id/preview", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const preview = await store.getEmailPreview(String((request.params as { id: string }).id));
  if (!preview) {
    return reply.status(404).send({ code: "email_template_not_found" });
  }
  return reply.send(preview);
});

app.post("/v1/email-templates/preview", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    subject?: string;
    bodyHtml?: string;
    previewText?: string;
    settings?: {
      brandName?: string;
      companyName?: string;
      companyAddress?: string;
      supportEmail?: string;
      mailFromName?: string;
      mailFromAddress?: string;
      primaryColor?: string;
      logoText?: string;
      portalAppUrl?: string;
      designerAppUrl?: string;
      adminAppUrl?: string;
      commerceBaseUrl?: string;
      defaultLocale?: string;
      defaultTimezone?: string;
      mailHeaderHtml?: string;
      mailFooterHtml?: string;
    };
    variables?: {
      recipientEmail?: string;
      resetToken?: string;
    };
  };
  if (!body.subject || !body.bodyHtml || !body.previewText) {
    return reply.status(400).send({ code: "subject_body_and_preview_required" });
  }
  const preview = await store.previewEmailTemplate({
    template: {
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      previewText: body.previewText
    },
    settings: body.settings,
    recipientEmail: body.variables?.recipientEmail,
    resetToken: body.variables?.resetToken
  });
  return reply.send(preview);
});

app.get("/v1/settings", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin"],
    scopes: ["settings:read", "admin:read"],
    forbiddenCode: "admin_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  return reply.send(await store.getSystemSettings());
});

app.patch("/v1/settings", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin"],
    scopes: ["settings:write", "admin:write"],
    forbiddenCode: "admin_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const body = request.body as {
    brandName?: string;
    companyName?: string;
    companyAddress?: string;
    supportEmail?: string;
    mailFromName?: string;
    mailFromAddress?: string;
    primaryColor?: string;
    logoText?: string;
    portalAppUrl?: string;
    designerAppUrl?: string;
    adminAppUrl?: string;
    commerceBaseUrl?: string;
    defaultLocale?: string;
    defaultTimezone?: string;
    mailHeaderHtml?: string;
    mailFooterHtml?: string;
  };
  return reply.send(await store.updateSystemSettings(body));
});

app.get("/artifacts/*", async (request, reply) => {
  const suffix = String((request.params as { "*": string })["*"] ?? "");
  const href = `/artifacts/${suffix}`;
  const resolved = await store.getArtifactByHref(href);
  if (!resolved) {
    return reply.status(404).send({ code: "artifact_not_found" });
  }

  const content = await readFile(resolved.filePath);
  const contentType =
    resolved.artifact.artifactType === "preview_png" ? "image/png" : "application/pdf";
  reply.header("Content-Type", contentType);
  return reply.send(content);
});

app.post("/v1/launch-sessions", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:write", "projects:write"],
    forbiddenCode: "launch_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const parsed = launchSessionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ code: "invalid_launch_request", issues: parsed.error.issues });
  }

  const launchSession = await store.createLaunchSession(parsed.data);

  return reply.send({
    launchSessionId: launchSession.id,
    projectId: launchSession.projectId,
    designerUrl: DESIGNER_APP_URL
      ? `${DESIGNER_APP_URL}/designer/launch/${launchSession.id}`
      : `/designer/launch/${launchSession.id}`,
    expiresAt: launchSession.expiresAt
  });
});

app.get("/v1/launch-sessions/:id", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:read", "projects:read"],
    forbiddenCode: "launch_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const session = await store.getLaunchSession(String((request.params as { id: string }).id));
  if (!session) {
    return reply.status(404).send({ code: "launch_session_not_found" });
  }
  return reply.send(session);
});

app.get("/v1/blueprints", async () => ({
  docs: await store.getBlueprints()
}));

app.post("/v1/blueprints", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as { displayName?: string; kind?: "flat" | "apparel" | "packaging" };
  if (!body.displayName || !body.kind) {
    return reply.status(400).send({ code: "display_name_and_kind_required" });
  }
  return reply.status(201).send(
    await store.createBlueprint({
      displayName: body.displayName,
      kind: body.kind
    })
  );
});

app.patch("/v1/blueprints/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as { displayName?: string; kind?: "flat" | "apparel" | "packaging" };
  const blueprint = await store.updateBlueprint(String((request.params as { id: string }).id), body);
  if (!blueprint) {
    return reply.status(404).send({ code: "blueprint_not_found" });
  }
  return reply.send(blueprint);
});

app.delete("/v1/blueprints/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const deleted = await store.deleteBlueprint(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "blueprint_not_found" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/templates", async (request) => {
  const query = request.query as { blueprintId?: string };
  const templates = await store.getTemplates();
  return {
    docs: query.blueprintId ? templates.filter((template) => template.blueprintId === query.blueprintId) : templates
  };
});

app.post("/v1/templates", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    displayName?: string;
    description?: string;
    blueprintId?: string;
    status?: "published" | "draft";
  };
  if (!body.displayName || !body.description || !body.blueprintId) {
    return reply.status(400).send({ code: "display_name_description_and_blueprint_required" });
  }
  return reply.status(201).send(
    await store.createTemplate({
      displayName: body.displayName,
      description: body.description,
      blueprintId: body.blueprintId,
      status: body.status
    })
  );
});

app.patch("/v1/templates/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    displayName?: string;
    description?: string;
    blueprintId?: string;
    status?: "published" | "draft";
  };
  const template = await store.updateTemplate(String((request.params as { id: string }).id), body);
  if (!template) {
    return reply.status(404).send({ code: "template_not_found" });
  }
  return reply.send(template);
});

app.delete("/v1/templates/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const deleted = await store.deleteTemplate(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "template_not_found" });
  }
  return reply.send({ ok: true });
});

app.get("/v1/projects", async () => {
  const projects = await store.listProjects();
  const docs = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      artifactCount: (await store.getProjectArtifacts(project.id)).length,
      preflightStatus: (await store.getLatestPreflightReport(project.id))?.status ?? null
    }))
  );
  return { docs };
});

app.post("/v1/projects", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || (session.user.role !== "admin" && session.user.role !== "manager")) {
    return reply.status(403).send({ code: "admin_or_manager_required" });
  }

  const body = request.body as {
    title?: string;
    blueprintId?: string;
    templateId?: string | null;
  };

  if (!body.title || !body.blueprintId) {
    return reply.status(400).send({ code: "title_and_blueprint_required" });
  }

  const project = await store.createProject({
    title: body.title,
    blueprintId: body.blueprintId,
    templateId: body.templateId
  });

  if (!project) {
    return reply.status(404).send({ code: "blueprint_not_found" });
  }

  return reply.status(201).send(project);
});

app.get("/v1/projects/:id", async (request, reply) => {
  const project = await store.getProject(String((request.params as { id: string }).id));
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  const artifacts = await store.getProjectArtifacts(project.project.id);
  const preflightReport = await store.getLatestPreflightReport(project.project.id);
  const commerceLink = await store.getCommerceLinkByProject(project.project.id);
  return reply.send({
    ...project.project,
    document: project.version.document,
    version: project.version,
    artifacts,
    preflightReport,
    commerceLink
  });
});

app.patch("/v1/projects/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session) {
    return reply.status(401).send({ code: "auth_required" });
  }
  const body = request.body as { title?: string; status?: "draft" | "finalized" | "ordered" | "archived" };
  const project = await store.updateProject(String((request.params as { id: string }).id), body);
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send(project);
});

app.delete("/v1/projects/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session) {
    return reply.status(401).send({ code: "auth_required" });
  }
  const deleted = await store.deleteProject(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send({ ok: true });
});

app.post("/v1/projects/:id/autosave", async (request, reply) => {
  const body = request.body as { document?: unknown };
  const project = await store.getProject(String((request.params as { id: string }).id));
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  if (!body.document) {
    return reply.status(400).send({ code: "document_required" });
  }
  const parsed = validateFlow2PrintDocument(body.document);
  if (!parsed.success) {
    return reply.status(400).send({ code: "invalid_document", issues: parsed.error.issues });
  }
  const saved = await store.autosaveProject(project.project.id, parsed.data);
  if (!saved) {
    return reply.status(409).send({ code: "autosave_not_allowed" });
  }
  return reply.send({ ok: true, versionId: saved.id, updatedAt: project.project.updatedAt });
});

app.post("/v1/projects/:id/apply-template", async (request, reply) => {
  const parsed = applyTemplateRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ code: "invalid_apply_template_request", issues: parsed.error.issues });
  }

  const updated = await store.applyTemplateToProject(String((request.params as { id: string }).id), parsed.data);
  if (!updated) {
    return reply.status(404).send({ code: "project_not_found_or_not_editable" });
  }

  const artifacts = await store.getProjectArtifacts(updated.project.id);
  const preflightReport = await store.getLatestPreflightReport(updated.project.id);
  const commerceLink = await store.getCommerceLinkByProject(updated.project.id);

  return reply.send({
    ...updated.project,
    document: updated.version.document,
    version: updated.version,
    artifacts,
    preflightReport,
    commerceLink
  });
});

app.post("/v1/projects/:id/finalize", async (request, reply) => {
  const parsed = finalizeProjectRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ code: "invalid_finalize_request", issues: parsed.error.issues });
  }

  const finalized = await store.finalizeProjectById(String((request.params as { id: string }).id), parsed.data);
  if (!finalized) {
    return reply.status(404).send({ code: "project_not_found" });
  }

  return reply.send({
    projectId: finalized.project.id,
    finalVersionId: finalized.version.id,
    state: "finalized",
    approvalState: finalized.project.approvalState,
    jobs: finalized.project.latestJobs,
    artifacts: finalized.artifacts,
    preflightReport: finalized.report
  });
});

app.get("/v1/projects/:id/artifacts", async (request, reply) => {
  const projectId = String((request.params as { id: string }).id);
  const project = await store.getProject(projectId);
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send({
    docs: await store.getProjectArtifacts(projectId)
  });
});

app.get("/v1/projects/:id/preflight", async (request, reply) => {
  const projectId = String((request.params as { id: string }).id);
  const project = await store.getProject(projectId);
  if (!project) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  const report = await store.getLatestPreflightReport(projectId);
  if (!report) {
    return reply.status(404).send({ code: "preflight_report_not_found" });
  }
  return reply.send(report);
});

app.get("/v1/assets", async () => ({
  docs: await store.listAssets()
}));

app.post("/v1/assets", async (request, reply) => {
  const body = request.body as {
    filename?: string;
    kind?: "image" | "svg" | "pdf" | "font" | "technical";
    mimeType?: string;
    widthPx?: number | null;
    heightPx?: number | null;
  };
  if (!body.filename) {
    return reply.status(400).send({ code: "filename_required" });
  }
  const asset = await store.createAsset({
    filename: body.filename,
    kind: body.kind,
    mimeType: body.mimeType,
    widthPx: body.widthPx,
    heightPx: body.heightPx
  });
  return reply.status(201).send(asset);
});

app.patch("/v1/assets/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const body = request.body as {
    filename?: string;
    kind?: "image" | "svg" | "pdf" | "font" | "technical";
    mimeType?: string;
    widthPx?: number | null;
    heightPx?: number | null;
  };
  const asset = await store.updateAsset(String((request.params as { id: string }).id), body);
  if (!asset) {
    return reply.status(404).send({ code: "asset_not_found" });
  }
  return reply.send(asset);
});

app.delete("/v1/assets/:id", async (request, reply) => {
  const token = getBearerToken(request.headers.authorization);
  const session = token ? await store.getUserBySessionToken(token) : null;
  if (!session || session.user.role !== "admin") {
    return reply.status(403).send({ code: "admin_required" });
  }
  const deleted = await store.deleteAsset(String((request.params as { id: string }).id));
  if (!deleted) {
    return reply.status(404).send({ code: "asset_not_found" });
  }
  return reply.send({ ok: true });
});

app.post("/v1/connectors/magento2/reorders", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:write", "projects:write"],
    forbiddenCode: "commerce_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const body = request.body as { projectId?: string };
  if (!body.projectId) {
    return reply.status(400).send({ code: "project_id_required" });
  }
  const cloned = await store.cloneProjectForReorder(body.projectId);
  if (!cloned) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send({ projectId: cloned.id, state: cloned.status });
});

app.post("/v1/connectors/magento2/quote-links", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:write"],
    forbiddenCode: "commerce_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const body = request.body as {
    projectId?: string;
    externalQuoteRef?: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  };
  if (!body.projectId || !body.externalQuoteRef) {
    return reply.status(400).send({ code: "project_id_and_external_quote_ref_required" });
  }
  const link = await store.createQuoteLink({
    projectId: body.projectId,
    externalQuoteRef: body.externalQuoteRef,
    externalStoreId: body.externalStoreId,
    externalProductRef: body.externalProductRef,
    externalCustomerRef: body.externalCustomerRef,
    returnUrl: body.returnUrl
  });
  if (!link) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.status(201).send(link);
});

app.post("/v1/connectors/magento2/order-links", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:write"],
    forbiddenCode: "commerce_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const body = request.body as {
    projectId?: string;
    externalOrderRef?: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  };
  if (!body.projectId || !body.externalOrderRef) {
    return reply.status(400).send({ code: "project_id_and_external_order_ref_required" });
  }
  const link = await store.createOrderLink({
    projectId: body.projectId,
    externalOrderRef: body.externalOrderRef,
    externalStoreId: body.externalStoreId,
    externalProductRef: body.externalProductRef,
    externalCustomerRef: body.externalCustomerRef,
    returnUrl: body.returnUrl
  });
  if (!link) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.status(201).send(link);
});

app.get("/v1/connectors/magento2/projects/:projectId/status", async (request, reply) => {
  const auth = await requireSessionOrApiScope(request, reply, {
    roles: ["admin", "manager"],
    scopes: ["commerce:read", "projects:read"],
    forbiddenCode: "commerce_access_required"
  });
  if (!auth || "statusCode" in auth) {
    return;
  }
  const status = await store.getCommerceStatus(String((request.params as { projectId: string }).projectId));
  if (!status) {
    return reply.status(404).send({ code: "project_not_found" });
  }
  return reply.send(status);
});

await app.listen({ port: PORT, host: "0.0.0.0" });
