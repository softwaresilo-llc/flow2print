import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

import { getDatabaseRuntimeStore, isPostgresPersistenceEnabled } from "@flow2print/database";
import type { Flow2PrintDocument } from "@flow2print/design-document";
import {
  applyTemplateToProject as applyTemplatePreset,
  type AuthSessionRecord,
  type ApiTokenRecord,
  cloneFinalizedProject,
  type CommerceLinkRecord,
  createAssetRecord,
  createEmptyState,
  type EmailTemplateRecord,
  type MailLogRecord,
  type PasswordResetRecord,
  createPreflightReport,
  createProductionArtifacts,
  createProjectAggregate,
  finalizeProject,
  type AssetRecord,
  type CommerceProjectStatus,
  type Flow2PrintState,
  hashPassword,
  type LaunchSession,
  type OutputArtifact,
  type PreflightReport,
  type ProjectRecord,
  type ProjectVersionRecord,
  type RoleDefinitionRecord,
  seedUsers,
  type SystemSettingsRecord,
  type UserRecord,
  verifyPassword
} from "@flow2print/domain";
import type { ApplyTemplateRequest, FinalizeProjectRequest, LaunchSessionRequest } from "@flow2print/http-sdk";

const stateFile = resolve(process.cwd(), process.env.FLOW2PRINT_STATE_FILE ?? ".flow2print-state.json");
const dataDir = resolve(dirname(stateFile), process.env.FLOW2PRINT_DATA_DIR ?? ".flow2print-runtime");
const artifactsRootDir = resolve(dataDir, "artifacts");
const previewPixelBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9oNcamcAAAAASUVORK5CYII=";

