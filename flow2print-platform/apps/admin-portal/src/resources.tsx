import type { ReactNode } from "react";

import {
  AppstoreOutlined,
  DashboardOutlined,
  GlobalOutlined,
  FileImageOutlined,
  FileTextOutlined,
  KeyOutlined,
  MailOutlined,
  ProfileOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";

export type AdminResourceName =
  | "projects"
  | "templates"
  | "blueprints"
  | "assets"
  | "users"
  | "api-tokens"
  | "mail-log"
  | "email-templates"
  | "settings";
export type FieldType = "text" | "textarea" | "select" | "multiselect" | "email" | "password" | "number" | "date" | "status";
export type OptionSource = "blueprints" | "templates";

export interface SelectOption {
  label: string;
  value: string;
}

export interface ResourceField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  searchable?: boolean;
  list?: boolean;
  form?: boolean;
  show?: boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  optionSource?: OptionSource;
  placeholder?: string;
  extra?: string;
}

export interface AdminResourceConfig {
  name: AdminResourceName;
  label: string;
  singularLabel: string;
  description: string;
  listPath: string;
  createPath?: string;
  editPath?: string;
  showPath?: string;
  icon: ReactNode;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  emptyTitle: string;
  emptyDescription: string;
  fields: ResourceField[];
}

