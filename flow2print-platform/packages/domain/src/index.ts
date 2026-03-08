import { randomUUID } from "node:crypto";

import type { Flow2PrintDocument } from "@flow2print/design-document";
import type { LaunchSessionRequest } from "@flow2print/http-sdk";
import { defaultPricingSignals, type PricingSignals } from "@flow2print/pricing-signals";

export type BlueprintKind = "flat" | "apparel" | "packaging";
export type ProjectStatus = "draft" | "finalized" | "ordered" | "archived";
export type ApprovalState = "not_required" | "pending" | "approved" | "rejected";
export type OutputJobType = "preflight" | "preview" | "proof_pdf" | "production_pdf";
export type OutputJobStatus = "queued" | "running" | "succeeded" | "failed";
export type AssetKind = "image" | "svg" | "pdf" | "font" | "technical";
export type AssetProcessingStatus = "pending" | "processing" | "ready" | "failed";
export type AssetVariantKind = "thumb" | "web" | "normalized" | "woff2";
export type PreflightSeverity = "info" | "warning" | "blocking";
export type UserRole = "admin" | "manager" | "customer";
export type EmailTemplateKind =
  | "password_reset"
  | "welcome_admin"
  | "user_invite"
  | "account_created"
  | "project_finalized"
  | "approval_requested";
export type ApiTokenScope =
  | "admin:read"
  | "admin:write"
  | "users:read"
  | "users:write"
  | "catalog:read"
  | "catalog:write"
  | "projects:read"
  | "projects:write"
  | "assets:read"
  | "assets:write"
  | "commerce:read"
  | "commerce:write"
  | "mail:read"
  | "settings:read"
  | "settings:write";

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface RoleDefinitionRecord {
  id: UserRole;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  updatedAt: string;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  token: string;
  status: "pending" | "used";
  createdAt: string;
  expiresAt: string;
}