const createPdfBuffer = (title: string, lines: string[]) => {
  const escapedTitle = title.replace(/[()\\]/g, "\\$&");
  const text = [escapedTitle, ...lines].join(" | ").replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const length = Buffer.byteLength(stream, "utf8");

  return Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${length} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000334 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
404
%%EOF`,
    "utf8"
  );
};

const artifactFilePathForHref = (href: string) => resolve(dataDir, href.replace(/^\//, ""));
const hashApiTokenSecret = (token: string) => createHash("sha256").update(token).digest("hex");

const hydrateState = (input: Partial<Flow2PrintState>): Flow2PrintState => {
  const defaults = createEmptyState();

  return {
    ...defaults,
    ...input,
    blueprints: defaults.blueprints,
    templates: defaults.templates,
    roles: input.roles?.length ? input.roles : defaults.roles,
    emailTemplates: input.emailTemplates?.length
      ? input.emailTemplates.map((template) => ({
          ...template,
          wrapperHeaderHtml:
            template.wrapperHeaderHtml ??
            ((input.systemSettings as Record<string, unknown> | undefined)?.mailHeaderHtml as string | undefined) ??
            defaults.emailTemplates[0]?.wrapperHeaderHtml ??
            "",
          wrapperFooterHtml:
            template.wrapperFooterHtml ??
            ((input.systemSettings as Record<string, unknown> | undefined)?.mailFooterHtml as string | undefined) ??
            defaults.emailTemplates[0]?.wrapperFooterHtml ??
            ""
        }))
      : defaults.emailTemplates,
    systemSettings: {
      ...defaults.systemSettings,
      ...input.systemSettings
    },
    users: input.users?.length ? input.users : seedUsers(),
    apiTokens: input.apiTokens ?? [],
    authSessions: input.authSessions ?? [],
    passwordResets: input.passwordResets ?? [],
    mailLog: input.mailLog ?? [],
    launchSessions: input.launchSessions ?? [],
    commerceLinks: input.commerceLinks ?? [],
    projects: input.projects ?? [],
    projectVersions: input.projectVersions ?? [],
    assets: input.assets ?? [],
    outputArtifacts: input.outputArtifacts ?? [],
    preflightReports: input.preflightReports ?? []
  };
};

const ensureArtifactFiles = async (artifacts: OutputArtifact[], report: PreflightReport) => {
  for (const artifact of artifacts) {
    const filePath = artifactFilePathForHref(artifact.href);
    await mkdir(dirname(filePath), { recursive: true });

    if (artifact.artifactType === "preview_png") {
      await writeFile(filePath, Buffer.from(previewPixelBase64, "base64"));
      continue;
    }

    const label = artifact.artifactType === "proof_pdf" ? "Proof PDF" : "Production PDF";
    await writeFile(
      filePath,
      createPdfBuffer("Flow2Print", [
        label,
        `Project ${artifact.projectId}`,
        `Version ${artifact.projectVersionId}`,
        `Preflight ${report.status.toUpperCase()}`
      ])
    );
  }
};

class RuntimeStore {
  private loaded = false;
  private state: Flow2PrintState = createEmptyState();

  private async ensureLoaded() {
    if (this.loaded) {
      return;
    }
    try {
      const raw = await readFile(stateFile, "utf8");
      this.state = hydrateState(JSON.parse(raw) as Partial<Flow2PrintState>);
      await this.persist();
    } catch {
      this.state = createEmptyState();
      await this.persist();
    }
    this.loaded = true;
  }

  private async persist() {
    await mkdir(dirname(stateFile), { recursive: true });
    await writeFile(stateFile, JSON.stringify(this.state, null, 2));
  }

  async getBlueprints() {
    await this.ensureLoaded();
    return this.state.blueprints;
  }

  async getTemplates() {
    await this.ensureLoaded();
    return this.state.templates;
  }

  async listEmailTemplates() {
    await this.ensureLoaded();
    return this.state.emailTemplates;
  }

  async getApiToken(id: string) {
    await this.ensureLoaded();
    return this.state.apiTokens.find((entry) => entry.id === id) ?? null;
  }

  async getEmailTemplate(id: string) {
    await this.ensureLoaded();
    return this.state.emailTemplates.find((entry) => entry.id === id) ?? null;
  }

  async listRoles() {
    await this.ensureLoaded();
    return this.state.roles;
  }

  async getRole(id: string) {
    await this.ensureLoaded();
    return this.state.roles.find((entry) => entry.id === id) ?? null;
  }

  async updateRole(
    id: string,
    input: Partial<Pick<RoleDefinitionRecord, "label" | "description" | "permissions">>
  ) {
    await this.ensureLoaded();
    const current = this.state.roles.find((entry) => entry.id === id);
    if (!current) {
      return null;
    }
    const updated: RoleDefinitionRecord = {
      ...current,
      label: input.label?.trim() ? input.label.trim() : current.label,
      description: input.description?.trim() ? input.description.trim() : current.description,
      permissions: input.permissions ?? current.permissions,
      updatedAt: new Date().toISOString()
    };
    this.state.roles = this.state.roles.map((entry) => (entry.id === id ? updated : entry));
    await this.persist();
    return updated;
  }

  async createEmailTemplate(input: {
    label: string;
    kind: EmailTemplateRecord["kind"];
    subject: string;
    bodyHtml: string;
    previewText: string;
    wrapperHeaderHtml: string;
    wrapperFooterHtml: string;
  }) {
    await this.ensureLoaded();
    const template: EmailTemplateRecord = {
      id: `emt_${randomUUID()}`,
      label: input.label,
      kind: input.kind,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      previewText: input.previewText,
      wrapperHeaderHtml: input.wrapperHeaderHtml,
      wrapperFooterHtml: input.wrapperFooterHtml,
      updatedAt: new Date().toISOString()
    };
    this.state.emailTemplates.unshift(template);
    await this.persist();
    return template;
  }

  async updateEmailTemplate(
    id: string,
    input: Partial<
      Pick<EmailTemplateRecord, "label" | "kind" | "subject" | "bodyHtml" | "previewText" | "wrapperHeaderHtml" | "wrapperFooterHtml">
    >
  ) {
    await this.ensureLoaded();
    const current = this.state.emailTemplates.find((entry) => entry.id === id);
    if (!current) {
      return null;
    }
    const updated: EmailTemplateRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.state.emailTemplates = this.state.emailTemplates.map((entry) => (entry.id === id ? updated : entry));
    await this.persist();
    return updated;
  }

  async deleteEmailTemplate(id: string) {
    await this.ensureLoaded();
    const exists = this.state.emailTemplates.some((entry) => entry.id === id);
    if (!exists) {
      return false;
    }
    this.state.emailTemplates = this.state.emailTemplates.filter((entry) => entry.id !== id);
    await this.persist();
    return true;
  }

  async getSystemSettings() {
    await this.ensureLoaded();
    return this.state.systemSettings;
  }

  async updateSystemSettings(input: Partial<SystemSettingsRecord>) {
    await this.ensureLoaded();
    this.state.systemSettings = {
      ...this.state.systemSettings,
      ...input,
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.state.systemSettings;
  }

  async getEmailPreview(id: string, params?: { recipientEmail?: string; resetToken?: string }) {
    await this.ensureLoaded();
    const template = this.state.emailTemplates.find((entry) => entry.id === id);
    if (!template) {
      return null;
    }

    return this.previewEmailTemplate({
      template,
      recipientEmail: params?.recipientEmail,
      resetToken: params?.resetToken
    });
  }

  async previewEmailTemplate(input: {
    template?: Pick<
      EmailTemplateRecord,
      "subject" | "bodyHtml" | "previewText" | "wrapperHeaderHtml" | "wrapperFooterHtml"
    > | null;
    settings?: Partial<SystemSettingsRecord>;
    recipientEmail?: string;
    resetToken?: string;
  }) {
    await this.ensureLoaded();
    const template = input.template;
    if (!template) {
      return null;
    }

    const settings = {
      ...this.state.systemSettings,
      ...input.settings
    };
    const recipientEmail = input.recipientEmail ?? "customer@example.com";
    const resetToken = input.resetToken ?? "reset_demo_token";
    const replacements: Record<string, string> = {
      brandName: settings.brandName,
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      supportEmail: settings.supportEmail,
      mailFromName: settings.mailFromName,
      mailFromAddress: settings.mailFromAddress,
      logoText: settings.logoText,
      primaryColor: settings.primaryColor,
      portalAppUrl: settings.portalAppUrl,
      designerAppUrl: settings.designerAppUrl,
      adminAppUrl: settings.adminAppUrl,
      commerceBaseUrl: settings.commerceBaseUrl,
      defaultLocale: settings.defaultLocale,
      defaultTimezone: settings.defaultTimezone,
      recipientEmail,
      resetToken
    };

    const render = (value: string) =>
      value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? "");

    return {
      subject: render(template.subject),
      html: `<!doctype html><html><body style="margin:0;background:#f3f5f8;"><div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #d8e0ea;border-radius:16px;overflow:hidden;">${render(template.wrapperHeaderHtml)}<div style="padding:24px 24px 8px 24px;color:#172231;font:400 14px/1.7 Arial,sans-serif;">${render(template.bodyHtml)}</div>${render(template.wrapperFooterHtml)}</div></body></html>`,
      previewText: render(template.previewText)
    };
  }

  async createTemplate(input: {
    displayName: string;
    description: string;
    blueprintId: string;
    status?: "published" | "draft";
  }) {
    await this.ensureLoaded();
    const template = {
      id: `tpl_${randomUUID()}`,
      displayName: input.displayName,
      description: input.description,
      blueprintId: input.blueprintId,
      status: input.status ?? "draft"
    } as const;
    this.state.templates.unshift(template);
    await this.persist();
    return template;
  }

  async updateTemplate(
    id: string,
    input: Partial<{ displayName: string; description: string; blueprintId: string; status: "published" | "draft" }>
  ) {
    await this.ensureLoaded();
    const current = this.state.templates.find((template) => template.id === id);
    if (!current) {
      return null;
    }
    const updated = {
      ...current,
      ...input
    };
    this.state.templates = this.state.templates.map((template) => (template.id === id ? updated : template));
    await this.persist();
    return updated;
  }

  async deleteTemplate(id: string) {
    await this.ensureLoaded();
    const exists = this.state.templates.some((template) => template.id === id);
    if (!exists) {
      return false;
    }
    this.state.templates = this.state.templates.filter((template) => template.id !== id);
    await this.persist();
    return true;
  }

  async createBlueprint(input: { displayName: string; kind: "flat" | "apparel" | "packaging" }) {
    await this.ensureLoaded();
    const blueprint = {
      id: `bp_${randomUUID()}`,
      displayName: input.displayName,
      kind: input.kind,
      latestVersionId: `bpv_${randomUUID()}`
    } as const;
    this.state.blueprints.unshift(blueprint);
    await this.persist();
    return blueprint;
  }

  async updateBlueprint(id: string, input: Partial<{ displayName: string; kind: "flat" | "apparel" | "packaging" }>) {
    await this.ensureLoaded();
    const current = this.state.blueprints.find((blueprint) => blueprint.id === id);
    if (!current) {
      return null;
    }
    const updated = {
      ...current,
      ...input
    };
    this.state.blueprints = this.state.blueprints.map((blueprint) => (blueprint.id === id ? updated : blueprint));
    await this.persist();
    return updated;
  }

  async deleteBlueprint(id: string) {
    await this.ensureLoaded();
    const exists = this.state.blueprints.some((blueprint) => blueprint.id === id);
    if (!exists) {
      return false;
    }
    this.state.blueprints = this.state.blueprints.filter((blueprint) => blueprint.id !== id);
    this.state.templates = this.state.templates.filter((template) => template.blueprintId !== id);
    await this.persist();
    return true;
  }

  async listUsers() {
    await this.ensureLoaded();
    return this.state.users.map(({ passwordHash, ...user }) => user);
  }

  async listApiTokens() {
    await this.ensureLoaded();
    return this.state.apiTokens;
  }

  async createApiToken(input: {
    label: string;
    scopes: ApiTokenRecord["scopes"];
    expiresAt?: string | null;
    createdByUserId?: string | null;
  }) {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const plainToken = `f2p_${randomUUID()}${randomUUID().replace(/-/g, "")}`;
    const tokenPrefix = plainToken.slice(0, 12);
    const record: ApiTokenRecord & { tokenHash: string } = {
      id: `apt_${randomUUID()}`,
      label: input.label.trim(),
      tokenPrefix,
      scopes: input.scopes,
      status: "active",
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.createdByUserId ?? null,
      createdAt: now,
      updatedAt: now,
      tokenHash: hashApiTokenSecret(plainToken)
    };
    this.state.apiTokens.unshift(record as ApiTokenRecord);
    await this.persist();
    return {
      token: plainToken,
      record: this.state.apiTokens[0]!
    };
  }

  async updateApiToken(
    id: string,
    input: Partial<Pick<ApiTokenRecord, "label" | "scopes" | "expiresAt" | "status">>
  ) {
    await this.ensureLoaded();
    const current = this.state.apiTokens.find((entry) => entry.id === id);
    if (!current) {
      return null;
    }
    const updated = {
      ...current,
      label: input.label?.trim() ? input.label.trim() : current.label,
      scopes: input.scopes ?? current.scopes,
      expiresAt: typeof input.expiresAt === "undefined" ? current.expiresAt : input.expiresAt,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString()
    };
    this.state.apiTokens = this.state.apiTokens.map((entry) => (entry.id === id ? updated : entry));
    await this.persist();
    return updated;
  }

  async deleteApiToken(id: string) {
    await this.ensureLoaded();
    const exists = this.state.apiTokens.some((entry) => entry.id === id);
    if (!exists) {
      return false;
    }
    this.state.apiTokens = this.state.apiTokens.filter((entry) => entry.id !== id);
    await this.persist();
    return true;
  }

  async getApiTokenBySecret(token: string) {
    await this.ensureLoaded();
    const tokenHash = hashApiTokenSecret(token);
    const match = this.state.apiTokens.find((entry) => (entry as ApiTokenRecord & { tokenHash?: string }).tokenHash === tokenHash);
    if (!match || match.status !== "active") {
      return null;
    }
    if (match.expiresAt && new Date(match.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    const updated = {
      ...match,
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.apiTokens = this.state.apiTokens.map((entry) => (entry.id === match.id ? updated : entry));
    await this.persist();
    return updated;
  }

  async createUser(input: {
    email: string;
    displayName: string;
    password: string;
    role?: UserRecord["role"];
  }) {
    await this.ensureLoaded();
    const existing = this.state.users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      return null;
    }
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: `usr_${randomUUID()}`,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      role: input.role ?? "customer",
      passwordHash: hashPassword(input.password),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    this.state.users.unshift(user);
    await this.persist();
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(
    id: string,
    input: Partial<Pick<UserRecord, "email" | "displayName" | "role" | "status">> & { password?: string }
  ) {
    await this.ensureLoaded();
    const current = this.state.users.find((user) => user.id === id);
    if (!current) {
      return null;
    }
    const nextEmail = input.email?.toLowerCase();
    const emailTaken =
      nextEmail &&
      this.state.users.some((user) => user.id !== id && user.email.toLowerCase() === nextEmail);
    if (emailTaken) {
      return { conflict: true as const };
    }
    const updated: UserRecord = {
      ...current,
      email: nextEmail ?? current.email,
      displayName: input.displayName ?? current.displayName,
      role: input.role ?? current.role,
      status: input.status ?? current.status,
      passwordHash: input.password ? hashPassword(input.password) : current.passwordHash,
      updatedAt: new Date().toISOString()
    };
    this.state.users = this.state.users.map((user) => (user.id === id ? updated : user));
    await this.persist();
    const { passwordHash: _passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async deleteUser(id: string) {
    await this.ensureLoaded();
    const current = this.state.users.find((user) => user.id === id);
    if (!current) {
      return false;
    }
    this.state.users = this.state.users.filter((user) => user.id !== id);
    this.state.authSessions = this.state.authSessions.filter((session) => session.userId !== id);
    this.state.passwordResets = this.state.passwordResets.filter((reset) => reset.userId !== id);
    await this.persist();
    return true;
  }

  async createAuthSession(email: string, password: string) {
    await this.ensureLoaded();
    const user = this.state.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
      return null;
    }
    const session: AuthSessionRecord = {
      id: `ses_${randomUUID()}`,
      userId: user.id,
      token: `tok_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    };
    this.state.authSessions.unshift(session);
    await this.persist();
    const { passwordHash, ...safeUser } = user;
    return { session, user: safeUser };
  }

  async getUserBySessionToken(token: string) {
    await this.ensureLoaded();
    const session = this.state.authSessions.find((entry) => entry.token === token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    const user = this.state.users.find((entry) => entry.id === session.userId);
    if (!user) {
      return null;
    }
    const { passwordHash, ...safeUser } = user;
    return { session, user: safeUser };
  }

  async revokeSession(token: string) {
    await this.ensureLoaded();
    this.state.authSessions = this.state.authSessions.filter((entry) => entry.token !== token);
    await this.persist();
  }

  async createPasswordReset(email: string) {
    await this.ensureLoaded();
    const user = this.state.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return null;
    }
    const reset: PasswordResetRecord = {
      id: `rst_${randomUUID()}`,
      userId: user.id,
      token: `reset_${randomUUID()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    const preview = await this.getEmailPreview("emt_password_reset", {
      recipientEmail: user.email,
      resetToken: reset.token
    });
    const mail: MailLogRecord = {
      id: `mail_${randomUUID()}`,
      kind: "password_reset",
      to: user.email,
      subject: preview?.subject ?? "Reset your Flow2Print password",
      preview: preview?.previewText ?? `Use token ${reset.token} to reset the password for ${user.email}.`,
      html:
        preview?.html ??
        `<!doctype html><html><body><p>Use token <strong>${reset.token}</strong> to reset the password for ${user.email}.</p></body></html>`,
      createdAt: new Date().toISOString()
    };
    this.state.passwordResets.unshift(reset);
    this.state.mailLog.unshift(mail);
    await this.persist();
    return { reset, mail };
  }

  async resetPassword(token: string, password: string) {
    await this.ensureLoaded();
    const reset = this.state.passwordResets.find((entry) => entry.token === token && entry.status === "pending");
    if (!reset || new Date(reset.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    this.state.users = this.state.users.map((user) =>
      user.id === reset.userId
        ? {
            ...user,
            passwordHash: hashPassword(password),
            updatedAt: new Date().toISOString()
          }
        : user
    );
    this.state.passwordResets = this.state.passwordResets.map((entry) =>
      entry.id === reset.id ? { ...entry, status: "used" } : entry
    );
    await this.persist();
    return true;
  }

  async updateOwnProfile(userId: string, input: { email?: string; displayName?: string }) {
    return this.updateUser(userId, input);
  }

  async changeOwnPassword(userId: string, currentPassword: string, nextPassword: string) {
    await this.ensureLoaded();
    const current = this.state.users.find((user) => user.id === userId);
    if (!current || !verifyPassword(currentPassword, current.passwordHash)) {
      return false;
    }
    this.state.users = this.state.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            passwordHash: hashPassword(nextPassword),
            updatedAt: new Date().toISOString()
          }
        : user
    );
    await this.persist();
    return true;
  }

  async listMailLog() {
    await this.ensureLoaded();
    return this.state.mailLog;
  }

  async createLaunchSession(request: LaunchSessionRequest): Promise<LaunchSession> {
    await this.ensureLoaded();
    const aggregate = createProjectAggregate(request);
    this.state.launchSessions.unshift(aggregate.launchSession);
    this.state.commerceLinks.unshift(aggregate.commerceLink);
    this.state.projects.unshift(aggregate.project);
    this.state.projectVersions.unshift(aggregate.projectVersion);
    await this.persist();
    return aggregate.launchSession;
  }

  async getLaunchSession(id: string) {
    await this.ensureLoaded();
    return this.state.launchSessions.find((session) => session.id === id) ?? null;
  }

  async getCommerceLinkByProject(projectId: string): Promise<CommerceLinkRecord | null> {
    await this.ensureLoaded();
    return this.state.commerceLinks.find((entry) => entry.projectId === projectId) ?? null;
  }

  async listProjects() {
    await this.ensureLoaded();
    return this.state.projects;
  }

  async createProject(input: {
    title: string;
    blueprintId: string;
    templateId?: string | null;
  }) {
    await this.ensureLoaded();

    const blueprint = this.state.blueprints.find((entry) => entry.id === input.blueprintId);
    if (!blueprint) {
      return null;
    }

    const externalProductRef =
      blueprint.id === "bp_business_card"
        ? "SKU-BUSINESS-CARD"
        : blueprint.id === "bp_tshirt"
          ? "SKU-TSHIRT-BLACK"
          : "SKU-FOLDING-CARTON";

    const aggregate = createProjectAggregate({
      connectorType: "magento2",
      externalStoreId: "admin",
      externalProductRef,
      templateId: input.templateId ?? null,
      customer: {
        email: "admin@flow2print.local",
        isGuest: false
      },
      locale: "en-US",
      currency: "USD",
      returnUrl: "/flow2print/return",
      options: {}
    });

    const nextProject = {
      ...aggregate.project,
      title: input.title.trim() || aggregate.project.title,
      launchSessionId: null,
      commerceLinkId: null,
      updatedAt: new Date().toISOString()
    };

    this.state.projects.unshift(nextProject);
    this.state.projectVersions.unshift(aggregate.projectVersion);
    await this.persist();

    return nextProject;
  }

  async updateProject(id: string, input: Partial<Pick<ProjectRecord, "title" | "status">>) {
    await this.ensureLoaded();
    const current = this.state.projects.find((project) => project.id === id);
    if (!current) {
      return null;
    }
    const updated: ProjectRecord = {
      ...current,
      title: input.title?.trim() ? input.title.trim() : current.title,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString()
    };
    this.state.projects = this.state.projects.map((project) => (project.id === id ? updated : project));
    await this.persist();
    return updated;
  }

  async deleteProject(id: string) {
    await this.ensureLoaded();
    const current = this.state.projects.find((project) => project.id === id);
    if (!current) {
      return false;
    }
    this.state.projects = this.state.projects.filter((project) => project.id !== id);
    this.state.projectVersions = this.state.projectVersions.filter((version) => version.projectId !== id);
    this.state.outputArtifacts = this.state.outputArtifacts.filter((artifact) => artifact.projectId !== id);
    this.state.preflightReports = this.state.preflightReports.filter((report) => report.projectId !== id);
    this.state.commerceLinks = this.state.commerceLinks.filter((link) => link.projectId !== id);
    this.state.launchSessions = this.state.launchSessions.filter((session) => session.projectId !== id);
    await this.persist();
    return true;
  }

  async listAssets() {
    await this.ensureLoaded();
    return this.state.assets;
  }

  async createAsset(input: {
    filename: string;
    kind?: AssetRecord["kind"];
    mimeType?: string;
    widthPx?: number | null;
    heightPx?: number | null;
  }) {
    await this.ensureLoaded();
    const asset = createAssetRecord(input);
    this.state.assets.unshift(asset);
    await this.persist();
    return asset;
  }

  async updateAsset(
    id: string,
    input: Partial<Pick<AssetRecord, "filename" | "kind" | "mimeType" | "widthPx" | "heightPx">>
  ) {
    await this.ensureLoaded();
    const current = this.state.assets.find((asset) => asset.id === id);
    if (!current) {
      return null;
    }
    const updated: AssetRecord = {
      ...current,
      filename: input.filename?.trim() ? input.filename.trim() : current.filename,
      kind: input.kind ?? current.kind,
      mimeType: input.mimeType?.trim() ? input.mimeType.trim() : current.mimeType,
      widthPx: input.widthPx ?? current.widthPx,
      heightPx: input.heightPx ?? current.heightPx
    };
    this.state.assets = this.state.assets.map((asset) => (asset.id === id ? updated : asset));
    await this.persist();
    return updated;
  }

  async deleteAsset(id: string) {
    await this.ensureLoaded();
    const exists = this.state.assets.some((asset) => asset.id === id);
    if (!exists) {
      return false;
    }
    this.state.assets = this.state.assets.filter((asset) => asset.id !== id);
    this.state.projectVersions = this.state.projectVersions.map((version) => ({
      ...version,
      document: {
        ...version.document,
        assets: version.document.assets.filter((asset) => asset.assetId !== id),
        surfaces: version.document.surfaces.map((surface) => ({
          ...surface,
          layers: surface.layers.filter((layer) => String(layer.metadata.assetId ?? "") !== id)
        }))
      }
    }));
    await this.persist();
    return true;
  }

  async getProject(id: string): Promise<{ project: ProjectRecord; version: ProjectVersionRecord } | null> {
    await this.ensureLoaded();
    const project = this.state.projects.find((entry) => entry.id === id);
    if (!project) {
      return null;
    }
    const version = this.state.projectVersions.find((entry) => entry.id === project.activeVersionId);
    if (!version) {
      return null;
    }
    return { project, version };
  }

  async autosaveProject(id: string, document: Flow2PrintDocument): Promise<ProjectVersionRecord | null> {
    await this.ensureLoaded();
    const current = await this.getProject(id);
    if (!current || current.project.status !== "draft") {
      return null;
    }
    current.version.document = document;
    current.project.updatedAt = new Date().toISOString();
    await this.persist();
    return current.version;
  }

  async applyTemplateToProject(id: string, input: ApplyTemplateRequest) {
    await this.ensureLoaded();
    const current = await this.getProject(id);
    if (!current || current.project.status !== "draft") {
      return null;
    }

    const updated = applyTemplatePreset({
      project: current.project,
      version: current.version,
      templateId: input.templateId
    });

    this.state.projects = this.state.projects.map((entry) => (entry.id === id ? updated.project : entry));
    this.state.projectVersions = this.state.projectVersions.map((entry) => (entry.id === current.version.id ? updated.version : entry));
    await this.persist();
    return updated;
  }

  async finalizeProjectById(id: string, request: FinalizeProjectRequest) {
    await this.ensureLoaded();
    const current = await this.getProject(id);
    if (!current) {
      return null;
    }
    const finalized = finalizeProject(current.project, current.version, request.proofMode, request.approvalIntent);
    const report = createPreflightReport(finalized.project, finalized.version);
    const artifacts = createProductionArtifacts(finalized.project, finalized.version);
    const projectWithOutputs: ProjectRecord = {
      ...finalized.project,
      latestJobs: finalized.project.latestJobs.map((job) => ({ ...job, status: "succeeded" })),
      latestReportId: report.id,
      updatedAt: new Date().toISOString()
    };
    this.state.projects = this.state.projects.map((entry) => (entry.id === id ? projectWithOutputs : entry));
    this.state.projectVersions.unshift(finalized.version);
    this.state.outputArtifacts = [
      ...artifacts,
      ...this.state.outputArtifacts.filter((artifact) => artifact.projectVersionId !== finalized.version.id)
    ];
    this.state.preflightReports = [
      report,
      ...this.state.preflightReports.filter((entry) => entry.projectVersionId !== finalized.version.id)
    ];
    await ensureArtifactFiles(artifacts, report);
    await this.persist();
    return {
      project: projectWithOutputs,
      version: finalized.version,
      report,
      artifacts
    };
  }

  async cloneProjectForReorder(id: string) {
    await this.ensureLoaded();
    const current = await this.getProject(id);
    if (!current) {
      return null;
    }
    const cloned = cloneFinalizedProject(current.project, current.version);
    this.state.projects.unshift(cloned.project);
    this.state.projectVersions.unshift(cloned.version);
    await this.persist();
    return cloned.project;
  }

  async getCommerceStatus(projectId: string): Promise<CommerceProjectStatus | null> {
    await this.ensureLoaded();
    const project = this.state.projects.find((entry) => entry.id === projectId);
    if (!project) {
      return null;
    }
    const report = project.latestReportId
      ? this.state.preflightReports.find((entry) => entry.id === project.latestReportId) ?? null
      : null;
    const artifacts = this.state.outputArtifacts
      .filter((entry) => entry.projectId === projectId)
      .map((entry) => ({ type: entry.artifactType, href: entry.href }));
    return {
      projectId,
      projectVersionId: project.activeVersionId,
      status: project.status,
      state: project.status,
      approvalState: project.approvalState,
      preflightStatus: report?.status ?? "not_run",
      artifacts
    };
  }

  async createQuoteLink(input: {
    projectId: string;
    externalQuoteRef: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  }): Promise<CommerceLinkRecord | null> {
    await this.ensureLoaded();
    const project = this.state.projects.find((entry) => entry.id === input.projectId);
    if (!project) {
      return null;
    }
    const existing = this.state.commerceLinks.find((entry) => entry.projectId === input.projectId);
    const now = new Date().toISOString();
    const next: CommerceLinkRecord = existing
      ? {
          ...existing,
          externalQuoteRef: input.externalQuoteRef,
          externalCustomerRef: input.externalCustomerRef ?? existing.externalCustomerRef,
          state: "quote_linked",
          updatedAt: now
        }
      : {
          id: `clk_${project.id}`,
          projectId: project.id,
          connectorType: "magento2",
          externalStoreId: input.externalStoreId ?? "default",
          externalProductRef: input.externalProductRef ?? project.externalProductRef,
          externalCustomerRef: input.externalCustomerRef ?? null,
          externalQuoteRef: input.externalQuoteRef,
          externalOrderRef: null,
          returnUrl: input.returnUrl ?? "",
          state: "quote_linked",
          createdAt: now,
          updatedAt: now
        };

    this.state.commerceLinks = [next, ...this.state.commerceLinks.filter((entry) => entry.projectId !== project.id)];
    this.state.projects = this.state.projects.map((entry) =>
      entry.id === project.id ? { ...entry, commerceLinkId: next.id, updatedAt: now } : entry
    );
    await this.persist();
    return next;
  }

  async createOrderLink(input: {
    projectId: string;
    externalOrderRef: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  }): Promise<CommerceLinkRecord | null> {
    await this.ensureLoaded();
    const project = this.state.projects.find((entry) => entry.id === input.projectId);
    if (!project) {
      return null;
    }
    const existing = this.state.commerceLinks.find((entry) => entry.projectId === input.projectId);
    const now = new Date().toISOString();
    const next: CommerceLinkRecord = existing
      ? {
          ...existing,
          externalOrderRef: input.externalOrderRef,
          externalCustomerRef: input.externalCustomerRef ?? existing.externalCustomerRef,
          state: "order_linked",
          updatedAt: now
        }
      : {
          id: `clk_${project.id}`,
          projectId: project.id,
          connectorType: "magento2",
          externalStoreId: input.externalStoreId ?? "default",
          externalProductRef: input.externalProductRef ?? project.externalProductRef,
          externalCustomerRef: input.externalCustomerRef ?? null,
          externalQuoteRef: null,
          externalOrderRef: input.externalOrderRef,
          returnUrl: input.returnUrl ?? "",
          state: "order_linked",
          createdAt: now,
          updatedAt: now
        };

    this.state.commerceLinks = [next, ...this.state.commerceLinks.filter((entry) => entry.projectId !== project.id)];
    this.state.projects = this.state.projects.map((entry) =>
      entry.id === project.id
        ? {
            ...entry,
            commerceLinkId: next.id,
            status: "ordered",
            updatedAt: now
          }
        : entry
    );
    await this.persist();
    return next;
  }

  async getProjectArtifacts(projectId: string): Promise<OutputArtifact[]> {
    await this.ensureLoaded();
    return this.state.outputArtifacts.filter((entry) => entry.projectId === projectId);
  }

  async getArtifactByHref(href: string): Promise<{ artifact: OutputArtifact; filePath: string } | null> {
    await this.ensureLoaded();
    const artifact = this.state.outputArtifacts.find((entry) => entry.href === href);
    if (!artifact) {
      return null;
    }
    return {
      artifact,
      filePath: artifactFilePathForHref(href)
    };
  }

  async getLatestPreflightReport(projectId: string): Promise<PreflightReport | null> {
    await this.ensureLoaded();
    const project = this.state.projects.find((entry) => entry.id === projectId);
    if (!project?.latestReportId) {
      return null;
    }
    return this.state.preflightReports.find((entry) => entry.id === project.latestReportId) ?? null;
  }
}

let store: RuntimeStore | ReturnType<typeof getDatabaseRuntimeStore> | null = null;

export const getRuntimeStore = () => {
  if (!store) {
    store = isPostgresPersistenceEnabled() ? getDatabaseRuntimeStore() : new RuntimeStore();
  }
  return store;
};
