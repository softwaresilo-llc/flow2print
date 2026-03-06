import { mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import type { Prisma } from "@prisma/client";

import type { Flow2PrintDocument } from "@flow2print/design-document";
import {
  applyTemplateToProject as applyTemplatePreset,
  cloneFinalizedProject,
  createAssetRecord,
  createPreflightReport,
  createProductionArtifacts,
  createProjectAggregate,
  finalizeProject,
  hashPassword,
  seedBlueprints,
  seedEmailTemplates,
  seedSystemSettings,
  seedTemplates,
  seedUsers,
  type AssetRecord,
  type AuthSessionRecord,
  type ApiTokenRecord,
  type CommerceLinkRecord,
  type CommerceProjectStatus,
  type EmailTemplateRecord,
  type Flow2PrintState,
  type LaunchSession,
  type MailLogRecord,
  type OutputArtifact,
  type OutputJob,
  type PasswordResetRecord,
  type PreflightIssue,
  type PreflightReport,
  type ProjectRecord,
  type ProjectVersionRecord,
  type SystemSettingsRecord,
  type TemplateSummary,
  type UserRecord,
  verifyPassword
} from "@flow2print/domain";
import type { ApplyTemplateRequest, FinalizeProjectRequest, LaunchSessionRequest } from "@flow2print/http-sdk";

import { getPrismaClient } from "./client.js";

const dataDir = resolve(process.cwd(), process.env.FLOW2PRINT_DATA_DIR ?? ".flow2print-runtime");
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

const asJson = <T>(value: T): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const asOutputJobs = (value: Prisma.JsonValue | null | undefined) => ((value ?? []) as unknown as OutputJob[]) ?? [];
const asIssues = (value: Prisma.JsonValue | null | undefined) => ((value ?? []) as unknown as PreflightIssue[]) ?? [];

const mapUser = (record: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord => ({
  id: record.id,
  email: record.email,
  displayName: record.displayName,
  role: record.role as UserRecord["role"],
  passwordHash: record.passwordHash,
  status: record.status as UserRecord["status"],
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

const mapSafeUser = (record: UserRecord) => {
  const { passwordHash: _passwordHash, ...safeUser } = record;
  return safeUser;
};

const mapEmailTemplate = (record: {
  id: string;
  kind: string;
  label: string;
  subject: string;
  bodyHtml: string;
  previewText: string;
  updatedAt: Date;
}): EmailTemplateRecord => ({
  id: record.id,
  kind: record.kind as EmailTemplateRecord["kind"],
  label: record.label,
  subject: record.subject,
  bodyHtml: record.bodyHtml,
  previewText: record.previewText,
  updatedAt: record.updatedAt.toISOString()
});

const mapSettings = (record: {
  brandName: string;
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  mailFromName: string;
  mailFromAddress: string;
  primaryColor: string;
  logoText: string;
  portalAppUrl: string;
  designerAppUrl: string;
  adminAppUrl: string;
  commerceBaseUrl: string;
  defaultLocale: string;
  defaultTimezone: string;
  mailHeaderHtml: string;
  mailFooterHtml: string;
  updatedAt: Date;
}): SystemSettingsRecord => ({
  brandName: record.brandName,
  companyName: record.companyName,
  companyAddress: record.companyAddress,
  supportEmail: record.supportEmail,
  mailFromName: record.mailFromName,
  mailFromAddress: record.mailFromAddress,
  primaryColor: record.primaryColor,
  logoText: record.logoText,
  portalAppUrl: record.portalAppUrl,
  designerAppUrl: record.designerAppUrl,
  adminAppUrl: record.adminAppUrl,
  commerceBaseUrl: record.commerceBaseUrl,
  defaultLocale: record.defaultLocale,
  defaultTimezone: record.defaultTimezone,
  mailHeaderHtml: record.mailHeaderHtml,
  mailFooterHtml: record.mailFooterHtml,
  updatedAt: record.updatedAt.toISOString()
});

const mapAsset = (record: {
  id: string;
  tenantId: string;
  ownerIdentityId: string;
  kind: string;
  filename: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
  createdAt: Date;
}): AssetRecord => ({
  id: record.id,
  tenantId: record.tenantId,
  ownerIdentityId: record.ownerIdentityId,
  kind: record.kind as AssetRecord["kind"],
  filename: record.filename,
  mimeType: record.mimeType,
  widthPx: record.widthPx,
  heightPx: record.heightPx,
  createdAt: record.createdAt.toISOString()
});

const mapProject = (record: {
  id: string;
  title: string;
  status: string;
  approvalState: string;
  blueprintId: string;
  blueprintVersionId: string;
  templateId: string | null;
  templateVersionId: string | null;
  commerceLinkId: string | null;
  activeVersionId: string;
  launchSessionId: string | null;
  externalProductRef: string;
  latestJobs: Prisma.JsonValue | null;
  latestReportId: string | null;
  pricingSignals: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord => ({
  id: record.id,
  title: record.title,
  status: record.status as ProjectRecord["status"],
  approvalState: record.approvalState as ProjectRecord["approvalState"],
  blueprintId: record.blueprintId,
  blueprintVersionId: record.blueprintVersionId,
  templateId: record.templateId,
  templateVersionId: record.templateVersionId,
  commerceLinkId: record.commerceLinkId,
  activeVersionId: record.activeVersionId,
  launchSessionId: record.launchSessionId,
  externalProductRef: record.externalProductRef,
  latestJobs: asOutputJobs(record.latestJobs),
  latestReportId: record.latestReportId,
  pricingSignals: record.pricingSignals as unknown as ProjectRecord["pricingSignals"],
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

const mapProjectVersion = (record: {
  id: string;
  projectId: string;
  versionNumber: number;
  isFinal: boolean;
  document: Prisma.JsonValue;
  createdAt: Date;
}): ProjectVersionRecord => ({
  id: record.id,
  projectId: record.projectId,
  versionNumber: record.versionNumber,
  isFinal: record.isFinal,
  document: record.document as Flow2PrintDocument,
  createdAt: record.createdAt.toISOString()
});

const mapApiToken = (record: {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ApiTokenRecord => ({
  id: record.id,
  label: record.label,
  tokenPrefix: record.tokenPrefix,
  scopes: record.scopes as ApiTokenRecord["scopes"],
  status: record.status as ApiTokenRecord["status"],
  lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
  expiresAt: record.expiresAt?.toISOString() ?? null,
  createdByUserId: record.createdByUserId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

const mapArtifact = (record: {
  id: string;
  projectId: string;
  projectVersionId: string;
  artifactType: string;
  href: string;
  createdAt: Date;
}): OutputArtifact => ({
  id: record.id,
  projectId: record.projectId,
  projectVersionId: record.projectVersionId,
  artifactType: record.artifactType as OutputArtifact["artifactType"],
  href: record.href,
  createdAt: record.createdAt.toISOString()
});

const mapPreflightReport = (record: {
  id: string;
  projectId: string;
  projectVersionId: string;
  status: string;
  createdAt: Date;
  issues: Prisma.JsonValue | null;
}): PreflightReport => ({
  id: record.id,
  projectId: record.projectId,
  projectVersionId: record.projectVersionId,
  status: record.status as PreflightReport["status"],
  createdAt: record.createdAt.toISOString(),
  issues: asIssues(record.issues)
});

const mapCommerceLink = (record: {
  id: string;
  projectId: string;
  connectorType: string;
  externalStoreId: string;
  externalProductRef: string;
  externalCustomerRef: string | null;
  externalQuoteRef: string | null;
  externalOrderRef: string | null;
  returnUrl: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}): CommerceLinkRecord => ({
  id: record.id,
  projectId: record.projectId,
  connectorType: record.connectorType as CommerceLinkRecord["connectorType"],
  externalStoreId: record.externalStoreId,
  externalProductRef: record.externalProductRef,
  externalCustomerRef: record.externalCustomerRef,
  externalQuoteRef: record.externalQuoteRef,
  externalOrderRef: record.externalOrderRef,
  returnUrl: record.returnUrl,
  state: record.state as CommerceLinkRecord["state"],
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString()
});

const mapLaunchSession = (record: {
  id: string;
  projectId: string;
  connectorType: string;
  externalStoreId: string;
  externalProductRef: string;
  externalVariantRef: string | null;
  customerEmail: string;
  isGuest: boolean;
  locale: string;
  currency: string;
  returnUrl: string;
  options: Prisma.JsonValue;
  expiresAt: Date;
  createdAt: Date;
}): LaunchSession => ({
  id: record.id,
  projectId: record.projectId,
  connectorType: record.connectorType as LaunchSession["connectorType"],
  externalStoreId: record.externalStoreId,
  externalProductRef: record.externalProductRef,
  externalVariantRef: record.externalVariantRef ?? undefined,
  customerEmail: record.customerEmail,
  isGuest: record.isGuest,
  locale: record.locale,
  currency: record.currency,
  returnUrl: record.returnUrl,
  options: (record.options ?? {}) as LaunchSession["options"],
  expiresAt: record.expiresAt.toISOString(),
  createdAt: record.createdAt.toISOString()
});

export class DatabaseRuntimeStore {
  private prisma = getPrismaClient();
  private seeded = false;

  private async ensureSeeded() {
    if (this.seeded) {
      return;
    }

    for (const blueprint of seedBlueprints()) {
      await this.prisma.blueprint.upsert({
        where: { id: blueprint.id },
        update: {
          displayName: blueprint.displayName,
          kind: blueprint.kind,
          latestVersionId: blueprint.latestVersionId
        },
        create: blueprint
      });
    }

    for (const template of seedTemplates()) {
      await this.prisma.template.upsert({
        where: { id: template.id },
        update: {
          displayName: template.displayName,
          description: template.description,
          blueprintId: template.blueprintId,
          status: template.status
        },
        create: template
      });
    }

    for (const template of seedEmailTemplates()) {
      await this.prisma.emailTemplate.upsert({
        where: { id: template.id },
        update: {
          kind: template.kind,
          label: template.label,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          previewText: template.previewText,
          updatedAt: new Date(template.updatedAt)
        },
        create: {
          ...template,
          updatedAt: new Date(template.updatedAt)
        }
      });
    }

    const settings = seedSystemSettings();
    await this.prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        ...settings,
        updatedAt: new Date(settings.updatedAt)
      },
      create: {
        id: "default",
        ...settings,
        updatedAt: new Date(settings.updatedAt)
      }
    });

    for (const user of seedUsers()) {
      await this.prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          passwordHash: user.passwordHash,
          status: user.status,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        },
        create: {
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }

    this.seeded = true;
  }

  async getBlueprints() {
    await this.ensureSeeded();
    return (await this.prisma.blueprint.findMany({ orderBy: { displayName: "asc" } })).map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
      kind: entry.kind as Flow2PrintState["blueprints"][number]["kind"],
      latestVersionId: entry.latestVersionId
    }));
  }

  async getTemplates() {
    await this.ensureSeeded();
    return (await this.prisma.template.findMany({ orderBy: { displayName: "asc" } })).map(
      (entry): TemplateSummary => ({
        id: entry.id,
        displayName: entry.displayName,
        description: entry.description,
        blueprintId: entry.blueprintId,
        status: entry.status as TemplateSummary["status"]
      })
    );
  }

  async listEmailTemplates() {
    await this.ensureSeeded();
    return (await this.prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } })).map(mapEmailTemplate);
  }

  async createEmailTemplate(input: {
    label: string;
    kind: EmailTemplateRecord["kind"];
    subject: string;
    bodyHtml: string;
    previewText: string;
  }) {
    await this.ensureSeeded();
    return mapEmailTemplate(
      await this.prisma.emailTemplate.create({
        data: {
          id: `emt_${randomUUID()}`,
          label: input.label,
          kind: input.kind,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          previewText: input.previewText,
          updatedAt: new Date()
        }
      })
    );
  }

  async updateEmailTemplate(
    id: string,
    input: Partial<Pick<EmailTemplateRecord, "label" | "kind" | "subject" | "bodyHtml" | "previewText">>
  ) {
    await this.ensureSeeded();
    const current = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    return mapEmailTemplate(
      await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          label: input.label ?? current.label,
          kind: input.kind ?? current.kind,
          subject: input.subject ?? current.subject,
          bodyHtml: input.bodyHtml ?? current.bodyHtml,
          previewText: input.previewText ?? current.previewText,
          updatedAt: new Date()
        }
      })
    );
  }

  async deleteEmailTemplate(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.emailTemplate.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async getSystemSettings() {
    await this.ensureSeeded();
    const record = await this.prisma.systemSettings.findUniqueOrThrow({ where: { id: "default" } });
    return mapSettings(record);
  }

  async updateSystemSettings(input: Partial<SystemSettingsRecord>) {
    await this.ensureSeeded();
    const current = await this.prisma.systemSettings.findUniqueOrThrow({ where: { id: "default" } });
    return mapSettings(
      await this.prisma.systemSettings.update({
        where: { id: "default" },
        data: {
          brandName: input.brandName ?? current.brandName,
          companyName: input.companyName ?? current.companyName,
          companyAddress: input.companyAddress ?? current.companyAddress,
          supportEmail: input.supportEmail ?? current.supportEmail,
          mailFromName: input.mailFromName ?? current.mailFromName,
          mailFromAddress: input.mailFromAddress ?? current.mailFromAddress,
          primaryColor: input.primaryColor ?? current.primaryColor,
          logoText: input.logoText ?? current.logoText,
          portalAppUrl: input.portalAppUrl ?? current.portalAppUrl,
          designerAppUrl: input.designerAppUrl ?? current.designerAppUrl,
          adminAppUrl: input.adminAppUrl ?? current.adminAppUrl,
          commerceBaseUrl: input.commerceBaseUrl ?? current.commerceBaseUrl,
          defaultLocale: input.defaultLocale ?? current.defaultLocale,
          defaultTimezone: input.defaultTimezone ?? current.defaultTimezone,
          mailHeaderHtml: input.mailHeaderHtml ?? current.mailHeaderHtml,
          mailFooterHtml: input.mailFooterHtml ?? current.mailFooterHtml,
          updatedAt: new Date()
        }
      })
    );
  }

  async getEmailPreview(id: string, params?: { recipientEmail?: string; resetToken?: string }) {
    await this.ensureSeeded();
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return null;
    }
    return this.previewEmailTemplate({
      template: {
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        previewText: template.previewText
      },
      recipientEmail: params?.recipientEmail,
      resetToken: params?.resetToken
    });
  }

  async previewEmailTemplate(input: {
    template?: Pick<EmailTemplateRecord, "subject" | "bodyHtml" | "previewText"> | null;
    settings?: Partial<SystemSettingsRecord>;
    recipientEmail?: string;
    resetToken?: string;
  }) {
    await this.ensureSeeded();
    if (!input.template) {
      return null;
    }
    const settings = {
      ...(await this.getSystemSettings()),
      ...input.settings
    };
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
      recipientEmail: input.recipientEmail ?? "customer@example.com",
      resetToken: input.resetToken ?? "reset_demo_token"
    };
    const render = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? "");

    return {
      subject: render(input.template.subject),
      html: `<!doctype html><html><body style="margin:0;background:#f3f5f8;"><div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #d8e0ea;border-radius:16px;overflow:hidden;">${render(settings.mailHeaderHtml)}<div style="padding:24px 24px 8px 24px;color:#172231;font:400 14px/1.7 Arial,sans-serif;">${render(input.template.bodyHtml)}</div>${render(settings.mailFooterHtml)}</div></body></html>`,
      previewText: render(input.template.previewText)
    };
  }

  async createTemplate(input: { displayName: string; description: string; blueprintId: string; status?: "published" | "draft" }) {
    await this.ensureSeeded();
    const template = await this.prisma.template.create({
      data: {
        id: `tpl_${randomUUID()}`,
        displayName: input.displayName,
        description: input.description,
        blueprintId: input.blueprintId,
        status: input.status ?? "draft"
      }
    });
    return {
      id: template.id,
      displayName: template.displayName,
      description: template.description,
      blueprintId: template.blueprintId,
      status: template.status as TemplateSummary["status"]
    };
  }

  async updateTemplate(id: string, input: Partial<{ displayName: string; description: string; blueprintId: string; status: "published" | "draft" }>) {
    await this.ensureSeeded();
    const current = await this.prisma.template.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    const template = await this.prisma.template.update({
      where: { id },
      data: {
        displayName: input.displayName ?? current.displayName,
        description: input.description ?? current.description,
        blueprintId: input.blueprintId ?? current.blueprintId,
        status: input.status ?? current.status
      }
    });
    return {
      id: template.id,
      displayName: template.displayName,
      description: template.description,
      blueprintId: template.blueprintId,
      status: template.status as TemplateSummary["status"]
    };
  }

  async deleteTemplate(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.template.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async createBlueprint(input: { displayName: string; kind: "flat" | "apparel" | "packaging" }) {
    await this.ensureSeeded();
    const blueprint = await this.prisma.blueprint.create({
      data: {
        id: `bp_${randomUUID()}`,
        displayName: input.displayName,
        kind: input.kind,
        latestVersionId: `bpv_${randomUUID()}`
      }
    });
    return {
      id: blueprint.id,
      displayName: blueprint.displayName,
      kind: blueprint.kind as Flow2PrintState["blueprints"][number]["kind"],
      latestVersionId: blueprint.latestVersionId
    };
  }

  async updateBlueprint(id: string, input: Partial<{ displayName: string; kind: "flat" | "apparel" | "packaging" }>) {
    await this.ensureSeeded();
    const current = await this.prisma.blueprint.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    const blueprint = await this.prisma.blueprint.update({
      where: { id },
      data: {
        displayName: input.displayName ?? current.displayName,
        kind: input.kind ?? current.kind
      }
    });
    return {
      id: blueprint.id,
      displayName: blueprint.displayName,
      kind: blueprint.kind as Flow2PrintState["blueprints"][number]["kind"],
      latestVersionId: blueprint.latestVersionId
    };
  }

  async deleteBlueprint(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.blueprint.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async listUsers() {
    await this.ensureSeeded();
    return (await this.prisma.user.findMany({ orderBy: { createdAt: "desc" } })).map((entry) => mapSafeUser(mapUser(entry)));
  }

  async listApiTokens() {
    await this.ensureSeeded();
    return (await this.prisma.apiToken.findMany({ orderBy: { createdAt: "desc" } })).map(mapApiToken);
  }

  async createApiToken(input: {
    label: string;
    scopes: ApiTokenRecord["scopes"];
    expiresAt?: string | null;
    createdByUserId?: string | null;
  }) {
    await this.ensureSeeded();
    const now = new Date();
    const plainToken = `f2p_${randomUUID()}${randomUUID().replace(/-/g, "")}`;
    const token = await this.prisma.apiToken.create({
      data: {
        id: `apt_${randomUUID()}`,
        label: input.label.trim(),
        tokenPrefix: plainToken.slice(0, 12),
        tokenHash: hashApiTokenSecret(plainToken),
        scopes: input.scopes,
        status: "active",
        lastUsedAt: null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdByUserId: input.createdByUserId ?? null,
        createdAt: now,
        updatedAt: now
      }
    });
    return {
      token: plainToken,
      record: mapApiToken(token)
    };
  }

  async updateApiToken(
    id: string,
    input: Partial<Pick<ApiTokenRecord, "label" | "scopes" | "expiresAt" | "status">>
  ) {
    await this.ensureSeeded();
    const current = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    return mapApiToken(
      await this.prisma.apiToken.update({
        where: { id },
        data: {
          label: input.label?.trim() ? input.label.trim() : current.label,
          scopes: input.scopes ?? current.scopes,
          status: input.status ?? current.status,
          expiresAt: typeof input.expiresAt === "undefined" ? current.expiresAt : input.expiresAt ? new Date(input.expiresAt) : null,
          updatedAt: new Date()
        }
      })
    );
  }

  async deleteApiToken(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.apiToken.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async getApiTokenBySecret(token: string) {
    await this.ensureSeeded();
    const record = await this.prisma.apiToken.findUnique({
      where: { tokenHash: hashApiTokenSecret(token) }
    });
    if (!record || record.status !== "active") {
      return null;
    }
    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    const updated = await this.prisma.apiToken.update({
      where: { id: record.id },
      data: {
        lastUsedAt: new Date(),
        updatedAt: new Date()
      }
    });
    return mapApiToken(updated);
  }

  async createUser(input: { email: string; displayName: string; password: string; role?: UserRecord["role"] }) {
    await this.ensureSeeded();
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      return null;
    }
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        id: `usr_${randomUUID()}`,
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        role: input.role ?? "customer",
        passwordHash: hashPassword(input.password),
        status: "active",
        createdAt: now,
        updatedAt: now
      }
    });
    return mapSafeUser(mapUser(user));
  }

  async updateUser(
    id: string,
    input: Partial<Pick<UserRecord, "email" | "displayName" | "role" | "status">> & { password?: string }
  ) {
    await this.ensureSeeded();
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    const nextEmail = input.email?.toLowerCase();
    if (nextEmail) {
      const conflict = await this.prisma.user.findFirst({ where: { email: nextEmail, id: { not: id } } });
      if (conflict) {
        return { conflict: true as const };
      }
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: nextEmail ?? current.email,
        displayName: input.displayName ?? current.displayName,
        role: input.role ?? current.role,
        status: input.status ?? current.status,
        passwordHash: input.password ? hashPassword(input.password) : current.passwordHash,
        updatedAt: new Date()
      }
    });
    return mapSafeUser(mapUser(user));
  }

  async deleteUser(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.user.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async createAuthSession(email: string, password: string) {
    await this.ensureSeeded();
    const userRow = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!userRow) {
      return null;
    }
    const user = mapUser(userRow);
    if (user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
      return null;
    }
    const session = await this.prisma.authSession.create({
      data: {
        id: `ses_${randomUUID()}`,
        userId: user.id,
        token: `tok_${randomUUID()}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
      }
    });
    return {
      session: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString()
      } satisfies AuthSessionRecord,
      user: mapSafeUser(user)
    };
  }

  async getUserBySessionToken(token: string) {
    await this.ensureSeeded();
    const session = await this.prisma.authSession.findUnique({ where: { token } });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    const userRow = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!userRow) {
      return null;
    }
    const user = mapUser(userRow);
    return {
      session: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString()
      } satisfies AuthSessionRecord,
      user: mapSafeUser(user)
    };
  }

  async revokeSession(token: string) {
    await this.ensureSeeded();
    await this.prisma.authSession.deleteMany({ where: { token } });
  }

  async createPasswordReset(email: string) {
    await this.ensureSeeded();
    const userRow = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!userRow) {
      return null;
    }
    const reset = await this.prisma.passwordReset.create({
      data: {
        id: `rst_${randomUUID()}`,
        userId: userRow.id,
        token: `reset_${randomUUID()}`,
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const preview = await this.getEmailPreview("emt_password_reset", {
      recipientEmail: userRow.email,
      resetToken: reset.token
    });
    const mail = await this.prisma.mailLog.create({
      data: {
        id: `mail_${randomUUID()}`,
        kind: "password_reset",
        recipient: userRow.email,
        subject: preview?.subject ?? "Reset your Flow2Print password",
        preview: preview?.previewText ?? `Use token ${reset.token} to reset the password for ${userRow.email}.`,
        html:
          preview?.html ??
          `<!doctype html><html><body><p>Use token <strong>${reset.token}</strong> to reset the password for ${userRow.email}.</p></body></html>`,
        createdAt: new Date()
      }
    });
    return {
      reset: {
        id: reset.id,
        userId: reset.userId,
        token: reset.token,
        status: reset.status as PasswordResetRecord["status"],
        createdAt: reset.createdAt.toISOString(),
        expiresAt: reset.expiresAt.toISOString()
      },
      mail: {
        id: mail.id,
        kind: mail.kind as MailLogRecord["kind"],
        to: mail.recipient,
        subject: mail.subject,
        preview: mail.preview,
        html: mail.html,
        createdAt: mail.createdAt.toISOString()
      }
    };
  }

  async resetPassword(token: string, password: string) {
    await this.ensureSeeded();
    const reset = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.status !== "pending" || reset.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: hashPassword(password),
          updatedAt: new Date()
        }
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: {
          status: "used"
        }
      })
    ]);
    return true;
  }

  async updateOwnProfile(userId: string, input: { email?: string; displayName?: string }) {
    return this.updateUser(userId, input);
  }

  async changeOwnPassword(userId: string, currentPassword: string, nextPassword: string) {
    await this.ensureSeeded();
    const userRow = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userRow || !verifyPassword(currentPassword, userRow.passwordHash)) {
      return false;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashPassword(nextPassword),
        updatedAt: new Date()
      }
    });
    return true;
  }

  async listMailLog() {
    await this.ensureSeeded();
    return (
      await this.prisma.mailLog.findMany({
        orderBy: { createdAt: "desc" }
      })
    ).map(
      (entry): MailLogRecord => ({
        id: entry.id,
        kind: entry.kind as MailLogRecord["kind"],
        to: entry.recipient,
        subject: entry.subject,
        preview: entry.preview,
        html: entry.html,
        createdAt: entry.createdAt.toISOString()
      })
    );
  }

  async createLaunchSession(request: LaunchSessionRequest): Promise<LaunchSession> {
    await this.ensureSeeded();
    const aggregate = createProjectAggregate(request);
    await this.prisma.$transaction([
      this.prisma.launchSession.create({
        data: {
          id: aggregate.launchSession.id,
          projectId: aggregate.launchSession.projectId,
          connectorType: aggregate.launchSession.connectorType,
          externalStoreId: aggregate.launchSession.externalStoreId,
          externalProductRef: aggregate.launchSession.externalProductRef,
          externalVariantRef: aggregate.launchSession.externalVariantRef ?? null,
          customerEmail: aggregate.launchSession.customerEmail,
          isGuest: aggregate.launchSession.isGuest,
          locale: aggregate.launchSession.locale,
          currency: aggregate.launchSession.currency,
          returnUrl: aggregate.launchSession.returnUrl,
          options: asJson(aggregate.launchSession.options),
          expiresAt: new Date(aggregate.launchSession.expiresAt),
          createdAt: new Date(aggregate.launchSession.createdAt)
        }
      }),
      this.prisma.commerceLink.create({
        data: {
          id: aggregate.commerceLink.id,
          projectId: aggregate.commerceLink.projectId,
          connectorType: aggregate.commerceLink.connectorType,
          externalStoreId: aggregate.commerceLink.externalStoreId,
          externalProductRef: aggregate.commerceLink.externalProductRef,
          externalCustomerRef: aggregate.commerceLink.externalCustomerRef,
          externalQuoteRef: aggregate.commerceLink.externalQuoteRef,
          externalOrderRef: aggregate.commerceLink.externalOrderRef,
          returnUrl: aggregate.commerceLink.returnUrl,
          state: aggregate.commerceLink.state,
          createdAt: new Date(aggregate.commerceLink.createdAt),
          updatedAt: new Date(aggregate.commerceLink.updatedAt)
        }
      }),
      this.prisma.project.create({
        data: {
          ...this.toProjectCreateInput(aggregate.project)
        }
      }),
      this.prisma.projectVersion.create({
        data: this.toProjectVersionCreateInput(aggregate.projectVersion)
      })
    ]);
    return aggregate.launchSession;
  }

  async getLaunchSession(id: string) {
    await this.ensureSeeded();
    const session = await this.prisma.launchSession.findUnique({ where: { id } });
    return session ? mapLaunchSession(session) : null;
  }

  async getCommerceLinkByProject(projectId: string) {
    await this.ensureSeeded();
    const link = await this.prisma.commerceLink.findUnique({ where: { projectId } });
    return link ? mapCommerceLink(link) : null;
  }

  async listProjects() {
    await this.ensureSeeded();
    return (await this.prisma.project.findMany({ orderBy: { updatedAt: "desc" } })).map(mapProject);
  }

  async createProject(input: { title: string; blueprintId: string; templateId?: string | null }) {
    await this.ensureSeeded();
    const blueprints = await this.getBlueprints();
    const blueprint = blueprints.find((entry) => entry.id === input.blueprintId);
    if (!blueprint) {
      return null;
    }
    const externalProductRef =
      blueprint.id === "bp_business_card" ? "SKU-BUSINESS-CARD" : blueprint.id === "bp_tshirt" ? "SKU-TSHIRT-BLACK" : "SKU-FOLDING-CARTON";
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
    const nextProject: ProjectRecord = {
      ...aggregate.project,
      title: input.title.trim() || aggregate.project.title,
      launchSessionId: null,
      commerceLinkId: null,
      updatedAt: new Date().toISOString()
    };
    await this.prisma.$transaction([
      this.prisma.project.create({
        data: this.toProjectCreateInput(nextProject)
      }),
      this.prisma.projectVersion.create({
        data: this.toProjectVersionCreateInput(aggregate.projectVersion)
      })
    ]);
    return nextProject;
  }

  async updateProject(id: string, input: Partial<Pick<ProjectRecord, "title" | "status">>) {
    await this.ensureSeeded();
    const current = await this.prisma.project.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    return mapProject(
      await this.prisma.project.update({
        where: { id },
        data: {
          title: input.title?.trim() ? input.title.trim() : current.title,
          status: input.status ?? current.status,
          updatedAt: new Date()
        }
      })
    );
  }

  async deleteProject(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.project.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  async listAssets() {
    await this.ensureSeeded();
    return (await this.prisma.asset.findMany({ orderBy: { createdAt: "desc" } })).map(mapAsset);
  }

  async createAsset(input: { filename: string; kind?: AssetRecord["kind"]; mimeType?: string; widthPx?: number | null; heightPx?: number | null }) {
    await this.ensureSeeded();
    const asset = createAssetRecord(input);
    await this.prisma.asset.create({
      data: {
        id: asset.id,
        tenantId: asset.tenantId,
        ownerIdentityId: asset.ownerIdentityId,
        kind: asset.kind,
        filename: asset.filename,
        mimeType: asset.mimeType,
        widthPx: asset.widthPx,
        heightPx: asset.heightPx,
        createdAt: new Date(asset.createdAt)
      }
    });
    return asset;
  }

  async updateAsset(id: string, input: Partial<Pick<AssetRecord, "filename" | "kind" | "mimeType" | "widthPx" | "heightPx">>) {
    await this.ensureSeeded();
    const current = await this.prisma.asset.findUnique({ where: { id } });
    if (!current) {
      return null;
    }
    return mapAsset(
      await this.prisma.asset.update({
        where: { id },
        data: {
          filename: input.filename?.trim() ? input.filename.trim() : current.filename,
          kind: input.kind ?? current.kind,
          mimeType: input.mimeType?.trim() ? input.mimeType.trim() : current.mimeType,
          widthPx: input.widthPx ?? current.widthPx,
          heightPx: input.heightPx ?? current.heightPx
        }
      })
    );
  }

  async deleteAsset(id: string) {
    await this.ensureSeeded();
    const deleted = await this.prisma.asset.deleteMany({ where: { id } });
    if (!deleted.count) {
      return false;
    }
    const versions = await this.prisma.projectVersion.findMany();
    for (const version of versions) {
      const document = version.document as unknown as Flow2PrintDocument;
      const nextDocument: Flow2PrintDocument = {
        ...document,
        assets: document.assets.filter((asset) => asset.assetId !== id),
        surfaces: document.surfaces.map((surface) => ({
          ...surface,
          layers: surface.layers.filter((layer) => String(layer.metadata?.assetId ?? "") !== id)
        }))
      };
      await this.prisma.projectVersion.update({
        where: { id: version.id },
        data: {
          document: asJson(nextDocument)
        }
      });
    }
    return true;
  }

  async getProject(id: string) {
    await this.ensureSeeded();
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      return null;
    }
    const version = await this.prisma.projectVersion.findUnique({ where: { id: project.activeVersionId } });
    if (!version) {
      return null;
    }
    return {
      project: mapProject(project),
      version: mapProjectVersion(version)
    };
  }

  async autosaveProject(id: string, document: Flow2PrintDocument) {
    await this.ensureSeeded();
    const current = await this.getProject(id);
    if (!current || current.project.status !== "draft") {
      return null;
    }
    const updatedVersion = await this.prisma.projectVersion.update({
      where: { id: current.version.id },
      data: {
        document: asJson(document)
      }
    });
    await this.prisma.project.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    });
    return mapProjectVersion(updatedVersion);
  }

  async applyTemplateToProject(id: string, input: ApplyTemplateRequest) {
    await this.ensureSeeded();
    const current = await this.getProject(id);
    if (!current || current.project.status !== "draft") {
      return null;
    }
    const updated = applyTemplatePreset({
      project: current.project,
      version: current.version,
      templateId: input.templateId
    });
    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id },
        data: this.toProjectUpdateInput(updated.project)
      }),
      this.prisma.projectVersion.update({
        where: { id: updated.version.id },
        data: {
          document: asJson(updated.version.document)
        }
      })
    ]);
    return updated;
  }

  async finalizeProjectById(id: string, request: FinalizeProjectRequest) {
    await this.ensureSeeded();
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
    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id },
        data: this.toProjectUpdateInput(projectWithOutputs)
      }),
      this.prisma.projectVersion.create({
        data: this.toProjectVersionCreateInput(finalized.version)
      }),
      this.prisma.outputArtifact.createMany({
        data: artifacts.map((artifact) => ({
          id: artifact.id,
          projectId: artifact.projectId,
          projectVersionId: artifact.projectVersionId,
          artifactType: artifact.artifactType,
          href: artifact.href,
          createdAt: new Date(artifact.createdAt)
        }))
      }),
      this.prisma.preflightReport.create({
        data: {
          id: report.id,
          projectId: report.projectId,
          projectVersionId: report.projectVersionId,
          status: report.status,
          createdAt: new Date(report.createdAt),
          issues: asJson(report.issues)
        }
      })
    ]);
    await ensureArtifactFiles(artifacts, report);
    return {
      project: projectWithOutputs,
      version: finalized.version,
      report,
      artifacts
    };
  }

  async cloneProjectForReorder(id: string) {
    await this.ensureSeeded();
    const current = await this.getProject(id);
    if (!current) {
      return null;
    }
    const cloned = cloneFinalizedProject(current.project, current.version);
    await this.prisma.$transaction([
      this.prisma.project.create({
        data: this.toProjectCreateInput(cloned.project)
      }),
      this.prisma.projectVersion.create({
        data: this.toProjectVersionCreateInput(cloned.version)
      })
    ]);
    return cloned.project;
  }

  async getCommerceStatus(projectId: string): Promise<CommerceProjectStatus | null> {
    await this.ensureSeeded();
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return null;
    }
    const report = project.latestReportId ? await this.prisma.preflightReport.findUnique({ where: { id: project.latestReportId } }) : null;
    const artifacts = await this.prisma.outputArtifact.findMany({ where: { projectId } });
    return {
      projectId,
      projectVersionId: project.activeVersionId,
      status: project.status as CommerceProjectStatus["status"],
      state: project.status as CommerceProjectStatus["state"],
      approvalState: project.approvalState as CommerceProjectStatus["approvalState"],
      preflightStatus: (report?.status as CommerceProjectStatus["preflightStatus"]) ?? "not_run",
      artifacts: artifacts.map((entry) => ({ type: entry.artifactType, href: entry.href }))
    };
  }

  async createQuoteLink(input: {
    projectId: string;
    externalQuoteRef: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  }) {
    await this.ensureSeeded();
    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) {
      return null;
    }
    const now = new Date();
    const existing = await this.prisma.commerceLink.findUnique({ where: { projectId: input.projectId } });
    const link = existing
      ? await this.prisma.commerceLink.update({
          where: { projectId: input.projectId },
          data: {
            externalQuoteRef: input.externalQuoteRef,
            externalCustomerRef: input.externalCustomerRef ?? existing.externalCustomerRef,
            state: "quote_linked",
            updatedAt: now
          }
        })
      : await this.prisma.commerceLink.create({
          data: {
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
          }
        });
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        commerceLinkId: link.id,
        updatedAt: now
      }
    });
    return mapCommerceLink(link);
  }

  async createOrderLink(input: {
    projectId: string;
    externalOrderRef: string;
    externalStoreId?: string;
    externalProductRef?: string;
    externalCustomerRef?: string | null;
    returnUrl?: string;
  }) {
    await this.ensureSeeded();
    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) {
      return null;
    }
    const now = new Date();
    const existing = await this.prisma.commerceLink.findUnique({ where: { projectId: input.projectId } });
    const link = existing
      ? await this.prisma.commerceLink.update({
          where: { projectId: input.projectId },
          data: {
            externalOrderRef: input.externalOrderRef,
            externalCustomerRef: input.externalCustomerRef ?? existing.externalCustomerRef,
            state: "order_linked",
            updatedAt: now
          }
        })
      : await this.prisma.commerceLink.create({
          data: {
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
          }
        });
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        commerceLinkId: link.id,
        status: "ordered",
        updatedAt: now
      }
    });
    return mapCommerceLink(link);
  }

  async getProjectArtifacts(projectId: string) {
    await this.ensureSeeded();
    return (await this.prisma.outputArtifact.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } })).map(mapArtifact);
  }

  async getArtifactByHref(href: string) {
    await this.ensureSeeded();
    const artifact = await this.prisma.outputArtifact.findUnique({ where: { href } });
    if (!artifact) {
      return null;
    }
    return {
      artifact: mapArtifact(artifact),
      filePath: artifactFilePathForHref(href)
    };
  }

  async getLatestPreflightReport(projectId: string) {
    await this.ensureSeeded();
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project?.latestReportId) {
      return null;
    }
    const report = await this.prisma.preflightReport.findUnique({ where: { id: project.latestReportId } });
    return report ? mapPreflightReport(report) : null;
  }

  private toProjectCreateInput(project: ProjectRecord) {
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      approvalState: project.approvalState,
      blueprintId: project.blueprintId,
      blueprintVersionId: project.blueprintVersionId,
      templateId: project.templateId,
      templateVersionId: project.templateVersionId,
      commerceLinkId: project.commerceLinkId,
      activeVersionId: project.activeVersionId,
      launchSessionId: project.launchSessionId,
      externalProductRef: project.externalProductRef,
      latestJobs: asJson(project.latestJobs),
      latestReportId: project.latestReportId,
      pricingSignals: asJson(project.pricingSignals),
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt)
    };
  }

  private toProjectUpdateInput(project: ProjectRecord) {
    return {
      title: project.title,
      status: project.status,
      approvalState: project.approvalState,
      blueprintId: project.blueprintId,
      blueprintVersionId: project.blueprintVersionId,
      templateId: project.templateId,
      templateVersionId: project.templateVersionId,
      commerceLinkId: project.commerceLinkId,
      activeVersionId: project.activeVersionId,
      launchSessionId: project.launchSessionId,
      externalProductRef: project.externalProductRef,
      latestJobs: asJson(project.latestJobs),
      latestReportId: project.latestReportId,
      pricingSignals: asJson(project.pricingSignals),
      updatedAt: new Date(project.updatedAt)
    };
  }

  private toProjectVersionCreateInput(version: ProjectVersionRecord) {
    return {
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      isFinal: version.isFinal,
      document: asJson(version.document),
      createdAt: new Date(version.createdAt)
    };
  }
}

let databaseStore: DatabaseRuntimeStore | null = null;

export const getDatabaseRuntimeStore = () => {
  if (!databaseStore) {
    databaseStore = new DatabaseRuntimeStore();
  }
  return databaseStore;
};