export interface ApiTokenRecord {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: ApiTokenScope[];
  status: "active" | "revoked";
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MailLogRecord {
  id: string;
  kind: EmailTemplateKind;
  to: string;
  subject: string;
  preview: string;
  html: string;
  createdAt: string;
}

export interface EmailTemplateRecord {
  id: string;
  kind: EmailTemplateKind;
  label: string;
  subject: string;
  bodyHtml: string;
  previewText: string;
  wrapperHeaderHtml: string;
  wrapperFooterHtml: string;
  updatedAt: string;
}

export interface SystemSettingsRecord {
  brandName: string;
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  salesEmail: string;
  supportPhone: string;
  mailFromName: string;
  mailFromAddress: string;
  replyToEmail: string;
  primaryColor: string;
  logoText: string;
  logoUrl: string;
  logoAssetId: string | null;
  portalAppUrl: string;
  designerAppUrl: string;
  adminAppUrl: string;
  commerceBaseUrl: string;
  publicApiUrl: string;
  defaultLocale: string;
  defaultTimezone: string;
  defaultCurrency: string;
  sessionTtlHours: number;
  passwordResetTtlMinutes: number;
  maxUploadMb: number;
  maxImageEdgePx: number;
  updatedAt: string;
}

export interface BlueprintSummary {
  id: string;
  displayName: string;
  kind: BlueprintKind;
  latestVersionId: string;
}

export interface TemplateSummary {
  id: string;
  displayName: string;
  description: string;
  blueprintId: string;
  status: "published" | "draft";
}

export interface LaunchSession {
  id: string;
  projectId: string;
  connectorType: "magento2";
  externalStoreId: string;
  externalProductRef: string;
  externalVariantRef?: string;
  customerEmail: string;
  isGuest: boolean;
  locale: string;
  currency: string;
  returnUrl: string;
  options: Record<string, string | number | boolean>;
  expiresAt: string;
  createdAt: string;
}

export interface CommerceLinkRecord {
  id: string;
  projectId: string;
  connectorType: "magento2";
  externalStoreId: string;
  externalProductRef: string;
  externalCustomerRef: string | null;
  externalQuoteRef: string | null;
  externalOrderRef: string | null;
  returnUrl: string;
  state: "launch_created" | "quote_linked" | "order_linked";
  createdAt: string;
  updatedAt: string;
}

export interface OutputJob {
  jobId: string;
  jobType: OutputJobType;
  status: OutputJobStatus;
}

export interface AssetRecord {
  id: string;
  tenantId: string;
  ownerIdentityId: string;
  kind: AssetKind;
  status: AssetProcessingStatus;
  filename: string;
  mimeType: string;
  originalObjectKey: string | null;
  normalizedObjectKey: string | null;
  sizeBytes: number | null;
  widthPx: number | null;
  heightPx: number | null;
  dpiX: number | null;
  dpiY: number | null;
  colorSpace: string | null;
  iccProfileRef: string | null;
  sha256: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface AssetVariantRecord {
  id: string;
  assetId: string;
  variantKind: AssetVariantKind;
  objectKey: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
  byteSize: number | null;
  createdAt: string;
}

export interface FontFamilyRecord {
  id: string;
  familyKey: string;
  displayName: string;
  source: "upload" | "system" | "google_cache";
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface FontFileRecord {
  id: string;
  fontFamilyId: string;
  assetId: string | null;
  fileKey: string;
  format: "ttf" | "otf" | "woff2";
  weight: string | null;
  style: string | null;
  createdAt: string;
}

export interface OutputArtifact {
  id: string;
  projectId: string;
  projectVersionId: string;
  artifactType: "preview_png" | "proof_pdf" | "production_pdf";
  href: string;
  createdAt: string;
}

export interface PreflightIssue {
  id: string;
  severity: PreflightSeverity;
  issueCode: string;
  message: string;
  surfaceKey: string;
}

export interface PreflightReport {
  id: string;
  projectId: string;
  projectVersionId: string;
  status: "pass" | "warn" | "fail";
  createdAt: string;
  issues: PreflightIssue[];
}

export interface ProjectRecord {
  id: string;
  title: string;
  status: ProjectStatus;
  approvalState: ApprovalState;
  blueprintId: string;
  blueprintVersionId: string;
  templateId: string | null;
  templateVersionId: string | null;
  commerceLinkId: string | null;
  activeVersionId: string;
  launchSessionId: string | null;
  externalProductRef: string;
  latestJobs: OutputJob[];
  latestReportId: string | null;
  pricingSignals: PricingSignals;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersionRecord {
  id: string;
  projectId: string;
  versionNumber: number;
  isFinal: boolean;
  document: Flow2PrintDocument;
  createdAt: string;
}

export interface CommerceProjectStatus {
  projectId: string;
  projectVersionId: string;
  status: ProjectStatus;
  state: ProjectStatus;
  approvalState: ApprovalState;
  preflightStatus: "pass" | "warn" | "fail" | "not_run";
  artifacts: Array<{ type: string; href: string }>;
}

export interface Flow2PrintState {
  blueprints: BlueprintSummary[];
  templates: TemplateSummary[];
  roles: RoleDefinitionRecord[];
  emailTemplates: EmailTemplateRecord[];
  systemSettings: SystemSettingsRecord;
  users: UserRecord[];
  apiTokens: ApiTokenRecord[];
  authSessions: AuthSessionRecord[];
  passwordResets: PasswordResetRecord[];
  mailLog: MailLogRecord[];
  launchSessions: LaunchSession[];
  commerceLinks: CommerceLinkRecord[];
  projects: ProjectRecord[];
  projectVersions: ProjectVersionRecord[];
  assets: AssetRecord[];
  assetVariants: AssetVariantRecord[];
  fontFamilies: FontFamilyRecord[];
  fontFiles: FontFileRecord[];
  outputArtifacts: OutputArtifact[];
  preflightReports: PreflightReport[];
}

export const seedBlueprints = (): BlueprintSummary[] => [
  {
    id: "bp_business_card",
    displayName: "Business Card",
    kind: "flat",
    latestVersionId: "bpv_business_card_v1"
  },
  {
    id: "bp_tshirt",
    displayName: "T-Shirt",
    kind: "apparel",
    latestVersionId: "bpv_tshirt_v1"
  },
  {
    id: "bp_carton",
    displayName: "Folding Carton",
    kind: "packaging",
    latestVersionId: "bpv_carton_v1"
  }
];

export const seedTemplates = (): TemplateSummary[] => [
  {
    id: "tpl_business_card_modern",
    displayName: "Modern Business Card",
    description: "Name-forward layout with a clear headline area and contact line.",
    blueprintId: "bp_business_card",
    status: "published"
  },
  {
    id: "tpl_business_card_minimal",
    displayName: "Minimal Contact Card",
    description: "Calm, compact layout with a smaller headline and more breathing room.",
    blueprintId: "bp_business_card",
    status: "published"
  },
  {
    id: "tpl_tshirt_simple",
    displayName: "Simple Shirt Print",
    description: "Centered front print with a lightweight title block.",
    blueprintId: "bp_tshirt",
    status: "published"
  },
  {
    id: "tpl_tshirt_bold",
    displayName: "Bold Chest Graphic",
    description: "Larger chest print area for statement graphics and short copy.",
    blueprintId: "bp_tshirt",
    status: "published"
  },
  {
    id: "tpl_carton_brand",
    displayName: "Brand Carton",
    description: "Front-focused carton layout with a headline and supporting panel.",
    blueprintId: "bp_carton",
    status: "published"
  },
  {
    id: "tpl_carton_information",
    displayName: "Information Carton",
    description: "Product-name layout with a secondary panel for details and notices.",
    blueprintId: "bp_carton",
    status: "published"
  }
];

export const seedEmailTemplates = (): EmailTemplateRecord[] => {
  const updatedAt = new Date().toISOString();
  const wrapperHeaderHtml =
    "<div style=\"padding:20px 24px;background:{{primaryColor}};color:#ffffff;font:700 18px/1.2 Arial,sans-serif;\">{{logoText}} · {{brandName}}</div>";
  const wrapperFooterHtml =
    "<div style=\"padding:18px 24px;border-top:1px solid #d8e0ea;color:#5e6b7c;font:400 13px/1.5 Arial,sans-serif;\">Need help? Contact <a href=\"mailto:{{supportEmail}}\">{{supportEmail}}</a>{%SUPPORT_PHONE%}.<br/>{{companyName}}<br/>{{companyAddress}}</div>"
      .replace("{%SUPPORT_PHONE%}", " or call {{supportPhone}}");
  return [
    {
      id: "emt_password_reset",
      kind: "password_reset",
      label: "Password reset",
      subject: "Reset your {{brandName}} password",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>Use the following token to reset your password:</p><p style=\"font-size:18px;font-weight:700;letter-spacing:0.04em;\">{{resetToken}}</p><p>If you did not request this change, you can ignore this email.</p>",
      previewText: "Use the reset token to update the password.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    },
    {
      id: "emt_welcome_admin",
      kind: "welcome_admin",
      label: "Admin welcome",
      subject: "Welcome to {{brandName}} Admin",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>Your administrator workspace is ready. Sign in to review templates, assets, users, and system settings.</p><p><a href=\"{{adminAppUrl}}\" style=\"display:inline-block;padding:12px 18px;background:{{primaryColor}};color:#ffffff;text-decoration:none;border-radius:8px;\">Open Admin Workspace</a></p>",
      previewText: "Your Flow2Print admin workspace is ready.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    },
    {
      id: "emt_user_invite",
      kind: "user_invite",
      label: "User invite",
      subject: "You were invited to {{brandName}}",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>You have been invited to collaborate in {{brandName}}.</p><p>Use the password reset link or token you received to activate your access and start working on projects.</p>",
      previewText: "You have been invited to Flow2Print.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    },
    {
      id: "emt_account_created",
      kind: "account_created",
      label: "Account created",
      subject: "Your {{brandName}} account is ready",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>Your account has been created successfully. You can now access your projects, output files, and reorder flows.</p><p><a href=\"{{portalAppUrl}}\" style=\"display:inline-block;padding:12px 18px;background:{{primaryColor}};color:#ffffff;text-decoration:none;border-radius:8px;\">Open Customer Workspace</a></p>",
      previewText: "Your Flow2Print account is ready.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    },
    {
      id: "emt_project_finalized",
      kind: "project_finalized",
      label: "Project finalized",
      subject: "Your {{brandName}} project is ready",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>Your project has been finalized and the current files are ready for review or production hand-off.</p><p>You can return to the portal to inspect previews and download outputs.</p>",
      previewText: "Your project has been finalized.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    },
    {
      id: "emt_approval_requested",
      kind: "approval_requested",
      label: "Approval requested",
      subject: "Approval required in {{brandName}}",
      bodyHtml:
        "<p>Hello {{recipientEmail}},</p><p>A project is waiting for your approval.</p><p>Open the workspace to review the latest proof, preflight status, and production files.</p><p><a href=\"{{portalAppUrl}}\" style=\"display:inline-block;padding:12px 18px;background:{{primaryColor}};color:#ffffff;text-decoration:none;border-radius:8px;\">Review project</a></p>",
      previewText: "A project is waiting for your approval.",
      wrapperHeaderHtml,
      wrapperFooterHtml,
      updatedAt
    }
  ];
};

export const seedRoleDefinitions = (): RoleDefinitionRecord[] => {
  const updatedAt = new Date().toISOString();

  return [
    {
      id: "admin",
      label: "Admin",
      description: "Full system access including users, settings, tokens, templates, and operational data.",
      permissions: ["*"],
      isSystem: true,
      updatedAt
    },
    {
      id: "manager",
      label: "Manager",
      description: "Operational access for projects, assets, commerce, and production-facing workflows.",
      permissions: ["projects:*", "assets:*", "commerce:*", "catalog:read", "mail:read"],
      isSystem: true,
      updatedAt
    },
    {
      id: "customer",
      label: "Customer",
      description: "End-user account for portal and project ownership without admin access.",
      permissions: ["projects:own", "assets:own"],
      isSystem: true,
      updatedAt
    }
  ];
};

export const seedSystemSettings = (): SystemSettingsRecord => {
  const updatedAt = new Date().toISOString();
  return {
    brandName: "Flow2Print",
    companyName: "Flow2Print",
    companyAddress: "Example Street 12\n10115 Berlin\nGermany",
    supportEmail: "support@flow2print.local",
    salesEmail: "sales@flow2print.local",
    supportPhone: "+49 30 1234567",
    mailFromName: "Flow2Print Support",
    mailFromAddress: "support@flow2print.local",
    replyToEmail: "support@flow2print.local",
    primaryColor: "#184a8c",
    logoText: "F2P",
    logoUrl: "",
    logoAssetId: null,
    portalAppUrl: "",
    designerAppUrl: "",
    adminAppUrl: "",
    commerceBaseUrl: "",
    publicApiUrl: "",
    defaultLocale: "en-US",
    defaultTimezone: "Europe/Berlin",
    defaultCurrency: "EUR",
    sessionTtlHours: 12,
    passwordResetTtlMinutes: 30,
    maxUploadMb: 50,
    maxImageEdgePx: 10000,
    updatedAt
  };
};

const demoPasswordHash = "hash:demo1234";

export const seedUsers = (): UserRecord[] => {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "usr_admin_demo",
      email: "demo@flow2print.local",
      displayName: "Demo Admin",
      role: "admin",
      passwordHash: demoPasswordHash,
      status: "active",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: "usr_customer_demo",
      email: "customer@flow2print.local",
      displayName: "Demo Customer",
      role: "customer",
      passwordHash: demoPasswordHash,
      status: "active",
      createdAt,
      updatedAt: createdAt
    }
  ];
};

export const defaultApiTokenScopes = (): ApiTokenScope[] => [
  "catalog:read",
  "projects:read",
  "projects:write",
  "assets:read",
  "assets:write",
  "commerce:read",
  "commerce:write"
];

export const hashPassword = (password: string) => `hash:${password}`;

export const verifyPassword = (password: string, passwordHash: string) => hashPassword(password) === passwordHash;

const blueprintForExternalProduct = (externalProductRef: string): BlueprintSummary => {
  const normalized = externalProductRef.toLowerCase();
  if (normalized.includes("shirt") || normalized.includes("tee")) {
    return seedBlueprints()[1];
  }
  if (normalized.includes("carton") || normalized.includes("box")) {
    return seedBlueprints()[2];
  }
  return seedBlueprints()[0];
};

const templateForBlueprint = (
  blueprintId: string,
  preferredTemplateId?: string | null,
  options?: { allowDefault?: boolean }
): TemplateSummary | null => {
  const templates = seedTemplates().filter((template) => template.blueprintId === blueprintId);
  if (preferredTemplateId === null) {
    return null;
  }
  if (preferredTemplateId) {
    return templates.find((template) => template.id === preferredTemplateId) ?? null;
  }
  if (options?.allowDefault === false) {
    return null;
  }
  return templates[0] ?? null;
};

const createTemplateSeedLayers = (params: {
  templateId: string | null;
  blueprintKind: BlueprintKind;
  safeBox: { x: number; y: number; width: number; height: number };
}) => {
  const { templateId, blueprintKind, safeBox } = params;

  const textLayer = (input: {
    name: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    letterSpacing?: number;
    variant?: string;
    textTransform?: "uppercase" | "none";
  }) => ({
    id: `lyr_${randomUUID()}`,
    type: "text" as const,
    name: input.name,
    visible: true,
    locked: false,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    opacity: 1,
    metadata: {
      text: input.text,
      color: input.color,
      fontSize: input.fontSize,
      fontWeight: input.fontWeight,
      textAlign: input.textAlign,
      letterSpacing: input.letterSpacing,
      variant: input.variant,
      textTransform: input.textTransform
    }
  });

  const shapeLayer = (input: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    variant?: string;
  }) => ({
    id: `lyr_${randomUUID()}`,
    type: "shape" as const,
    name: input.name,
    visible: true,
    locked: false,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    opacity: 1,
    metadata: { fill: input.fill, variant: input.variant }
  });

  if (!templateId) {
    return [];
  }

  if (blueprintKind === "flat") {
    if (templateId === "tpl_business_card_minimal") {
      return [
        textLayer({
          name: "Name",
          text: "Alex Morgan",
          x: safeBox.x + 4,
          y: safeBox.y + 6,
          width: safeBox.width - 8,
          height: 12
        }),
        textLayer({
          name: "Details",
          text: "Sales Director\nalex@example.com",
          x: safeBox.x + 4,
          y: safeBox.y + 22,
          width: safeBox.width - 8,
          height: 16
        })
      ];
    }

    return [
      textLayer({
        name: "Name: Alex Rivera",
        text: "ALEX RIVERA",
        x: safeBox.x + 40,
        y: safeBox.y + 8,
        width: 28,
        height: 9,
        color: "#1f2937",
        fontSize: 17,
        fontWeight: "700",
        textAlign: "right",
        letterSpacing: 0.4,
        textTransform: "uppercase"
      }),
      textLayer({
        name: "Title: Senior UI Designer",
        text: "SENIOR UI DESIGNER",
        x: safeBox.x + 40,
        y: safeBox.y + 19,
        width: 28,
        height: 7,
        color: "#3b82f6",
        fontSize: 9,
        fontWeight: "700",
        textAlign: "right",
        letterSpacing: 0.6,
        textTransform: "uppercase"
      }),
      shapeLayer({
        name: "Logo Placeholder",
        x: safeBox.x + 4,
        y: safeBox.y + 4,
        width: 12,
        height: 12,
        fill: "#dbe8ff",
        variant: "logo-placeholder"
      }),
      textLayer({
        name: "Contact Info",
        text: "hello@modernui.design\n+1 (555) 000-1234",
        x: safeBox.x + 9,
        y: safeBox.y + safeBox.height - 12,
        width: 37,
        height: 9,
        color: "#64748b",
        fontSize: 7.8,
        fontWeight: "500",
        textAlign: "left",
        variant: "contact-info",
        textTransform: "none"
      }),
      shapeLayer({
        name: "Accent Panel",
        x: safeBox.x + safeBox.width - 12,
        y: safeBox.y + 3,
        width: 10,
        height: safeBox.height - 6,
        fill: "#f3f7fd",
        variant: "accent-panel"
      })
    ];
  }

  if (blueprintKind === "apparel") {
    if (templateId === "tpl_tshirt_bold") {
      return [
        shapeLayer({
          name: "Graphic block",
          x: safeBox.x + safeBox.width * 0.16,
          y: safeBox.y + safeBox.height * 0.18,
          width: safeBox.width * 0.68,
          height: safeBox.height * 0.28,
          fill: "#dbe8ff"
        }),
        textLayer({
          name: "Headline",
          text: "SUMMER DROP",
          x: safeBox.x + safeBox.width * 0.2,
          y: safeBox.y + safeBox.height * 0.26,
          width: safeBox.width * 0.6,
          height: 28
        })
      ];
    }

    return [
      textLayer({
        name: "Front print",
        text: "Studio Line",
        x: safeBox.x + safeBox.width * 0.22,
        y: safeBox.y + safeBox.height * 0.26,
        width: safeBox.width * 0.56,
        height: 26
      })
    ];
  }

  if (templateId === "tpl_carton_information") {
    return [
      textLayer({
        name: "Product name",
        text: "Daily Granola",
        x: safeBox.x + 10,
        y: safeBox.y + 18,
        width: safeBox.width - 20,
        height: 18
      }),
      shapeLayer({
        name: "Info panel",
        x: safeBox.x + 10,
        y: safeBox.y + 56,
        width: safeBox.width - 20,
        height: 46,
        fill: "#eef3df"
      }),
      textLayer({
        name: "Info text",
        text: "400 g\nKeep dry\nRecyclable pack",
        x: safeBox.x + 16,
        y: safeBox.y + 64,
        width: safeBox.width - 32,
        height: 28
      })
    ];
  }

  return [
    shapeLayer({
      name: "Brand panel",
      x: safeBox.x + 12,
      y: safeBox.y + 16,
      width: safeBox.width - 24,
      height: 52,
      fill: "#dbe8ff"
    }),
    textLayer({
      name: "Brand",
      text: "North Valley Tea",
      x: safeBox.x + 18,
      y: safeBox.y + 26,
      width: safeBox.width - 36,
      height: 18
    }),
    textLayer({
      name: "Variant",
      text: "Mint Blend",
      x: safeBox.x + 18,
      y: safeBox.y + 52,
      width: safeBox.width - 36,
      height: 16
    })
  ];
};

export const createBaseDocument = (params: {
  projectId: string;
  projectVersionId: string;
  blueprintVersionId: string;
  templateVersionId: string | null;
  externalProductRef: string;
}): Flow2PrintDocument => {
  const blueprint = blueprintForExternalProduct(params.externalProductRef);
  const artboard =
    blueprint.kind === "flat"
      ? { width: 90, height: 50 }
      : blueprint.kind === "apparel"
        ? { width: 320, height: 380 }
        : { width: 210, height: 180 };

  const safeInset = blueprint.kind === "flat" ? 3 : blueprint.kind === "apparel" ? 18 : 10;
  const safeBox = {
    x: safeInset,
    y: safeInset,
    width: Math.max(18, artboard.width - safeInset * 2),
    height: Math.max(18, artboard.height - safeInset * 2)
  };

  return {
    schemaVersion: "1.0.0",
    projectId: params.projectId,
    projectVersionId: params.projectVersionId,
    tenantId: "org_public",
    blueprintVersionId: params.blueprintVersionId,
    templateVersionId: params.templateVersionId,
    locale: "en-US",
    currency: "USD",
    units: "mm",
    surfaces: [
      {
        surfaceId: blueprint.kind === "apparel" ? "front_zone" : "front",
        label: "Front",
        artboard,
        bleedBox: { x: 0, y: 0, width: artboard.width, height: artboard.height },
        safeBox,
        layers: createTemplateSeedLayers({
          templateId: params.templateVersionId,
          blueprintKind: blueprint.kind,
          safeBox
        }),
        flags: ["printable"]
      }
    ],
    assets: [],
    variables: {},
    metadata: {
      externalProductRef: params.externalProductRef,
      seededFrom: blueprint.kind
    }
  };
};

export const createProjectAggregate = (request: LaunchSessionRequest) => {
  const createdAt = new Date().toISOString();
  const launchSessionId = `lsn_${randomUUID()}`;
  const projectId = `prj_${randomUUID()}`;
  const projectVersionId = `prv_${randomUUID()}`;
  const blueprint = blueprintForExternalProduct(request.externalProductRef);
  const template = templateForBlueprint(blueprint.id, request.templateId, {
    allowDefault: request.templateId !== null
  });
  const document = createBaseDocument({
    projectId,
    projectVersionId,
    blueprintVersionId: blueprint.latestVersionId,
    templateVersionId: template?.id ?? null,
    externalProductRef: request.externalProductRef
  });

  const launchSession: LaunchSession = {
    id: launchSessionId,
    projectId,
    connectorType: request.connectorType,
    externalStoreId: request.externalStoreId,
    externalProductRef: request.externalProductRef,
    externalVariantRef: request.externalVariantRef,
    customerEmail: request.customer.email,
    isGuest: request.customer.isGuest,
    locale: request.locale,
    currency: request.currency,
    returnUrl: request.returnUrl,
    options: request.options,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt
  };

  const project: ProjectRecord = {
    id: projectId,
    title: blueprint.displayName,
    status: "draft",
    approvalState: "not_required",
    blueprintId: blueprint.id,
    blueprintVersionId: blueprint.latestVersionId,
    templateId: template?.id ?? null,
    templateVersionId: template?.id ?? null,
    commerceLinkId: `clk_${randomUUID()}`,
    activeVersionId: projectVersionId,
    launchSessionId,
    externalProductRef: request.externalProductRef,
    latestJobs: [],
    latestReportId: null,
    pricingSignals: defaultPricingSignals(),
    createdAt,
    updatedAt: createdAt
  };

  const projectVersion: ProjectVersionRecord = {
    id: projectVersionId,
    projectId,
    versionNumber: 1,
    isFinal: false,
    document,
    createdAt
  };

  const commerceLink: CommerceLinkRecord = {
    id: project.commerceLinkId!,
    projectId,
    connectorType: request.connectorType,
    externalStoreId: request.externalStoreId,
    externalProductRef: request.externalProductRef,
    externalCustomerRef: request.customer.externalCustomerRef ?? null,
    externalQuoteRef: null,
    externalOrderRef: null,
    returnUrl: request.returnUrl,
    state: "launch_created",
    createdAt,
    updatedAt: createdAt
  };

  return { launchSession, commerceLink, project, projectVersion };
};

export const cloneFinalizedProject = (project: ProjectRecord, version: ProjectVersionRecord) => {
  const now = new Date().toISOString();
  const newProjectId = `prj_${randomUUID()}`;
  const newVersionId = `prv_${randomUUID()}`;

  const newDocument: Flow2PrintDocument = {
    ...version.document,
    projectId: newProjectId,
    projectVersionId: newVersionId
  };

  const clonedProject: ProjectRecord = {
    ...project,
    id: newProjectId,
    status: "draft",
    approvalState: "not_required",
    activeVersionId: newVersionId,
    commerceLinkId: null,
    latestJobs: [],
    latestReportId: null,
    launchSessionId: null,
    createdAt: now,
    updatedAt: now
  };

  const clonedVersion: ProjectVersionRecord = {
    id: newVersionId,
    projectId: newProjectId,
    versionNumber: 1,
    isFinal: false,
    document: newDocument,
    createdAt: now
  };

  return { project: clonedProject, version: clonedVersion };
};

export const applyTemplateToProject = (params: {
  project: ProjectRecord;
  version: ProjectVersionRecord;
  templateId: string | null;
}): { project: ProjectRecord; version: ProjectVersionRecord } => {
  const template = params.templateId
    ? seedTemplates().find((entry) => entry.id === params.templateId) ?? null
    : null;
  const nextDocument = createBaseDocument({
    projectId: params.project.id,
    projectVersionId: params.version.id,
    blueprintVersionId: params.project.blueprintVersionId,
    templateVersionId: template?.id ?? null,
    externalProductRef: params.project.externalProductRef
  });

  return {
    project: {
      ...params.project,
      title: blueprintForExternalProduct(params.project.externalProductRef).displayName,
      templateId: template?.id ?? null,
      templateVersionId: template?.id ?? null,
      updatedAt: new Date().toISOString()
    },
    version: {
      ...params.version,
      document: nextDocument
    }
  };
};

export const finalizeProject = (project: ProjectRecord, currentVersion: ProjectVersionRecord, proofMode: "none" | "digital", approvalIntent: "auto" | "request") => {
  const now = new Date().toISOString();
  const finalVersionId = `prv_${randomUUID()}`;
  const finalDocument: Flow2PrintDocument = {
    ...currentVersion.document,
    projectVersionId: finalVersionId
  };
  const finalVersion: ProjectVersionRecord = {
    id: finalVersionId,
    projectId: project.id,
    versionNumber: currentVersion.versionNumber + 1,
    isFinal: true,
    document: finalDocument,
    createdAt: now
  };
  const updatedProject: ProjectRecord = {
    ...project,
    status: "finalized",
    approvalState: approvalIntent === "request" ? "pending" : "not_required",
    activeVersionId: finalVersionId,
    latestJobs: [
      { jobId: `job_${randomUUID()}`, jobType: "preflight", status: "queued" },
      { jobId: `job_${randomUUID()}`, jobType: "preview", status: "queued" },
      { jobId: `job_${randomUUID()}`, jobType: "production_pdf", status: "queued" },
      ...(proofMode === "digital" ? [{ jobId: `job_${randomUUID()}`, jobType: "proof_pdf" as const, status: "queued" as const }] : [])
    ],
    latestReportId: null,
    updatedAt: now
  };
  return { project: updatedProject, version: finalVersion };
};

export const createAssetRecord = (input: {
  filename: string;
  kind?: AssetKind;
  mimeType?: string;
  status?: AssetProcessingStatus;
  originalObjectKey?: string | null;
  normalizedObjectKey?: string | null;
  sizeBytes?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  dpiX?: number | null;
  dpiY?: number | null;
  colorSpace?: string | null;
  iccProfileRef?: string | null;
  sha256?: string | null;
}): AssetRecord => ({
  id: `ast_${randomUUID()}`,
  tenantId: "org_public",
  ownerIdentityId: "usr_demo",
  kind: input.kind ?? "image",
  status: input.status ?? "ready",
  filename: input.filename,
  mimeType: input.mimeType ?? "image/png",
  originalObjectKey: input.originalObjectKey ?? null,
  normalizedObjectKey: input.normalizedObjectKey ?? null,
  sizeBytes: input.sizeBytes ?? null,
  widthPx: input.widthPx ?? null,
  heightPx: input.heightPx ?? null,
  dpiX: input.dpiX ?? null,
  dpiY: input.dpiY ?? null,
  colorSpace: input.colorSpace ?? null,
  iccProfileRef: input.iccProfileRef ?? null,
  sha256: input.sha256 ?? null,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
});

export const createProductionArtifacts = (project: ProjectRecord, version: ProjectVersionRecord): OutputArtifact[] => {
  const createdAt = new Date().toISOString();
  const baseHref = `/artifacts/${project.id}/${version.id}`;
  const artifacts: OutputArtifact[] = [
    {
      id: `art_${randomUUID()}`,
      projectId: project.id,
      projectVersionId: version.id,
      artifactType: "preview_png",
      href: `${baseHref}/preview.png`,
      createdAt
    },
    {
      id: `art_${randomUUID()}`,
      projectId: project.id,
      projectVersionId: version.id,
      artifactType: "production_pdf",
      href: `${baseHref}/production.pdf`,
      createdAt
    }
  ];

  if (project.latestJobs.some((job) => job.jobType === "proof_pdf")) {
    artifacts.push({
      id: `art_${randomUUID()}`,
      projectId: project.id,
      projectVersionId: version.id,
      artifactType: "proof_pdf",
      href: `${baseHref}/proof.pdf`,
      createdAt
    });
  }

  return artifacts;
};

export const createPreflightReport = (project: ProjectRecord, version: ProjectVersionRecord): PreflightReport => {
  const blockingIssues = version.document.surfaces.some((surface) => surface.layers.length === 0);
  return {
    id: `pfr_${randomUUID()}`,
    projectId: project.id,
    projectVersionId: version.id,
    status: blockingIssues ? "warn" : "pass",
    createdAt: new Date().toISOString(),
    issues: blockingIssues
      ? [
          {
            id: `pfi_${randomUUID()}`,
            severity: "warning",
            issueCode: "SURFACE_EMPTY",
            message: "Surface has no layers yet; verify that this is intentional.",
            surfaceKey: version.document.surfaces[0]?.surfaceId ?? "unknown"
          }
        ]
      : []
  };
};

export const createEmptyState = (): Flow2PrintState => ({
  blueprints: seedBlueprints(),
  templates: seedTemplates(),
  roles: seedRoleDefinitions(),
  emailTemplates: seedEmailTemplates(),
  systemSettings: seedSystemSettings(),
  users: seedUsers(),
  apiTokens: [],
  authSessions: [],
  passwordResets: [],
  mailLog: [],
  launchSessions: [],
  commerceLinks: [],
  projects: [],
  projectVersions: [],
  assets: [],
  assetVariants: [],
  fontFamilies: [],
  fontFiles: [],
  outputArtifacts: [],
  preflightReports: []
});
