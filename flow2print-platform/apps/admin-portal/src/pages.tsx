import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  type TableColumnsType,
  Tag,
  Typography
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MailOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined
} from "@ant-design/icons";

import { authProvider } from "./providers/authProvider.js";
import { buildHeaders, requestJson, readSessionToken, resolveApiUrl, resolveDesignerUrl } from "./providers/api.js";
import {
  adminResources,
  resourceRouteLookup,
  type AdminResourceConfig,
  type AdminResourceName,
  type ResourceField
} from "./resources.js";

type AdminRecord = Record<string, unknown> & { id: string };
type BlueprintOption = { id: string; displayName: string };
type TemplateOption = { id: string; displayName: string; blueprintId: string };
type AssetOption = { id: string; filename: string };
type FontFamilyOption = { id: string; displayName: string };
type RoleOption = { id: string; label: string };
type SystemInfoResponse = {
  runtime: {
    framework: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    timezone: string;
    now: string;
    uptimeSeconds: number;
  };
  persistence: {
    engine: string;
    databaseUrlConfigured: boolean;
    dataDir: string | null;
  };
  applications: {
    portalAppUrl: string | null;
    designerAppUrl: string | null;
    adminAppUrl: string | null;
    commerceBaseUrl: string | null;
    publicApiUrl: string | null;
  };
  limits: {
    maxUploadMb: number;
    maxImageEdgePx: number;
    sessionTtlHours: number;
    passwordResetTtlMinutes: number;
  };
  catalog: {
    projects: number;
    templates: number;
    blueprints: number;
    assets: number;
    users: number;
    emailTemplates: number;
    apiTokens: number;
  };
};
type CrudResourceName = Exclude<AdminResourceName, "overview" | "account">;

const { Title, Paragraph, Text } = Typography;
const FILTERABLE_LIST_FIELD_TYPES = new Set(["status", "select"]);

const statusColors: Record<string, string> = {
  draft: "gold",
  finalized: "blue",
  ordered: "green",
  archived: "default",
  active: "green",
  disabled: "red",
  published: "green",
  flat: "blue",
  apparel: "purple",
  packaging: "orange",
  pass: "green",
  warn: "gold",
  fail: "red",
  pending: "gold",
  used: "blue",
  password_reset: "blue",
  true: "blue",
  false: "default"
};

const endpointMap: Record<AdminResourceName, string> = {
  projects: "projects",
  templates: "templates",
  blueprints: "blueprints",
  assets: "assets",
  "asset-variants": "asset-variants",
  "font-families": "font-families",
  "font-files": "font-files",
  users: "users",
  roles: "roles",
  "api-tokens": "api-tokens",
  "mail-log": "mail-log",
  "email-templates": "email-templates",
  settings: "settings"
};

const formatDate = (value: unknown) => {
  if (!value || typeof value !== "string") {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatBytes = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatValue = (
  field: ResourceField,
  value: unknown,
  blueprintMap: Record<string, string>,
  templateMap: Record<string, string>,
  roleMap: Record<string, string>,
  assetMap: Record<string, string> = {},
  fontFamilyMap: Record<string, string> = {}
) => {
  if (field.key === "blueprintId" && typeof value === "string") {
    return blueprintMap[value] ?? value;
  }

  if (field.key === "templateId" && typeof value === "string") {
    return templateMap[value] ?? value;
  }

  if (field.key === "role" && typeof value === "string") {
    return roleMap[value] ?? value;
  }

  if (field.key === "assetId" && typeof value === "string") {
    return assetMap[value] ?? value;
  }

  if (field.key === "fontFamilyId" && typeof value === "string") {
    return fontFamilyMap[value] ?? value;
  }

  if (field.type === "date") {
    return formatDate(value);
  }

  if (field.key === "sizeBytes" || field.key === "byteSize") {
    return formatBytes(value);
  }

  if (field.type === "status") {
    const normalized = typeof value === "boolean" ? String(value) : typeof value === "string" ? value : "";
    const text = normalized ? normalized.replaceAll("_", " ") : "—";
    const color = normalized ? statusColors[normalized] ?? "default" : "default";
    return <Tag color={color}>{text}</Tag>;
  }

  if (field.type === "textarea") {
    return (
      <div className="admin-pre-wrap">
        {typeof value === "string" && value.trim() ? value : "—"}
      </div>
    );
  }

  if (field.type === "multiselect" && Array.isArray(value)) {
    if (!value.length) {
      return "—";
    }

    return (
      <Space wrap size={[4, 4]}>
        {value.map((entry) => (
          <Tag key={`${field.key}-${String(entry)}`}>{String(entry)}</Tag>
        ))}
      </Space>
    );
  }

  if (value === null || typeof value === "undefined" || value === "") {
    return "—";
  }

  return String(value);
};

const getOptionLabel = (field: ResourceField, value: unknown, blueprints: BlueprintOption[], roles: RoleOption[]) => {
  if (field.optionSource === "blueprints") {
    return blueprints.find((item) => item.id === value)?.displayName ?? value;
  }
  if (field.optionSource === "roles") {
    return roles.find((item) => item.id === value)?.label ?? value;
  }
  return field.options?.find((option) => option.value === value)?.label ?? value;
};

const getAssetLabel = (record: AdminRecord) => String(record.filename ?? record.id);
const getFontFamilyLabel = (record: AdminRecord) => String(record.displayName ?? record.familyKey ?? record.id);

const buildResourceUrl = (resource: AdminResourceName, id?: string) =>
  id ? `/v1/${endpointMap[resource]}/${id}` : `/v1/${endpointMap[resource]}`;

const requestJsonWithTimeout = async <T,>(input: string, init?: RequestInit, timeoutMs = 1500) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await requestJson<T>(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timer);
  }
};

const resolveProjectDesignerHref = (record: AdminRecord) => {
  const projectId = String(record.id ?? "");
  if (!projectId) {
    return resolveDesignerUrl("/designer");
  }

  return resolveDesignerUrl(`/designer/project/${projectId}`);
};

const loadList = async (resource: AdminResourceName) => {
  const payload = await requestJson<{ docs: AdminRecord[] }>(buildResourceUrl(resource));
  return payload.docs ?? [];
};

const loadOne = async (resource: AdminResourceName, id: string) => {
  try {
    return await requestJsonWithTimeout<AdminRecord>(buildResourceUrl(resource, id));
  } catch (error) {
    if (resource === "settings") {
      throw error;
    }
  }

  const docs = await loadList(resource);
  const record = docs.find((item) => String(item.id) === String(id));
  if (!record) {
    throw new Error(`${resource}_not_found`);
  }
  return record;
};