export const adminResources: AdminResourceConfig[] = [
  {
    name: "projects",
    label: "Projects",
    singularLabel: "Project",
    description: "Monitor live design projects, inspect print readiness, and keep stale work under control.",
    listPath: "/projects",
    createPath: "/projects/create",
    editPath: "/projects/edit/:id",
    showPath: "/projects/show/:id",
    icon: <ProfileOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No projects yet",
    emptyDescription: "Projects appear here after a designer launch or a commerce hand-off.",
    fields: [
      { key: "title", label: "Title", type: "text", searchable: true, list: true, form: true, show: true, required: true },
      {
        key: "blueprintId",
        label: "Blueprint",
        type: "select",
        list: true,
        form: true,
        show: true,
        required: true,
        optionSource: "blueprints"
      },
      {
        key: "templateId",
        label: "Starting template",
        type: "select",
        list: true,
        form: true,
        show: true,
        optionSource: "templates",
        placeholder: "Optional"
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Finalized", value: "finalized" },
          { label: "Ordered", value: "ordered" },
          { label: "Archived", value: "archived" }
        ]
      },
      { key: "approvalState", label: "Approval", type: "status", list: true, show: true },
      { key: "preflightStatus", label: "Preflight", type: "status", list: true, show: true },
      { key: "artifactCount", label: "Files", type: "number", list: true, show: true },
      { key: "ownerIdentityId", label: "Owner", type: "text", list: true, show: true },
      { key: "channel", label: "Channel", type: "text", list: true, show: true },
      { key: "createdAt", label: "Created", type: "date", list: true, show: true },
      { key: "updatedAt", label: "Updated", type: "date", list: true, show: true }
    ]
  },
  {
    name: "templates",
    label: "Templates",
    singularLabel: "Template",
    description: "Manage starter layouts and keep product-specific templates clean and reusable.",
    listPath: "/templates",
    createPath: "/templates/create",
    editPath: "/templates/edit/:id",
    showPath: "/templates/show/:id",
    icon: <FileTextOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No templates configured",
    emptyDescription: "Create templates to give customers a controlled starting point.",
    fields: [
      {
        key: "displayName",
        label: "Template name",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Modern business card"
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Describe what this template is for."
      },
      {
        key: "blueprintId",
        label: "Blueprint",
        type: "select",
        list: true,
        form: true,
        show: true,
        required: true,
        optionSource: "blueprints"
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" }
        ]
      }
    ]
  },
  {
    name: "blueprints",
    label: "Blueprints",
    singularLabel: "Blueprint",
    description: "Define which product types exist and which geometry or print context they belong to.",
    listPath: "/blueprints",
    createPath: "/blueprints/create",
    editPath: "/blueprints/edit/:id",
    showPath: "/blueprints/show/:id",
    icon: <AppstoreOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No blueprints configured",
    emptyDescription: "Create blueprint definitions for flat print, apparel, or packaging products.",
    fields: [
      {
        key: "displayName",
        label: "Blueprint name",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Business Card"
      },
      {
        key: "kind",
        label: "Product kind",
        type: "select",
        list: true,
        form: true,
        show: true,
        required: true,
        options: [
          { label: "Flat print", value: "flat" },
          { label: "Apparel", value: "apparel" },
          { label: "Packaging", value: "packaging" }
        ]
      },
      { key: "latestVersionId", label: "Latest version", type: "text", list: true, show: true, disabled: true }
    ]
  },
  {
    name: "assets",
    label: "Assets",
    singularLabel: "Asset",
    description: "Keep reusable art files, uploads, and technical resources organized.",
    listPath: "/assets",
    createPath: "/assets/create",
    editPath: "/assets/edit/:id",
    showPath: "/assets/show/:id",
    icon: <FileImageOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No assets yet",
    emptyDescription: "Create or upload reusable media so templates and projects can reference them.",
    fields: [
      {
        key: "filename",
        label: "Filename",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "logo.svg"
      },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Image", value: "image" },
          { label: "SVG", value: "svg" },
          { label: "PDF", value: "pdf" },
          { label: "Font", value: "font" },
          { label: "Technical", value: "technical" }
        ]
      },
      { key: "mimeType", label: "MIME type", type: "text", searchable: true, list: true, form: true, show: true },
      { key: "widthPx", label: "Width", type: "number", list: true, form: true, show: true },
      { key: "heightPx", label: "Height", type: "number", list: true, form: true, show: true }
    ]
  },
  {
    name: "users",
    label: "Users",
    singularLabel: "User",
    description: "Manage operator and customer access without leaving the workspace.",
    listPath: "/users",
    createPath: "/users/create",
    editPath: "/users/edit/:id",
    showPath: "/users/show/:id",
    icon: <TeamOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No users yet",
    emptyDescription: "Invite administrators, managers, or customers to the platform.",
    fields: [
      {
        key: "displayName",
        label: "Display name",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Jane Operator"
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "jane@example.com"
      },
      {
        key: "role",
        label: "Role",
        type: "select",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Admin", value: "admin" },
          { label: "Manager", value: "manager" },
          { label: "Customer", value: "customer" }
        ]
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Disabled", value: "disabled" }
        ]
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        form: true,
        required: true,
        createOnly: true,
        placeholder: "Set an initial password"
      },
      {
        key: "password",
        label: "New password",
        type: "password",
        form: true,
        editOnly: true,
        placeholder: "Leave blank to keep the current password"
      },
      { key: "createdAt", label: "Created", type: "date", list: true, show: true, disabled: true },
      { key: "updatedAt", label: "Updated", type: "date", list: true, show: true, disabled: true }
    ]
  },
  {
    name: "api-tokens",
    label: "API Tokens",
    singularLabel: "API token",
    description: "Issue scoped bearer tokens for commerce and backend integrations without sharing user sessions.",
    listPath: "/api-tokens",
    createPath: "/api-tokens/create",
    editPath: "/api-tokens/edit/:id",
    showPath: "/api-tokens/show/:id",
    icon: <KeyOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No API tokens yet",
    emptyDescription: "Create scoped tokens for Magento, automation, or internal service calls.",
    fields: [
      {
        key: "label",
        label: "Label",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Magento connector"
      },
      {
        key: "tokenPrefix",
        label: "Token prefix",
        type: "text",
        list: true,
        show: true
      },
      {
        key: "scopes",
        label: "Scopes",
        type: "multiselect",
        list: true,
        form: true,
        show: true,
        required: true,
        options: [
          { label: "Admin read", value: "admin:read" },
          { label: "Admin write", value: "admin:write" },
          { label: "Users read", value: "users:read" },
          { label: "Users write", value: "users:write" },
          { label: "Catalog read", value: "catalog:read" },
          { label: "Catalog write", value: "catalog:write" },
          { label: "Projects read", value: "projects:read" },
          { label: "Projects write", value: "projects:write" },
          { label: "Assets read", value: "assets:read" },
          { label: "Assets write", value: "assets:write" },
          { label: "Commerce read", value: "commerce:read" },
          { label: "Commerce write", value: "commerce:write" },
          { label: "Mail read", value: "mail:read" },
          { label: "Settings read", value: "settings:read" },
          { label: "Settings write", value: "settings:write" }
        ]
      },
      {
        key: "status",
        label: "Status",
        type: "status",
        list: true,
        form: true,
        show: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Revoked", value: "revoked" }
        ]
      },
      {
        key: "expiresAt",
        label: "Expires at",
        type: "text",
        form: true,
        show: true,
        placeholder: "2026-12-31T23:59:59.000Z",
        extra: "Use an ISO timestamp or leave empty for no expiry."
      },
      { key: "lastUsedAt", label: "Last used", type: "date", list: true, show: true },
      { key: "createdAt", label: "Created", type: "date", list: true, show: true },
      { key: "updatedAt", label: "Updated", type: "date", show: true }
    ]
  },
  {
    name: "email-templates",
    label: "Email Templates",
    singularLabel: "Email template",
    description: "Manage system email content with subject, body HTML, and preview text.",
    listPath: "/email-templates",
    createPath: "/email-templates/create",
    editPath: "/email-templates/edit/:id",
    showPath: "/email-templates/show/:id",
    icon: <GlobalOutlined />,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    emptyTitle: "No email templates configured",
    emptyDescription: "Create system-managed email templates and preview them before sending.",
    fields: [
      {
        key: "label",
        label: "Template label",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Password reset"
      },
      {
        key: "kind",
        label: "Template kind",
        type: "select",
        list: true,
        form: true,
        show: true,
        required: true,
        options: [{ label: "Password reset", value: "password_reset" }]
      },
      {
        key: "subject",
        label: "Subject",
        type: "text",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Reset your {{brandName}} password"
      },
      {
        key: "bodyHtml",
        label: "Body HTML",
        type: "textarea",
        list: false,
        form: true,
        show: false,
        required: true,
        placeholder: "<p>Hello {{recipientEmail}}</p>",
        extra: "Supports {{brandName}}, {{logoText}}, {{recipientEmail}}, {{resetToken}}, {{supportEmail}}, and footer/header placeholders from Settings."
      },
      {
        key: "previewText",
        label: "Preview text",
        type: "textarea",
        searchable: true,
        list: true,
        form: true,
        show: true,
        required: true,
        placeholder: "Use the reset token to update the password."
      },
      { key: "updatedAt", label: "Updated", type: "date", list: true, show: true }
    ]
  },
  {
    name: "mail-log",
    label: "Mail Log",
    singularLabel: "Mail item",
    description: "Inspect outgoing system mail, including password reset messages.",
    listPath: "/mail-log",
    showPath: "/mail-log/show/:id",
    icon: <MailOutlined />,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    emptyTitle: "No mail activity yet",
    emptyDescription: "Mail entries appear here after password resets or future notification flows.",
    fields: [
      { key: "kind", label: "Kind", type: "status", list: true, show: true },
      { key: "to", label: "Recipient", type: "email", searchable: true, list: true, show: true },
      { key: "subject", label: "Subject", type: "text", searchable: true, list: true, show: true },
      { key: "preview", label: "Preview", type: "textarea", searchable: true, list: true, show: true },
      { key: "html", label: "HTML", type: "textarea", show: false },
      { key: "createdAt", label: "Created", type: "date", list: true, show: true }
    ]
  },
  {
    name: "settings",
    label: "Settings",
    singularLabel: "Setting",
    description: "Configure global system values, branding, and mail wrapper templates.",
    listPath: "/settings",
    showPath: "/settings",
    icon: <SettingOutlined />,
    canCreate: false,
    canEdit: true,
    canDelete: false,
    emptyTitle: "Settings not available",
    emptyDescription: "System settings will appear here when the API is connected.",
    fields: [
      { key: "brandName", label: "Brand name", type: "text", form: true, show: true, required: true },
      { key: "companyName", label: "Company name", type: "text", form: true, show: true, required: true },
      { key: "companyAddress", label: "Company address", type: "textarea", form: true, show: true, required: true },
      { key: "supportEmail", label: "Support email", type: "email", form: true, show: true, required: true },
      { key: "mailFromName", label: "Mail from name", type: "text", form: true, show: true, required: true },
      { key: "mailFromAddress", label: "Mail from address", type: "email", form: true, show: true, required: true },
      { key: "primaryColor", label: "Primary color", type: "text", form: true, show: true, required: true },
      { key: "logoText", label: "Logo text", type: "text", form: true, show: true, required: true },
      { key: "portalAppUrl", label: "Portal URL", type: "text", form: true, show: true },
      { key: "designerAppUrl", label: "Designer URL", type: "text", form: true, show: true },
      { key: "adminAppUrl", label: "Admin URL", type: "text", form: true, show: true },
      { key: "commerceBaseUrl", label: "Commerce URL", type: "text", form: true, show: true },
      { key: "defaultLocale", label: "Default locale", type: "text", form: true, show: true, required: true },
      { key: "defaultTimezone", label: "Default timezone", type: "text", form: true, show: true, required: true },
      { key: "mailHeaderHtml", label: "Mail header HTML", type: "textarea", form: true, show: true, required: true },
      { key: "mailFooterHtml", label: "Mail footer HTML", type: "textarea", form: true, show: true, required: true },
      { key: "updatedAt", label: "Updated", type: "date", show: true }
    ]
  }
];

export const dashboardNavItem = {
  key: "/dashboard",
  icon: <DashboardOutlined />,
  label: "Dashboard"
};

export const accountNavItem = {
  key: "/account",
  icon: <UserOutlined />,
  label: "Account"
};

export const resourceRouteLookup = adminResources.reduce<Partial<Record<AdminResourceName, AdminResourceConfig>>>((acc, resource) => {
  acc[resource.name] = resource;
  return acc;
}, {}) as Record<AdminResourceName, AdminResourceConfig>;