const useBlueprintOptions = () => {
  const [blueprints, setBlueprints] = useState<BlueprintOption[]>([]);

  useEffect(() => {
    let active = true;
    loadList("blueprints")
      .then((records) => {
        if (active) {
          setBlueprints(
            records.map((record) => ({
              id: String(record.id),
              displayName: String(record.displayName ?? record.id)
            }))
          );
        }
      })
      .catch(() => {
        if (active) {
          setBlueprints([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return blueprints;
};

const useTemplateOptions = (blueprintId?: string | null) => {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    let active = true;
    loadList("templates")
      .then((records) => {
        if (active) {
          setTemplates(
            records.map((record) => ({
              id: String(record.id),
              displayName: String(record.displayName ?? record.id),
              blueprintId: String(record.blueprintId ?? "")
            }))
          );
        }
      })
      .catch(() => {
        if (active) {
          setTemplates([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => (blueprintId ? templates.filter((entry) => entry.blueprintId === blueprintId) : templates),
    [blueprintId, templates]
  );
};

const useRoleOptions = () => {
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    let active = true;
    loadList("roles")
      .then((records) => {
        if (active) {
          setRoles(
            records.map((record) => ({
              id: String(record.id),
              label: String(record.label ?? record.id)
            }))
          );
        }
      })
      .catch(() => {
        if (active) {
          setRoles([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return roles;
};

const useAssetOptions = () => {
  const [assets, setAssets] = useState<AssetOption[]>([]);

  useEffect(() => {
    let active = true;
    loadList("assets")
      .then((records) => {
        if (active) {
          setAssets(records.map((record) => ({ id: String(record.id), filename: getAssetLabel(record) })));
        }
      })
      .catch(() => {
        if (active) {
          setAssets([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return assets;
};

const useFontFamilyOptions = () => {
  const [families, setFamilies] = useState<FontFamilyOption[]>([]);

  useEffect(() => {
    let active = true;
    loadList("font-families")
      .then((records) => {
        if (active) {
          setFamilies(records.map((record) => ({ id: String(record.id), displayName: getFontFamilyLabel(record) })));
        }
      })
      .catch(() => {
        if (active) {
          setFamilies([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return families;
};

const useSystemSettings = () => {
  const [settings, setSettings] = useState<AdminRecord | null>(null);

  useEffect(() => {
    let active = true;
    requestJson<AdminRecord>("/v1/settings")
      .then((payload) => {
        if (active) {
          setSettings(payload);
        }
      })
      .catch(() => {
        if (active) {
          setSettings(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return settings;
};

const useEmailPreview = (templateId: string | null) => {
  const [preview, setPreview] = useState<{ subject: string; html: string; previewText: string } | null>(null);

  useEffect(() => {
    if (!templateId) {
      setPreview(null);
      return;
    }

    let active = true;
    requestJson<{ subject: string; html: string; previewText: string }>(`/v1/email-templates/${templateId}/preview`)
      .then((payload) => {
        if (active) {
          setPreview(payload);
        }
      })
      .catch(() => {
        if (active) {
          setPreview(null);
        }
      });

    return () => {
      active = false;
    };
  }, [templateId]);

  return preview;
};

const useEmailTemplateDraftPreview = ({
  enabled,
  subject,
  bodyHtml,
  previewText,
  wrapperHeaderHtml,
  wrapperFooterHtml,
  settings
}: {
  enabled: boolean;
  subject?: string;
  bodyHtml?: string;
  previewText?: string;
  wrapperHeaderHtml?: string;
  wrapperFooterHtml?: string;
  settings?: Record<string, unknown>;
}) => {
  const [preview, setPreview] = useState<{ subject: string; html: string; previewText: string } | null>(null);

  useEffect(() => {
    if (!enabled || !subject || !bodyHtml || !previewText || !wrapperHeaderHtml || !wrapperFooterHtml) {
      setPreview(null);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      void requestJson<{ subject: string; html: string; previewText: string }>("/v1/email-templates/preview", {
        method: "POST",
        body: JSON.stringify({
          subject,
          bodyHtml,
          previewText,
          wrapperHeaderHtml,
          wrapperFooterHtml,
          settings
        })
      })
        .then((payload) => {
          if (active) {
            setPreview(payload);
          }
        })
        .catch(() => {
          if (active) {
            setPreview(null);
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [enabled, subject, bodyHtml, previewText, wrapperHeaderHtml, wrapperFooterHtml, JSON.stringify(settings ?? {})]);

  return preview;
};

const SectionIntro = ({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) => (
  <div className="admin-section-intro">
    <div>
      <Title level={2}>{title}</Title>
      <Paragraph>{description}</Paragraph>
    </div>
    {action ? <div className="admin-section-action">{action}</div> : null}
  </div>
);

const countProjectDocumentObjects = (record: AdminRecord) => {
  const document = (record.document ?? null) as { surfaces?: Array<{ layers?: unknown[] }>; assets?: unknown[] } | null;
  const surfaces = Array.isArray(document?.surfaces) ? document.surfaces : [];
  const layers = surfaces.reduce((total, surface) => total + (Array.isArray(surface.layers) ? surface.layers.length : 0), 0);
  const assets = Array.isArray(document?.assets) ? document.assets.length : 0;

  return {
    surfaces: surfaces.length,
    layers,
    assets
  };
};

const buildColumns = (
  resource: AdminResourceConfig,
  blueprintMap: Record<string, string>,
  templateMap: Record<string, string>,
  roleMap: Record<string, string>,
  assetMap: Record<string, string>,
  fontFamilyMap: Record<string, string>,
  onDelete: (record: AdminRecord) => Promise<void>,
  deletingId: string | null
): TableColumnsType<AdminRecord> => {
  const listFields = resource.fields.filter((field: ResourceField) => field.list);

  const columns: TableColumnsType<AdminRecord> = listFields.map((field: ResourceField) => ({
    title: field.label,
    dataIndex: field.key,
    key: field.key,
    render: (_: unknown, record: AdminRecord) =>
      formatValue(field, record[field.key], blueprintMap, templateMap, roleMap, assetMap, fontFamilyMap)
  }));

  columns.push({
    title: "",
    key: "actions",
    width: 320,
    fixed: "right",
    render: (_: unknown, record: AdminRecord) => (
      <div className="admin-table-actions">
        {resource.showPath ? (
          <Link to={`${resource.listPath.replace(/\/$/, "")}/show/${record.id}`}>
            <Button icon={<EyeOutlined />} size="small">
              Open
            </Button>
          </Link>
        ) : null}
        {resource.canEdit && resource.editPath ? (
          <Link to={`${resource.listPath.replace(/\/$/, "")}/edit/${record.id}`}>
            <Button icon={<EditOutlined />} size="small">
              Edit
            </Button>
          </Link>
        ) : null}
        {resource.name === "projects" ? (
          <Button size="small" href={resolveProjectDesignerHref(record)} target="_blank" rel="noreferrer">
            Open designer
          </Button>
        ) : null}
        {resource.canDelete ? (
          <Popconfirm
            title={`Delete ${resource.singularLabel.toLowerCase()}?`}
            description="This action cannot be undone."
            onConfirm={() => onDelete(record)}
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ) : null}
      </div>
    )
  });

  return columns;
};

const renderInput = (
  field: ResourceField,
  blueprintOptions: BlueprintOption[],
  templateOptions: TemplateOption[] = [],
  roleOptions: RoleOption[] = [],
  assetOptions: AssetOption[] = [],
  fontFamilyOptions: FontFamilyOption[] = []
) => {
  switch (field.type) {
    case "textarea":
      return <Input.TextArea rows={4} placeholder={field.placeholder} />;
    case "select":
    case "multiselect":
    case "status":
      return (
        <Select
          mode={field.type === "multiselect" ? "multiple" : undefined}
          placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
          options={
            field.optionSource === "blueprints"
              ? blueprintOptions.map((entry) => ({
                  label: entry.displayName,
                  value: entry.id
                }))
              : field.optionSource === "templates"
                ? [
                    { label: "No starting template", value: "" },
                    ...templateOptions.map((entry) => ({
                      label: entry.displayName,
                      value: entry.id
                    }))
                  ]
                : field.optionSource === "roles"
                  ? roleOptions.map((entry) => ({
                      label: entry.label,
                      value: entry.id
                    }))
                  : field.optionSource === "assets"
                    ? [
                        { label: "No linked asset", value: "" },
                        ...assetOptions.map((entry) => ({
                          label: entry.filename,
                          value: entry.id
                        }))
                      ]
                    : field.optionSource === "font-families"
                      ? fontFamilyOptions.map((entry) => ({
                          label: entry.displayName,
                          value: entry.id
                        }))
                : field.options
          }
        />
      );
    case "number":
      return <InputNumber style={{ width: "100%" }} placeholder={field.placeholder} />;
    case "password":
      return <Input.Password placeholder={field.placeholder} />;
    default:
      return <Input type={field.type === "email" ? "email" : "text"} placeholder={field.placeholder} />;
  }
};

const defaultFormValuesByResource: Partial<Record<CrudResourceName, Record<string, unknown>>> = {
  templates: {
    status: "draft"
  },
  "email-templates": {
    kind: "password_reset",
    wrapperHeaderHtml:
      '<div style="padding:20px 24px;background:#184a8c;color:#ffffff;font:700 18px/1.2 Arial,sans-serif;">{{logoText}} · {{brandName}}</div>',
    wrapperFooterHtml:
      '<div style="padding:18px 24px;border-top:1px solid #d8e0ea;color:#5e6b7c;font:400 13px/1.5 Arial,sans-serif;">Need help? Contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.<br/>{{companyName}}<br/>{{companyAddress}}</div>'
  },
  blueprints: {
    kind: "flat"
  },
  assets: {
    kind: "image",
    status: "pending",
    mimeType: "image/png",
    colorSpace: "sRGB"
  },
  "asset-variants": {
    variantKind: "web",
    mimeType: "image/webp"
  },
  "font-families": {
    source: "upload",
    status: "active"
  },
  "font-files": {
    format: "woff2",
    assetId: ""
  },
  users: {
    role: "customer",
    status: "active"
  }
};

const EMPTY_FORM_VALUES: Record<string, unknown> = {};

const ResourceListPage = ({ resourceName }: { resourceName: CrudResourceName }) => {
  const resource = resourceRouteLookup[resourceName as keyof typeof resourceRouteLookup];
  const blueprints = useBlueprintOptions();
  const templates = useTemplateOptions();
  const roles = useRoleOptions();
  const assets = useAssetOptions();
  const fontFamilies = useFontFamilyOptions();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { message } = App.useApp();

  const reload = async () => {
    setLoading(true);
    try {
      setRecords(await loadList(resourceName));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [resourceName]);

  const blueprintMap = blueprints.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
  }, {});
  const templateMap = templates.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
  }, {});
  const roleMap = roles.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {});
  const assetMap = assets.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.filename;
    return acc;
  }, {});
  const fontFamilyMap = fontFamilies.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
    return acc;
  }, {});
  const filterFields = resource.fields.filter(
    (field: ResourceField) =>
      field.list &&
      (FILTERABLE_LIST_FIELD_TYPES.has(field.type) || Boolean(field.optionSource) || (field.options?.length ?? 0) > 0)
  );
  const filterOptionsForField = (field: ResourceField) => {
    if (field.optionSource === "blueprints") {
      return blueprints.map((entry) => ({ label: entry.displayName, value: entry.id }));
    }
    if (field.optionSource === "templates") {
      return templates.map((entry) => ({ label: entry.displayName, value: entry.id }));
    }
    if (field.optionSource === "roles") {
      return roles.map((entry) => ({ label: entry.label, value: entry.id }));
    }
    if (field.optionSource === "assets") {
      return assets.map((entry) => ({ label: entry.filename, value: entry.id }));
    }
    if (field.optionSource === "font-families") {
      return fontFamilies.map((entry) => ({ label: entry.displayName, value: entry.id }));
    }
    return field.options ?? [];
  };

  const searchableFields = resource.fields
    .filter((field: ResourceField) => field.searchable)
    .map((field: ResourceField) => field.key);
  const filteredRecords = records.filter((record: AdminRecord) => {
    const matchesFilters = Object.entries(filters).every(([fieldKey, selectedValue]) => {
      if (!selectedValue) {
        return true;
      }
      return String(record[fieldKey] ?? "") === selectedValue;
    });
    if (!search.trim()) {
      return matchesFilters;
    }
    const query = search.trim().toLowerCase();
    const matchesSearch = searchableFields.some((fieldKey: string) => String(record[fieldKey] ?? "").toLowerCase().includes(query));
    return matchesSearch && matchesFilters;
  });

  const handleDelete = async (record: AdminRecord) => {
    setDeletingId(record.id);
    try {
      await requestJson(buildResourceUrl(resourceName, record.id), { method: "DELETE" });
      message.success(`${resource.singularLabel} deleted.`);
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : `Could not delete ${resource.singularLabel.toLowerCase()}.`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedRowKeys.length) {
      return;
    }

    setBulkDeleting(true);
    const ids = selectedRowKeys.map(String);

    try {
      const results = await Promise.allSettled(
        ids.map((id) => requestJson(buildResourceUrl(resourceName, id), { method: "DELETE" }))
      );
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (succeeded) {
        message.success(`${succeeded} ${resource.label.toLowerCase()} deleted.`);
      }
      if (failed) {
        message.warning(`${failed} records could not be deleted.`);
      }
      setSelectedRowKeys([]);
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not delete the selected records.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      <SectionIntro
        title={resource.label}
        description={resource.description}
        action={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void reload()}>
              Refresh
            </Button>
            {resource.canCreate && resource.createPath ? (
              <Link to={resource.createPath}>
                <Button type="primary" icon={<PlusOutlined />}>
                  New {resource.singularLabel}
                </Button>
              </Link>
            ) : null}
          </Space>
        }
      />

      <Card className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar__main">
            <Input.Search
              allowClear
              placeholder={`Search ${resource.label.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {filterFields.length ? (
              <div className="admin-filters">
                {filterFields.map((field) => (
                  <Select
                    key={`${resource.name}-${field.key}`}
                    allowClear
                    value={filters[field.key] || undefined}
                    placeholder={field.label}
                    options={filterOptionsForField(field)}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        [field.key]: value ? String(value) : ""
                      }))
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
          <Space>
            {resource.canDelete ? (
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} selected ${resource.label.toLowerCase()}?`}
                description="This action cannot be undone."
                onConfirm={() => void handleDeleteSelected()}
                okButtonProps={{ danger: true, loading: bulkDeleting }}
                disabled={!selectedRowKeys.length}
              >
                <Button danger disabled={!selectedRowKeys.length} icon={<DeleteOutlined />} loading={bulkDeleting}>
                  Delete selected
                </Button>
              </Popconfirm>
            ) : null}
            <Text type="secondary">
              {filteredRecords.length} of {records.length} records
            </Text>
          </Space>
        </div>

        <Table
          className="admin-table"
          rowKey="id"
          loading={loading}
          rowSelection={
            resource.canDelete
              ? {
                  selectedRowKeys,
                  onChange: (nextKeys) => setSelectedRowKeys(nextKeys)
                }
              : undefined
          }
          columns={buildColumns(resource, blueprintMap, templateMap, roleMap, assetMap, fontFamilyMap, handleDelete, deletingId)}
          dataSource={filteredRecords}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <Empty
                description={
                  <div>
                    <strong>{resource.emptyTitle}</strong>
                    <div>{resource.emptyDescription}</div>
                  </div>
                }
              />
            )
          }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>
    </div>
  );
};

const inferAssetKind = (file: File): "image" | "svg" | "pdf" | "font" | "technical" => {
  const lowerName = file.name.toLowerCase();
  if (file.type === "image/svg+xml" || lowerName.endsWith(".svg")) {
    return "svg";
  }
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (/\.(ttf|otf|woff|woff2)$/i.test(lowerName)) {
    return "font";
  }
  return "technical";
};

const AssetsCreateWorkspace = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    filename: string;
    mimeType: string;
    kind: "image" | "svg" | "pdf" | "font" | "technical";
    status: "pending" | "processing" | "ready" | "failed";
    sizeBytes: number;
    widthPx: number | null;
    heightPx: number | null;
    dpiX: number | null;
    dpiY: number | null;
    colorSpace: string;
    originalObjectKey: string;
    normalizedObjectKey: string;
    iccProfileRef: string;
    sha256: string;
  } | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const readImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number } | null>((resolve) => {
      if (!file.type.startsWith("image/") && file.type !== "image/svg+xml") {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: image.naturalWidth || 0,
          height: image.naturalHeight || 0
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });

  const handleFileSelection = async (file: File | null) => {
    setError(null);
    setSelectedFile(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setMeta(null);
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = file.type.startsWith("image/") || file.type === "image/svg+xml" ? URL.createObjectURL(file) : null;
    const dimensions = await readImageDimensions(file);
    setPreviewUrl(nextPreviewUrl);
    setMeta({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      kind: inferAssetKind(file),
      status: "pending",
      sizeBytes: file.size,
      widthPx: dimensions?.width ?? null,
      heightPx: dimensions?.height ?? null,
      dpiX: null,
      dpiY: null,
      colorSpace: "sRGB",
      originalObjectKey: "",
      normalizedObjectKey: "",
      iccProfileRef: "",
      sha256: ""
    });
  };

  const handleSubmit = async () => {
    if (!meta || !selectedFile) {
      setError("Choose a file first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const intent = await requestJson<{
        assetId: string;
        uploadUrl: string;
        confirmUrl: string;
      }>("/v1/assets/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          filename: meta.filename,
          kind: meta.kind,
          mimeType: meta.mimeType,
          sizeBytes: meta.sizeBytes
        })
      });
      const uploadResponse = await fetch(resolveApiUrl(intent.uploadUrl), {
        method: "PUT",
        headers: buildHeaders({
          "Content-Type": selectedFile.type || "application/octet-stream"
        }),
        body: selectedFile
      });
      if (!uploadResponse.ok) {
        throw new Error("Could not upload the selected file.");
      }

      const asset = await requestJson<AdminRecord>(intent.confirmUrl, {
        method: "POST",
        body: JSON.stringify({
          widthPx: meta.widthPx,
          heightPx: meta.heightPx,
          dpiX: meta.dpiX,
          dpiY: meta.dpiY,
          colorSpace: meta.colorSpace,
          iccProfileRef: meta.iccProfileRef
        })
      });

      message.success("Asset uploaded and processed.");
      navigate(`/assets/show/${asset.id ?? intent.assetId}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateMeta = <K extends keyof NonNullable<typeof meta>>(key: K, value: NonNullable<typeof meta>[K]) => {
    setMeta((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <div className="admin-page">
      <SectionIntro
        title="Create Asset"
        description="Add a reusable file to the asset library. Review the detected metadata, then complete the storage and processing fields that the asset pipeline needs."
        action={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/assets")}>
            Back to Assets
          </Button>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="admin-card">
            {error ? <Alert className="admin-alert" type="error" message={error} showIcon /> : null}
            <div className="admin-upload-dropzone">
              <div className="admin-upload-dropzone__icon">
                <UploadOutlined />
              </div>
              <Title level={4}>Choose a file</Title>
              <Paragraph>
                Pick an image, SVG, PDF, font, or technical file. This records it in the asset library and prepares it for template and project usage.
              </Paragraph>
              <label className="admin-upload-button">
                <FolderOpenOutlined />
                <span>{selectedFile ? "Replace file" : "Browse files"}</span>
                <input
                  type="file"
                  hidden
                  onChange={(event) => void handleFileSelection(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="admin-card" title="Asset preview">
            {meta ? (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {previewUrl ? <img src={previewUrl} alt={meta.filename} className="admin-asset-preview" /> : null}
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="Filename">{meta.filename}</Descriptions.Item>
                  <Descriptions.Item label="Kind">{meta.kind}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    {formatValue({ key: "status", label: "Status", type: "status" }, meta.status, {}, {}, {})}
                  </Descriptions.Item>
                  <Descriptions.Item label="MIME type">{meta.mimeType}</Descriptions.Item>
                  <Descriptions.Item label="File size">{formatBytes(meta.sizeBytes)}</Descriptions.Item>
                  <Descriptions.Item label="Width">{meta.widthPx ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Height">{meta.heightPx ?? "—"}</Descriptions.Item>
                </Descriptions>
                <div className="admin-form-section">
                  <div className="admin-form-section__title">Pipeline metadata</div>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Status</Text>
                      <Select
                        className="admin-field"
                        value={meta.status}
                        options={[
                          { label: "Pending", value: "pending" },
                          { label: "Processing", value: "processing" },
                          { label: "Ready", value: "ready" },
                          { label: "Failed", value: "failed" }
                        ]}
                        onChange={(value) => updateMeta("status", value)}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Color space</Text>
                      <Input
                        className="admin-field"
                        value={meta.colorSpace}
                        onChange={(event) => updateMeta("colorSpace", event.target.value)}
                        placeholder="sRGB"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">DPI X</Text>
                      <InputNumber
                        className="admin-field"
                        style={{ width: "100%" }}
                        value={meta.dpiX ?? undefined}
                        onChange={(value) => updateMeta("dpiX", typeof value === "number" ? value : null)}
                        placeholder="300"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Text type="secondary">DPI Y</Text>
                      <InputNumber
                        className="admin-field"
                        style={{ width: "100%" }}
                        value={meta.dpiY ?? undefined}
                        onChange={(value) => updateMeta("dpiY", typeof value === "number" ? value : null)}
                        placeholder="300"
                      />
                    </Col>
                    <Col xs={24}>
                      <Text type="secondary">Original object key</Text>
                      <Input
                        className="admin-field"
                        value={meta.originalObjectKey}
                        onChange={(event) => updateMeta("originalObjectKey", event.target.value)}
                        placeholder="assets-original/org/demo/file.ext"
                      />
                    </Col>
                    <Col xs={24}>
                      <Text type="secondary">Normalized object key</Text>
                      <Input
                        className="admin-field"
                        value={meta.normalizedObjectKey}
                        onChange={(event) => updateMeta("normalizedObjectKey", event.target.value)}
                        placeholder="assets-derived/org/demo/file-normalized.ext"
                      />
                    </Col>
                    <Col xs={24}>
                      <Text type="secondary">ICC profile</Text>
                      <Input
                        className="admin-field"
                        value={meta.iccProfileRef}
                        onChange={(event) => updateMeta("iccProfileRef", event.target.value)}
                        placeholder="sRGB IEC61966-2.1"
                      />
                    </Col>
                    <Col xs={24}>
                      <Text type="secondary">SHA-256</Text>
                      <Input
                        className="admin-field"
                        value={meta.sha256}
                        onChange={(event) => updateMeta("sha256", event.target.value)}
                        placeholder="Optional integrity hash"
                      />
                    </Col>
                  </Row>
                </div>
                <div className="admin-form-actions">
                  <Button onClick={() => void handleFileSelection(null)}>Clear</Button>
                  <Button type="primary" icon={<PlusCircleOutlined />} onClick={() => void handleSubmit()} loading={submitting}>
                    Create asset
                  </Button>
                </div>
              </Space>
            ) : (
              <Empty description="Choose a file to inspect and create the asset record." />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const ResourceFormPage = ({
  resourceName,
  mode
}: {
  resourceName: Exclude<CrudResourceName, "mail-log" | "projects"> | "projects";
  mode: "create" | "edit";
}) => {
  const resource = resourceRouteLookup[resourceName as keyof typeof resourceRouteLookup];
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const blueprints = useBlueprintOptions();
  const templates = useTemplateOptions();
  const roles = useRoleOptions();
  const assets = useAssetOptions();
  const fontFamilies = useFontFamilyOptions();
  const selectedBlueprintId = Form.useWatch("blueprintId", form) as string | undefined;
  const templateOptions = useTemplateOptions(selectedBlueprintId);
  const previewSubject = Form.useWatch("subject", form) as string | undefined;
  const previewBodyHtml = Form.useWatch("bodyHtml", form) as string | undefined;
  const previewTextValue = Form.useWatch("previewText", form) as string | undefined;
  const previewWrapperHeaderHtml = Form.useWatch("wrapperHeaderHtml", form) as string | undefined;
  const previewWrapperFooterHtml = Form.useWatch("wrapperFooterHtml", form) as string | undefined;
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const { message } = App.useApp();
  const initialValues = useMemo(
    () => defaultFormValuesByResource[resourceName] ?? EMPTY_FORM_VALUES,
    [resourceName]
  );
  const emailDraftPreview = useEmailTemplateDraftPreview({
    enabled: resourceName === "email-templates",
    subject: previewSubject,
    bodyHtml: previewBodyHtml,
    previewText: previewTextValue,
    wrapperHeaderHtml: previewWrapperHeaderHtml,
    wrapperFooterHtml: previewWrapperFooterHtml
  });

  useEffect(() => {
    if (resourceName !== "projects") {
      return;
    }
    const currentTemplateId = form.getFieldValue("templateId");
    if (currentTemplateId && !templateOptions.some((entry) => entry.id === currentTemplateId)) {
      form.setFieldValue("templateId", "");
    }
  }, [form, resourceName, selectedBlueprintId, templateOptions]);

  useEffect(() => {
    if (mode !== "edit" || !params.id) {
      form.setFieldsValue(initialValues);
      return;
    }

    let active = true;
    setLoading(true);
    loadOne(resourceName, params.id)
      .then((record) => {
        if (!active) {
          return;
        }
        form.setFieldsValue(record);
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load record.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form, initialValues, mode, params.id, resourceName]);

  const formFields = resource.fields.filter((field: ResourceField) => {
    if (!field.form) {
      return false;
    }
    if (mode === "create" && field.editOnly) {
      return false;
    }
    if (mode === "edit" && field.createOnly) {
      return false;
    }
    if (resourceName === "projects" && mode === "create" && !["title", "blueprintId", "templateId"].includes(field.key)) {
      return false;
    }
    if (resourceName === "projects" && mode === "edit" && !["title", "status"].includes(field.key)) {
      return false;
    }
    return true;
  });

  const handleFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    setCreatedToken(null);
      const payload = { ...values };
      if (resourceName === "projects" && payload.templateId === "") {
        payload.templateId = null;
      }
      if (resourceName === "font-files" && payload.assetId === "") {
        payload.assetId = null;
      }
      if (resourceName === "api-tokens" && payload.expiresAt === "") {
        payload.expiresAt = null;
      }

    if (resourceName !== "users" && "password" in payload) {
      delete payload.password;
    }

    if (resourceName === "users" && mode === "edit" && !payload.password) {
      delete payload.password;
    }

    try {
      const url = mode === "create" ? buildResourceUrl(resourceName) : buildResourceUrl(resourceName, params.id);
      const method = mode === "create" ? "POST" : "PATCH";
      const createdOrUpdated = await requestJson<AdminRecord>(url, {
        method,
        body: JSON.stringify(payload)
      });
      message.success(`${resource.singularLabel} ${mode === "create" ? "created" : "updated"}.`);
      if (resourceName === "api-tokens" && mode === "create" && typeof createdOrUpdated.token === "string") {
        setCreatedToken(String(createdOrUpdated.token));
        form.resetFields();
        return;
      }
      navigate(resource.showPath ? `${resource.listPath}/show/${createdOrUpdated.id ?? params.id}` : resource.listPath);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <SectionIntro
        title={mode === "create" ? `Create ${resource.singularLabel}` : `Edit ${resource.singularLabel}`}
        description={resource.description}
        action={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(resource.listPath)}>
            Back to {resource.label}
          </Button>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={resourceName === "email-templates" ? 14 : 24}>
          <Card className="admin-card">
            {loading ? (
              <div className="admin-loading">
                <Spin />
              </div>
            ) : (
              <>
                {error ? <Alert className="admin-alert" type="error" message={error} showIcon /> : null}
                {createdToken ? (
                  <Alert
                    className="admin-alert"
                    type="success"
                    showIcon
                    message="Token created"
                    description={
                      <Space direction="vertical" size="small">
                        <Text>Copy this token now. It is shown only once.</Text>
                        <Input value={createdToken} readOnly />
                      </Space>
                    }
                  />
                ) : null}
                <Form layout="vertical" form={form} initialValues={initialValues} onFinish={(values) => void handleFinish(values)}>
                  <Row gutter={20}>
                    {formFields.map((field: ResourceField) => (
                      <Col key={`${field.key}-${field.label}`} xs={24} md={field.type === "textarea" ? 24 : 12}>
                        <Form.Item
                          label={field.label}
                          name={field.key}
                          rules={field.required ? [{ required: true, message: `${field.label} is required.` }] : undefined}
                          extra={field.extra}
                        >
                          {renderInput(field, blueprints, templateOptions, roles, assets, fontFamilies)}
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                  <div className="admin-form-actions">
                    <Button onClick={() => navigate(resource.listPath)}>Cancel</Button>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                      {mode === "create" ? `Create ${resource.singularLabel}` : "Save changes"}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Card>
        </Col>
        {resourceName === "email-templates" ? (
          <Col xs={24} xl={10}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Card className="admin-card" title="Variables">
                <Paragraph type="secondary">
                  Use placeholders from system settings and runtime mail data in subject, body, header, and footer.
                </Paragraph>
                <Space wrap size={[8, 8]}>
                  {[
                    "{{brandName}}",
                    "{{logoText}}",
                    "{{companyName}}",
                    "{{companyAddress}}",
                    "{{supportEmail}}",
                    "{{supportPhone}}",
                    "{{salesEmail}}",
                    "{{portalAppUrl}}",
                    "{{designerAppUrl}}",
                    "{{adminAppUrl}}",
                    "{{commerceBaseUrl}}",
                    "{{publicApiUrl}}",
                    "{{recipientEmail}}",
                    "{{resetToken}}"
                  ].map((token) => (
                    <Tag key={token}>{token}</Tag>
                  ))}
                </Space>
              </Card>
              <Card className="admin-card" title="Live preview">
                <Paragraph type="secondary">
                  Review the real rendered HTML with this template's header, body, and footer before saving.
                </Paragraph>
                {emailDraftPreview ? (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                      <Text type="secondary">Rendered subject</Text>
                      <div className="admin-preview-subject">{emailDraftPreview.subject}</div>
                    </div>
                    <div>
                      <Text type="secondary">Preview text</Text>
                      <div className="admin-preview-meta">{emailDraftPreview.previewText}</div>
                    </div>
                    <div className="admin-html-frame">
                      <iframe title="Email draft preview" srcDoc={emailDraftPreview.html} className="admin-preview-iframe" />
                    </div>
                  </Space>
                ) : (
                  <Empty description="Add subject, preview text, and body HTML to render a live preview." />
                )}
              </Card>
            </Space>
          </Col>
        ) : null}
      </Row>
    </div>
  );
};

const ProjectShowExtras = ({ record }: { record: AdminRecord }) => {
  const artifacts = Array.isArray(record.artifacts) ? (record.artifacts as AdminRecord[]) : [];
  const preflightReport = record.preflightReport as AdminRecord | null;
  const commerceLink = record.commerceLink as AdminRecord | null;
  const templates = useTemplateOptions();
  const templateLabel =
    templates.find((entry) => entry.id === String(record.templateId ?? ""))?.displayName ??
    (record.templateId ? String(record.templateId) : "No template");
  const documentStats = countProjectDocumentObjects(record);
  const preflightIssues = Array.isArray(preflightReport?.issues) ? (preflightReport?.issues as AdminRecord[]) : [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card className="admin-card admin-dashboard-card">
            <Statistic title="Surfaces" value={documentStats.surfaces} />
            <Paragraph type="secondary">Pages, print zones, or faces currently stored in the active document.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="admin-card admin-dashboard-card">
            <Statistic title="Layers" value={documentStats.layers} />
            <Paragraph type="secondary">Visible design objects inside the current project version.</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="admin-card admin-dashboard-card">
            <Statistic title="Linked assets" value={documentStats.assets} />
            <Paragraph type="secondary">Assets referenced by the active project document.</Paragraph>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card className="admin-card" title="Project workspace">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Active version">{String(record.activeVersionId ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Blueprint">{String(record.blueprintId ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Starting template">{templateLabel}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  {formatValue({ key: "status", label: "Status", type: "status" }, record.status, {}, {}, {})}
                </Descriptions.Item>
              </Descriptions>
              <Space wrap>
                <Button type="primary" href={resolveProjectDesignerHref(record)} target="_blank" rel="noreferrer">
                  Open designer
                </Button>
                {artifacts[0]?.href ? (
                  <a href={resolveApiUrl(String(artifacts[0].href))} target="_blank" rel="noreferrer">
                    <Button>Open latest file</Button>
                  </a>
                ) : null}
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="admin-card" title="Delivery and review">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Preflight">
                {preflightReport
                  ? formatValue({ key: "status", label: "Status", type: "status" }, preflightReport.status, {}, {}, {})
                  : "Not run"}
              </Descriptions.Item>
              <Descriptions.Item label="Issues">{preflightIssues.length}</Descriptions.Item>
              <Descriptions.Item label="Commerce link">
                {commerceLink ? String(commerceLink.connectorType ?? "connected") : "Not linked yet"}
              </Descriptions.Item>
              <Descriptions.Item label="Quote reference">
                {commerceLink?.externalQuoteRef ? String(commerceLink.externalQuoteRef) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Order reference">
                {commerceLink?.externalOrderRef ? String(commerceLink.externalOrderRef) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Return URL">
                {commerceLink?.returnUrl ? String(commerceLink.returnUrl) : "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
        <Card className="admin-card" title="Output files">
          {artifacts.length ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {artifacts.map((artifact) => (
                <div key={String(artifact.id)} className="admin-artifact-row">
                  <div>
                    <Text strong>{String(artifact.artifactType ?? artifact.id)}</Text>
                    <div>
                      <Text type="secondary">{String(artifact.mimeType ?? "file")}</Text>
                    </div>
                  </div>
                  {typeof artifact.href === "string" ? (
                    <a href={resolveApiUrl(String(artifact.href))} target="_blank" rel="noreferrer">
                      <Button size="small">Open</Button>
                    </a>
                  ) : null}
                </div>
              ))}
            </Space>
          ) : (
            <Empty description="No output files yet" />
          )}
        </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="admin-card" title="Preflight issues">
            {preflightIssues.length ? (
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {preflightIssues.map((issue) => (
                  <div key={String(issue.id)} className="admin-issue-row">
                    <div>
                      {formatValue({ key: "severity", label: "Severity", type: "status" }, issue.severity, {}, {}, {})}
                    </div>
                    <div className="admin-issue-copy">
                      <div className="admin-issue-copy__title">{String(issue.issueCode ?? "issue")}</div>
                      <div className="admin-issue-copy__message">{String(issue.message ?? "No message")}</div>
                    </div>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty description="No blocking or warning issues on the latest preflight run." />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

const MailLogShowExtras = ({ record }: { record: AdminRecord }) => (
  <Card className="admin-card" title="HTML preview">
    <div className="admin-html-frame">
      <iframe
        title={`Mail ${record.id}`}
        srcDoc={String(record.html ?? "")}
        className="admin-preview-iframe"
      />
    </div>
  </Card>
);

const AssetShowExtras = ({ record }: { record: AdminRecord }) => {
  const isPreviewableImage =
    typeof record.mimeType === "string" &&
    (record.mimeType.startsWith("image/") || record.mimeType === "image/svg+xml");

  const previewLabel = typeof record.normalizedObjectKey === "string" && record.normalizedObjectKey
    ? String(record.normalizedObjectKey)
    : typeof record.originalObjectKey === "string" && record.originalObjectKey
      ? String(record.originalObjectKey)
      : null;

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} xl={10}>
        <Card className="admin-card" title="Preview">
          {isPreviewableImage ? (
            <div className="admin-asset-preview-shell">
              <img
                src={resolveApiUrl(`/v1/assets/${String(record.id)}/file`)}
                alt={String(record.filename ?? "Asset")}
                className="admin-asset-preview"
              />
              <Text type="secondary">
                Previewing the currently stored original file for this asset.
              </Text>
            </div>
          ) : (
            <Empty description="No inline preview for this asset type yet." />
          )}
        </Card>
      </Col>
      <Col xs={24} xl={14}>
        <Card className="admin-card" title="Pipeline summary">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Statistic title="Status" value={String(record.status ?? "—")} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic title="File size" value={formatBytes(record.sizeBytes)} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="DPI"
                value={
                  record.dpiX || record.dpiY
                    ? `${String(record.dpiX ?? "—")} / ${String(record.dpiY ?? "—")}`
                    : "—"
                }
              />
            </Col>
          </Row>
          <Descriptions size="small" column={1} style={{ marginTop: 20 }}>
            <Descriptions.Item label="Color space">{String(record.colorSpace ?? "—")}</Descriptions.Item>
            <Descriptions.Item label="ICC profile">{String(record.iccProfileRef ?? "—")}</Descriptions.Item>
            <Descriptions.Item label="Original object key">{String(record.originalObjectKey ?? "—")}</Descriptions.Item>
            <Descriptions.Item label="Normalized object key">{String(record.normalizedObjectKey ?? "—")}</Descriptions.Item>
            <Descriptions.Item label="Integrity hash">
              <div className="admin-pre-wrap">{String(record.sha256 ?? "—")}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Pipeline note">
              {previewLabel
                ? "This asset is ready for the upcoming object-storage pipeline."
                : "This asset record exists, but object-storage keys have not been assigned yet."}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
  );
};

const EmailTemplateShowExtras = ({ record }: { record: AdminRecord }) => {
  const preview = useEmailPreview(String(record.id));

  return (
    <Card className="admin-card" title="Template preview">
      {preview ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text type="secondary">Rendered subject</Text>
            <div className="admin-preview-subject">{preview.subject}</div>
          </div>
          <div>
            <Text type="secondary">Preview text</Text>
            <div className="admin-preview-meta">{preview.previewText}</div>
          </div>
          <div className="admin-html-frame">
            <iframe title={`Template ${record.id}`} srcDoc={preview.html} className="admin-preview-iframe" />
          </div>
        </Space>
      ) : (
        <Empty description="Preview unavailable" />
      )}
    </Card>
  );
};

const ResourceShowPage = ({ resourceName }: { resourceName: CrudResourceName }) => {
  const resource = resourceRouteLookup[resourceName as keyof typeof resourceRouteLookup];
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const blueprints = useBlueprintOptions();
  const templates = useTemplateOptions();
  const roles = useRoleOptions();
  const assets = useAssetOptions();
  const fontFamilies = useFontFamilyOptions();
  const [record, setRecord] = useState<AdminRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    let active = true;
    setLoading(true);
    loadOne(resourceName, params.id)
      .then((item) => {
        if (active) {
          setRecord(item);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load record.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id, resourceName]);

  const blueprintMap = blueprints.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
  }, {});
  const templateMap = templates.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
  }, {});
  const roleMap = roles.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {});
  const assetMap = assets.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.filename;
    return acc;
  }, {});
  const fontFamilyMap = fontFamilies.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.displayName;
    return acc;
  }, {});

  return (
    <div className="admin-page">
      <SectionIntro
        title={record ? String(record.displayName ?? record.title ?? record.id) : resource.singularLabel}
        description={resource.description}
        action={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(resource.listPath)}>
              Back to {resource.label}
            </Button>
            {resource.canEdit && resource.editPath && params.id ? (
              <Link to={`${resource.listPath}/edit/${params.id}`}>
                <Button type="primary" icon={<EditOutlined />}>
                  Edit
                </Button>
              </Link>
            ) : null}
          </Space>
        }
      />

      {loading ? (
        <Card className="admin-card">
          <div className="admin-loading">
            <Spin />
          </div>
        </Card>
      ) : error || !record ? (
        <Alert type="error" showIcon message={error ?? `${resource.singularLabel} not found.`} />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card className="admin-card">
            <Descriptions column={2} bordered>
              {resource.fields
                .filter((field: ResourceField) => field.show)
                .map((field: ResourceField) => (
                  <Descriptions.Item key={`${field.key}-${field.label}`} label={field.label}>
                    {formatValue(field, record[field.key], blueprintMap, templateMap, roleMap, assetMap, fontFamilyMap)}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </Card>

          {resourceName === "projects" ? <ProjectShowExtras record={record} /> : null}
          {resourceName === "assets" ? <AssetShowExtras record={record} /> : null}
          {resourceName === "mail-log" ? <MailLogShowExtras record={record} /> : null}
          {resourceName === "email-templates" ? <EmailTemplateShowExtras record={record} /> : null}
        </Space>
      )}
    </div>
  );
};

export const SettingsPage = () => {
  const [form] = Form.useForm();
  const assets = useAssetOptions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { message } = App.useApp();
  const settingsValues = (Form.useWatch([], form) as Record<string, unknown> | undefined) ?? {};

  useEffect(() => {
    let active = true;
    requestJson<AdminRecord>("/v1/settings")
      .then((payload) => {
        if (active) {
          form.setFieldsValue(payload);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load settings.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await requestJson("/v1/settings", {
        method: "PATCH",
        body: JSON.stringify(values)
      });
      message.success("Settings updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <SectionIntro
        title="Settings"
        description="Manage global brand identity, delivery channels, security limits, and operational defaults for the whole platform."
        action={
          <Link to="/assets/create">
            <Button icon={<UploadOutlined />}>Upload brand asset</Button>
          </Link>
        }
      />
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="admin-card">
            {loading ? (
              <div className="admin-loading">
                <Spin />
              </div>
            ) : (
              <>
                {error ? <Alert className="admin-alert" type="error" message={error} showIcon /> : null}
                <Form layout="vertical" form={form} onFinish={(values) => void handleFinish(values)}>
                  <Tabs
                    className="admin-top-tabs"
                    items={[
                      {
                        key: "brand",
                        label: "Brand",
                        children: (
                          <div className="admin-form-section">
                            <div className="admin-form-section__title">Brand identity</div>
                            <Row gutter={20}>
                              <Col xs={24} md={12}>
                                <Form.Item label="Brand name" name="brandName" rules={[{ required: true }]}>
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Logo text" name="logoText" rules={[{ required: true }]}>
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Company name" name="companyName" rules={[{ required: true }]}>
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Primary color" name="primaryColor" rules={[{ required: true }]}>
                                  <Input placeholder="#184a8c" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Logo URL" name="logoUrl" extra="Immediate header/logo rendering source for the admin shell and future workspaces.">
                                  <Input placeholder="https://cdn.example.com/brand/logo.svg" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  label="Logo asset"
                                  name="logoAssetId"
                                  extra="Select an uploaded asset to mark it as the managed brand logo for future storage-backed delivery."
                                >
                                  <Select
                                    allowClear
                                    placeholder="Choose a brand asset"
                                    options={assets.map((entry) => ({ label: entry.filename, value: entry.id }))}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24}>
                                <Form.Item label="Company address" name="companyAddress" rules={[{ required: true }]}>
                                  <Input.TextArea rows={4} />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: "contact-mail",
                        label: "Contact & mail",
                        children: (
                          <div className="admin-form-section">
                            <div className="admin-form-section__title">Support and sender defaults</div>
                            <Row gutter={20}>
                              <Col xs={24} md={12}>
                                <Form.Item label="Support email" name="supportEmail" rules={[{ required: true }]}>
                                  <Input type="email" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Sales email" name="salesEmail" rules={[{ required: true }]}>
                                  <Input type="email" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Support phone" name="supportPhone" rules={[{ required: true }]}>
                                  <Input placeholder="+49 30 1234567" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Reply-to email" name="replyToEmail" rules={[{ required: true }]}>
                                  <Input type="email" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Mail from name" name="mailFromName" rules={[{ required: true }]}>
                                  <Input />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Mail from address" name="mailFromAddress" rules={[{ required: true }]}>
                                  <Input type="email" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: "applications",
                        label: "Applications",
                        children: (
                          <div className="admin-form-section">
                            <div className="admin-form-section__title">Public and operational URLs</div>
                            <Row gutter={20}>
                              <Col xs={24} md={12}>
                                <Form.Item label="Portal URL" name="portalAppUrl">
                                  <Input placeholder="https://portal.example.com" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Designer URL" name="designerAppUrl">
                                  <Input placeholder="https://designer.example.com" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Admin URL" name="adminAppUrl">
                                  <Input placeholder="https://admin.example.com" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Commerce URL" name="commerceBaseUrl">
                                  <Input placeholder="https://shop.example.com" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item label="Public API URL" name="publicApiUrl">
                                  <Input placeholder="https://api.example.com" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: "regional",
                        label: "Localization",
                        children: (
                          <div className="admin-form-section">
                            <div className="admin-form-section__title">Regional defaults</div>
                            <Row gutter={20}>
                              <Col xs={24} md={8}>
                                <Form.Item label="Default locale" name="defaultLocale" rules={[{ required: true }]}>
                                  <Input placeholder="en-US" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item label="Default timezone" name="defaultTimezone" rules={[{ required: true }]}>
                                  <Input placeholder="Europe/Berlin" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={8}>
                                <Form.Item label="Default currency" name="defaultCurrency" rules={[{ required: true }]}>
                                  <Input placeholder="EUR" />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: "policies",
                        label: "Policies & limits",
                        children: (
                          <div className="admin-form-section">
                            <div className="admin-form-section__title">Security and upload defaults</div>
                            <Row gutter={20}>
                              <Col xs={24} md={6}>
                                <Form.Item label="Session TTL (hours)" name="sessionTtlHours" rules={[{ required: true }]}>
                                  <InputNumber min={1} style={{ width: "100%" }} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={6}>
                                <Form.Item label="Password reset TTL (minutes)" name="passwordResetTtlMinutes" rules={[{ required: true }]}>
                                  <InputNumber min={1} style={{ width: "100%" }} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={6}>
                                <Form.Item label="Max upload (MB)" name="maxUploadMb" rules={[{ required: true }]}>
                                  <InputNumber min={1} style={{ width: "100%" }} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={6}>
                                <Form.Item label="Max image edge (px)" name="maxImageEdgePx" rules={[{ required: true }]}>
                                  <InputNumber min={1000} step={500} style={{ width: "100%" }} />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        )
                      }
                    ]}
                  />
                  <div className="admin-form-actions">
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                      Save settings
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="admin-card" title="System summary">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Brand">{String(settingsValues.brandName ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Logo source">
                  {settingsValues.logoUrl
                    ? String(settingsValues.logoUrl)
                    : settingsValues.logoAssetId
                      ? `Managed asset ${String(settingsValues.logoAssetId)}`
                      : "Text-only"}
                </Descriptions.Item>
                <Descriptions.Item label="Sender">
                  {settingsValues.mailFromName || settingsValues.mailFromAddress
                    ? `${String(settingsValues.mailFromName ?? "")} <${String(settingsValues.mailFromAddress ?? "")}>`
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Reply-to">{String(settingsValues.replyToEmail ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Support phone">{String(settingsValues.supportPhone ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Portal URL">{String(settingsValues.portalAppUrl ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Designer URL">{String(settingsValues.designerAppUrl ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Admin URL">{String(settingsValues.adminAppUrl ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Commerce URL">{String(settingsValues.commerceBaseUrl ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Public API URL">{String(settingsValues.publicApiUrl ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Locale">{String(settingsValues.defaultLocale ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Timezone">{String(settingsValues.defaultTimezone ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Currency">{String(settingsValues.defaultCurrency ?? "—")}</Descriptions.Item>
                <Descriptions.Item label="Session TTL">{String(settingsValues.sessionTtlHours ?? "—")} h</Descriptions.Item>
                <Descriptions.Item label="Reset TTL">{String(settingsValues.passwordResetTtlMinutes ?? "—")} min</Descriptions.Item>
                <Descriptions.Item label="Upload limit">{String(settingsValues.maxUploadMb ?? "—")} MB</Descriptions.Item>
                <Descriptions.Item label="Image edge limit">{String(settingsValues.maxImageEdgePx ?? "—")} px</Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export const SystemInfoPage = () => {
  const [info, setInfo] = useState<SystemInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    requestJson<SystemInfoResponse>("/v1/system-info")
      .then((payload) => {
        if (active) {
          setInfo(payload);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load system info.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-page">
      <SectionIntro
        title="System Info"
        description="Review runtime, database, endpoint, and platform policy information for this Flow2Print installation."
      />
      {loading ? (
        <Card className="admin-card">
          <div className="admin-loading">
            <Spin />
          </div>
        </Card>
      ) : error || !info ? (
        <Alert type="error" showIcon message={error ?? "System info unavailable."} />
      ) : (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Row gutter={[20, 20]}>
            <Col xs={24} md={12} xl={6}>
              <Card className="admin-card admin-dashboard-card">
                <Statistic title="Projects" value={info.catalog.projects} />
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="admin-card admin-dashboard-card">
                <Statistic title="Assets" value={info.catalog.assets} />
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="admin-card admin-dashboard-card">
                <Statistic title="Templates" value={info.catalog.templates} />
              </Card>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Card className="admin-card admin-dashboard-card">
                <Statistic title="Users" value={info.catalog.users} />
              </Card>
            </Col>
          </Row>
          <Row gutter={[20, 20]}>
            <Col xs={24} xl={8}>
              <Card className="admin-card" title="Runtime">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Framework">{info.runtime.framework}</Descriptions.Item>
                  <Descriptions.Item label="Node">{info.runtime.nodeVersion}</Descriptions.Item>
                  <Descriptions.Item label="Platform">{`${info.runtime.platform} / ${info.runtime.arch}`}</Descriptions.Item>
                  <Descriptions.Item label="Timezone">{info.runtime.timezone}</Descriptions.Item>
                  <Descriptions.Item label="Uptime">{`${info.runtime.uptimeSeconds}s`}</Descriptions.Item>
                  <Descriptions.Item label="Snapshot time">{formatDate(info.runtime.now)}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card className="admin-card" title="Persistence">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Engine">{info.persistence.engine}</Descriptions.Item>
                  <Descriptions.Item label="Database URL">
                    {info.persistence.databaseUrlConfigured ? "Configured" : "Missing"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Runtime data dir">{info.persistence.dataDir ?? "—"}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card className="admin-card" title="Operational limits">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Max upload">{`${info.limits.maxUploadMb} MB`}</Descriptions.Item>
                  <Descriptions.Item label="Max image edge">{`${info.limits.maxImageEdgePx} px`}</Descriptions.Item>
                  <Descriptions.Item label="Session TTL">{`${info.limits.sessionTtlHours} hours`}</Descriptions.Item>
                  <Descriptions.Item label="Password reset TTL">{`${info.limits.passwordResetTtlMinutes} minutes`}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
          <Card className="admin-card" title="Application endpoints">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Portal">{info.applications.portalAppUrl ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Designer">{info.applications.designerAppUrl ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Admin">{info.applications.adminAppUrl ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Commerce">{info.applications.commerceBaseUrl ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Public API">{info.applications.publicApiUrl ?? "—"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Space>
      )}
    </div>
  );
};

export const DashboardPage = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all(
      adminResources.map(async (resource) => [
        resource.name,
        resource.name === "settings" ? 1 : (await loadList(resource.name)).length
      ] as const)
    )
      .then((entries) => {
        if (active) {
          setCounts(Object.fromEntries(entries));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-page">
      <SectionIntro
        title="Dashboard"
        description="Keep templates, blueprints, assets, users, and production-facing records in one clean workspace."
      />

      <Row gutter={[20, 20]}>
        {adminResources.map((resource) => (
          <Col key={resource.name} xs={24} sm={12} xl={8}>
            <Card className="admin-card admin-dashboard-card">
              <Statistic title={resource.label} value={counts[resource.name] ?? 0} loading={loading} />
              <Paragraph type="secondary">{resource.description}</Paragraph>
              <Link to={resource.listPath}>
                <Button>Open {resource.label}</Button>
              </Link>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export const AccountPage = () => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    let active = true;
    authProvider
      .getIdentity?.()
      .then((identity) => {
        const currentIdentity = identity as { name?: string; email?: string } | undefined;
        if (active && currentIdentity) {
          profileForm.setFieldsValue({
            displayName: currentIdentity.name,
            email: currentIdentity.email
          });
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load account.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profileForm]);

  const handleProfileSave = async (values: { displayName: string; email: string }) => {
    setSavingProfile(true);
    setError(null);
    try {
      await requestJson("/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(values)
      });
      message.success("Profile updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (values: { currentPassword: string; nextPassword: string }) => {
    setSavingPassword(true);
    setError(null);
    try {
      await requestJson("/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(values)
      });
      passwordForm.resetFields();
      message.success("Password updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="admin-page">
      <SectionIntro
        title="Account"
        description="Keep your operator profile current and rotate your password without leaving the admin workspace."
      />

      {loading ? (
        <Card className="admin-card">
          <div className="admin-loading">
            <Spin />
          </div>
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={12}>
            <Card className="admin-card" title="Profile">
              {error ? <Alert className="admin-alert" type="error" message={error} showIcon /> : null}
              <Form layout="vertical" form={profileForm} onFinish={(values) => void handleProfileSave(values)}>
                <Form.Item label="Display name" name="displayName" rules={[{ required: true, message: "Display name is required." }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Email" name="email" rules={[{ required: true, message: "Email is required." }]}>
                  <Input type="email" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={savingProfile}>
                  Save profile
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card className="admin-card" title="Password">
              <Form layout="vertical" form={passwordForm} onFinish={(values) => void handlePasswordSave(values)}>
                <Form.Item
                  label="Current password"
                  name="currentPassword"
                  rules={[{ required: true, message: "Current password is required." }]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  label="New password"
                  name="nextPassword"
                  rules={[{ required: true, message: "New password is required." }]}
                >
                  <Input.Password />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={savingPassword}>
                  Update password
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

const AuthShell = ({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  useEffect(() => {
    document.title = `${title} · Flow2Print Admin`;
  }, [title]);

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-panel">
        <div className="admin-auth-brand">
          <div className="admin-auth-mark">F2P</div>
          <div>
            <Text type="secondary">Flow2Print Admin</Text>
            <Title level={2}>{title}</Title>
            <Paragraph>{description}</Paragraph>
          </div>
        </div>
        {children}
        {footer ? <div className="admin-auth-footer">{footer}</div> : null}
      </div>
    </div>
  );
};

export const LoginPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await authProvider.login?.(values);
      navigate("/dashboard", { replace: true });
    } catch (nextError) {
      const messageText = nextError instanceof Error ? nextError.message : "Could not sign in.";
      setError(messageText);
      message.error(messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description="Use an operator account to manage products, templates, users, and production-facing data."
      footer={
        <Space size="middle">
          <Link to="/forgot-password">Forgot password?</Link>
          <a href={resolveDesignerUrl("/designer")} target="_blank" rel="noreferrer">
            Open designer
          </a>
        </Space>
      }
    >
      {error ? <Alert className="admin-alert" type="error" showIcon message={error} /> : null}
      <Form layout="vertical" form={form} onFinish={(values) => void handleFinish(values)} initialValues={{ email: "demo@flow2print.local" }}>
        <Form.Item label="Email" name="email" rules={[{ required: true, message: "Email is required." }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: "Password is required." }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Sign in
        </Button>
      </Form>
    </AuthShell>
  );
};

export const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async (values: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await requestJson<{ token?: string | null }>("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSentToken(response.token ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset access"
      description="Request a reset token for an operator account. The token is also written to the mail log."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {error ? <Alert className="admin-alert" type="error" showIcon message={error} /> : null}
      {sentToken ? (
        <Alert
          type="success"
          showIcon
          message="Reset token created"
          description={
            <div>
              <div>Use this token on the next screen or copy it from the mail log.</div>
              <code>{sentToken}</code>
            </div>
          }
        />
      ) : null}
      <Form layout="vertical" form={form} onFinish={(values) => void handleFinish(values)}>
        <Form.Item label="Email" name="email" rules={[{ required: true, message: "Email is required." }]}>
          <Input autoFocus />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Send reset token
        </Button>
      </Form>
      {sentToken ? (
        <div className="admin-auth-footer">
          <Link to="/update-password">Continue to password update</Link>
        </div>
      ) : null}
    </AuthShell>
  );
};

export const UpdatePasswordPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async (values: { token: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await requestJson("/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(values)
      });
      navigate("/login", { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Update password"
      description="Use a valid reset token to set a new operator password."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {error ? <Alert className="admin-alert" type="error" showIcon message={error} /> : null}
      <Form layout="vertical" form={form} onFinish={(values) => void handleFinish(values)}>
        <Form.Item label="Reset token" name="token" rules={[{ required: true, message: "Reset token is required." }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item label="New password" name="password" rules={[{ required: true, message: "Password is required." }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Update password
        </Button>
      </Form>
    </AuthShell>
  );
};

export const ProjectsListPage = () => <ResourceListPage resourceName="projects" />;
export const ProjectsCreatePage = () => <ResourceFormPage resourceName="projects" mode="create" />;
export const ProjectsEditPage = () => <ResourceFormPage resourceName="projects" mode="edit" />;
export const ProjectsShowPage = () => <ResourceShowPage resourceName="projects" />;

export const TemplatesListPage = () => <ResourceListPage resourceName="templates" />;
export const TemplatesCreatePage = () => <ResourceFormPage resourceName="templates" mode="create" />;
export const TemplatesEditPage = () => <ResourceFormPage resourceName="templates" mode="edit" />;
export const TemplatesShowPage = () => <ResourceShowPage resourceName="templates" />;

export const BlueprintsListPage = () => <ResourceListPage resourceName="blueprints" />;
export const BlueprintsCreatePage = () => <ResourceFormPage resourceName="blueprints" mode="create" />;
export const BlueprintsEditPage = () => <ResourceFormPage resourceName="blueprints" mode="edit" />;
export const BlueprintsShowPage = () => <ResourceShowPage resourceName="blueprints" />;

export const AssetsListPage = () => <ResourceListPage resourceName="assets" />;
export const AssetsCreatePage = () => <AssetsCreateWorkspace />;
export const AssetsEditPage = () => <ResourceFormPage resourceName="assets" mode="edit" />;
export const AssetsShowPage = () => <ResourceShowPage resourceName="assets" />;

export const AssetVariantsListPage = () => <ResourceListPage resourceName="asset-variants" />;
export const AssetVariantsCreatePage = () => <ResourceFormPage resourceName="asset-variants" mode="create" />;
export const AssetVariantsEditPage = () => <ResourceFormPage resourceName="asset-variants" mode="edit" />;
export const AssetVariantsShowPage = () => <ResourceShowPage resourceName="asset-variants" />;

export const FontFamiliesListPage = () => <ResourceListPage resourceName="font-families" />;
export const FontFamiliesCreatePage = () => <ResourceFormPage resourceName="font-families" mode="create" />;
export const FontFamiliesEditPage = () => <ResourceFormPage resourceName="font-families" mode="edit" />;
export const FontFamiliesShowPage = () => <ResourceShowPage resourceName="font-families" />;

export const FontFilesListPage = () => <ResourceListPage resourceName="font-files" />;
export const FontFilesCreatePage = () => <ResourceFormPage resourceName="font-files" mode="create" />;
export const FontFilesEditPage = () => <ResourceFormPage resourceName="font-files" mode="edit" />;
export const FontFilesShowPage = () => <ResourceShowPage resourceName="font-files" />;

export const UsersListPage = () => <ResourceListPage resourceName="users" />;
export const UsersCreatePage = () => <ResourceFormPage resourceName="users" mode="create" />;
export const UsersEditPage = () => <ResourceFormPage resourceName="users" mode="edit" />;
export const UsersShowPage = () => <ResourceShowPage resourceName="users" />;

export const RolesListPage = () => <ResourceListPage resourceName="roles" />;
export const RolesEditPage = () => <ResourceFormPage resourceName="roles" mode="edit" />;
export const RolesShowPage = () => <ResourceShowPage resourceName="roles" />;

export const ApiTokensListPage = () => <ResourceListPage resourceName="api-tokens" />;
export const ApiTokensCreatePage = () => <ResourceFormPage resourceName="api-tokens" mode="create" />;
export const ApiTokensEditPage = () => <ResourceFormPage resourceName="api-tokens" mode="edit" />;
export const ApiTokensShowPage = () => <ResourceShowPage resourceName="api-tokens" />;

export const MailLogListPage = () => <ResourceListPage resourceName="mail-log" />;
export const MailLogShowPage = () => <ResourceShowPage resourceName="mail-log" />;
export const EmailTemplatesListPage = () => <ResourceListPage resourceName="email-templates" />;
export const EmailTemplatesCreatePage = () => <ResourceFormPage resourceName="email-templates" mode="create" />;
export const EmailTemplatesEditPage = () => <ResourceFormPage resourceName="email-templates" mode="edit" />;
export const EmailTemplatesShowPage = () => <ResourceShowPage resourceName="email-templates" />;

export const AuthDebugPage = () => (
  <AuthShell title="Session unavailable" description="A valid admin session is required.">
    <Alert
      type="warning"
      showIcon
      message={readSessionToken() ? "Session token exists but is not valid anymore." : "No local admin session found."}
    />
    <div className="admin-auth-footer">
      <Link to="/login">Go to sign in</Link>
    </div>
  </AuthShell>
);
