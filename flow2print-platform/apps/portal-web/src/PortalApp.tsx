import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@flow2print/ui-kit";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const API_BASE = import.meta.env.VITE_FLOW2PRINT_API_URL ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_API_URL) : "";
const DESIGNER_BASE = import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL
  ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL)
  : "";
const CONNECTOR_RETURN_URL = import.meta.env.VITE_FLOW2PRINT_RETURN_URL ?? "/flow2print/return";
const resolveDesignerUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${DESIGNER_BASE}${path}`);
const SESSION_STORAGE_KEY = "flow2print.portal.session";

interface ProjectCard {
  id: string;
  title: string;
  status: string;
  approvalState: string;
  blueprintId: string;
  templateId: string | null;
  externalProductRef: string;
  artifactCount: number;
  preflightStatus: "pass" | "warn" | "fail" | null;
}

interface LaunchSessionResponse {
  designerUrl: string;
}

interface TemplateRecord {
  id: string;
  displayName: string;
  description: string;
  blueprintId: string;
  status: "published" | "draft";
}

interface AssetRecord {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
}

interface BlueprintRecord {
  id: string;
  displayName: string;
  kind: string;
  latestVersionId?: string;
  status?: string;
}

interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "manager" | "customer";
  status: "active" | "disabled";
}

interface AuthSession {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthSessionResponse {
  session: AuthSession;
  user: SafeUser;
}

interface MailLogRecord {
  id: string;
  kind: string;
  to: string;
  subject: string;
  preview: string;
  createdAt: string;
}

interface NewTemplateFormState {
  displayName: string;
  description: string;
  blueprintId: string;
  status: "published" | "draft";
}

interface NewAssetFormState {
  filename: string;
  kind: "image" | "svg" | "pdf" | "font" | "technical";
  mimeType: string;
}

interface ProfileFormState {
  displayName: string;
  email: string;
}

interface PasswordFormState {
  currentPassword: string;
  nextPassword: string;
}

type WorkspaceSection =
  | "overview"
  | "projects"
  | "orders"
  | "assets"
  | "templates"
  | "catalog"
  | "account"
  | "users"
  | "mail";
type AuthView = "login" | "forgot" | "reset";

const starters = [
  {
    label: "Business Card",
    productRef: "SKU-BUSINESS-CARD",
    blueprintId: "bp_business_card",
    note: "Flat print"
  },
  {
    label: "T-Shirt",
    productRef: "SKU-TSHIRT-BLACK",
    blueprintId: "bp_tshirt",
    note: "Apparel"
  },
  {
    label: "Packaging",
    productRef: "SKU-FOLDING-CARTON",
    blueprintId: "bp_carton",
    note: "Packaging"
  }
] as const;

const statusLabel = (value: string | null) => (value ? value.replaceAll("_", " ") : "not run");

const badgeTone = (value: string | null) => {
  if (
    value === "finalized" ||
    value === "ordered" ||
    value === "pass" ||
    value === "published" ||
    value === "active"
  ) {
    return "badge badge--success";
  }
  if (value === "warn" || value === "pending") {
    return "badge badge--warning";
  }
  if (value === "draft" || value === "launch_created" || value === "quote_linked" || value === "admin") {
    return "badge badge--accent";
  }
  if (value === "disabled" || value === "fail") {
    return "badge badge--danger";
  }
  return "badge badge--neutral";
};

const starterByBlueprint = (blueprintId: string) =>
  starters.find((starter) => starter.blueprintId === blueprintId) ?? starters[0];

const readSessionToken = () => window.localStorage.getItem(SESSION_STORAGE_KEY);

export const PortalApp = () => {
  const [section, setSection] = useState<WorkspaceSection>("overview");
  const [authView, setAuthView] = useState<AuthView>("login");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<SafeUser | null>(null);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintRecord[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [mailLog, setMailLog] = useState<MailLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "demo@flow2print.local", password: "demo1234" });
  const [forgotEmail, setForgotEmail] = useState("demo@flow2print.local");
  const [resetForm, setResetForm] = useState({ token: "", password: "demo1234" });
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    displayName: "Demo Admin",
    email: "demo@flow2print.local"
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: "demo1234",
    nextPassword: "demo1234"
  });
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    displayName: "",
    password: "demo1234",
    role: "customer" as SafeUser["role"]
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraftTitle, setProjectDraftTitle] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingBlueprintId, setEditingBlueprintId] = useState<string | null>(null);
  const [newAssetForm, setNewAssetForm] = useState<NewAssetFormState>({
    filename: "",
    kind: "image",
    mimeType: "image/png"
  });
  const [newTemplateForm, setNewTemplateForm] = useState<NewTemplateFormState>({
    displayName: "",
    description: "",
    blueprintId: starters[0].blueprintId,
    status: "draft" as "published" | "draft"
  });
  const [newBlueprintForm, setNewBlueprintForm] = useState({
    displayName: "",
    kind: "flat" as "flat" | "apparel" | "packaging"
  });

  const authFetch = async (input: string, init?: RequestInit) => {
    const token = readSessionToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };

  const refreshSession = async (token: string) => {
    const response = await fetch(`${API_BASE}/v1/auth/session`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error("Session expired");
    }
    const payload = (await response.json()) as AuthSessionResponse;
    setAuthUser(payload.user);
    setSessionToken(token);
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
    return payload.user;
  };

  const loadWorkspace = async (currentUser?: SafeUser | null) => {
    setLoading(true);
    setError(null);
    try {
      const [projectsResponse, templatesResponse, assetsResponse, blueprintsResponse] = await Promise.all([
        authFetch(`${API_BASE}/v1/projects`),
        authFetch(`${API_BASE}/v1/templates`),
        authFetch(`${API_BASE}/v1/assets`),
        authFetch(`${API_BASE}/v1/blueprints`)
      ]);

      const [projectsPayload, templatesPayload, assetsPayload, blueprintsPayload] = await Promise.all([
        projectsResponse.json() as Promise<{ docs: ProjectCard[] }>,
        templatesResponse.json() as Promise<{ docs: TemplateRecord[] }>,
        assetsResponse.json() as Promise<{ docs: AssetRecord[] }>,
        blueprintsResponse.json() as Promise<{ docs: BlueprintRecord[] }>
      ]);

      setProjects(projectsPayload.docs);
      setTemplates(templatesPayload.docs);
      setAssets(assetsPayload.docs);
      setBlueprints(blueprintsPayload.docs);

      if ((currentUser ?? authUser)?.role === "admin") {
        const [usersResponse, mailResponse] = await Promise.all([
          authFetch(`${API_BASE}/v1/users`),
          authFetch(`${API_BASE}/v1/mail-log`)
        ]);
        const [usersPayload, mailPayload] = await Promise.all([
          usersResponse.json() as Promise<{ docs: SafeUser[] }>,
          mailResponse.json() as Promise<{ docs: MailLogRecord[] }>
        ]);
        setUsers(usersPayload.docs);
        setMailLog(mailPayload.docs);
      } else {
        setUsers([]);
        setMailLog([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      const token = readSessionToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const user = await refreshSession(token);
        await loadWorkspace(user);
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionToken(null);
        setAuthUser(null);
        setLoading(false);
      }
    };
    void boot();
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }
    setProfileForm({
      displayName: authUser.displayName,
      email: authUser.email
    });
  }, [authUser]);

  const login = async () => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const response = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { code?: string };
        throw new Error(payload.code === "invalid_credentials" ? "Email or password is incorrect." : "Login failed.");
      }
      const payload = (await response.json()) as AuthSessionResponse;
      setSessionToken(payload.session.token);
      setAuthUser(payload.user);
      window.localStorage.setItem(SESSION_STORAGE_KEY, payload.session.token);
      setSection("overview");
      await loadWorkspace(payload.user);
    } catch (loginError) {
      setAuthError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await authFetch(`${API_BASE}/v1/auth/logout`, { method: "POST" });
      }
    } finally {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionToken(null);
      setAuthUser(null);
      setProjects([]);
      setTemplates([]);
      setAssets([]);
      setBlueprints([]);
      setUsers([]);
      setMailLog([]);
      setAuthView("login");
      setSection("overview");
    }
  };

  const requestPasswordReset = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const payload = (await response.json()) as { token?: string | null };
      setAuthNotice(
        payload.token
          ? `Reset token created: ${payload.token}`
          : "If the account exists, a password reset mail entry has been created."
      );
      if (payload.token) {
        setResetForm((current) => ({ ...current, token: payload.token ?? "" }));
        setAuthView("reset");
      }
    } catch (forgotError) {
      setAuthError(forgotError instanceof Error ? forgotError.message : "Password reset failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const resetPassword = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE}/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { code?: string };
        throw new Error(payload.code === "reset_token_not_found" ? "Reset token is invalid or expired." : "Reset failed.");
      }
      setAuthNotice("Password updated. You can sign in now.");
      setAuthView("login");
      setLoginForm((current) => ({ ...current, password: resetForm.password }));
    } catch (resetError) {
      setAuthError(resetError instanceof Error ? resetError.message : "Reset failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const saveProfile = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/v1/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { code?: string };
        throw new Error(payload.code === "email_already_exists" ? "Email address is already in use." : "Profile could not be updated.");
      }
      const updated = (await response.json()) as SafeUser;
      setAuthUser(updated);
      setAuthNotice("Account details updated.");
      await loadWorkspace(updated);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Profile could not be updated.");
    } finally {
      setAuthBusy(false);
    }
  };

  const changePassword = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { code?: string };
        throw new Error(payload.code === "current_password_invalid" ? "Current password is incorrect." : "Password could not be updated.");
      }
      setAuthNotice("Password updated.");
      setPasswordForm({ currentPassword: "", nextPassword: "" });
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Password could not be updated.");
    } finally {
      setAuthBusy(false);
    }
  };

  const createProject = async (productRef: string, templateId?: string | null) => {
    const key = templateId ? `${productRef}:${templateId}` : productRef;
    setCreatingKey(key);
    try {
      const response = await authFetch(`${API_BASE}/v1/launch-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorType: "magento2",
          externalStoreId: "default",
          externalProductRef: productRef,
          templateId,
          customer: {
            email: authUser?.email ?? "demo@flow2print.local",
            isGuest: false
          },
          locale: "en-US",
          currency: "USD",
          returnUrl: CONNECTOR_RETURN_URL,
          options: {}
        })
      });
      const payload = (await response.json()) as LaunchSessionResponse;
      await loadWorkspace(authUser);
      window.location.href = resolveDesignerUrl(payload.designerUrl);
    } finally {
      setCreatingKey(null);
    }
  };

  const reorderProject = async (projectId: string) => {
    setCreatingKey(`reorder:${projectId}`);
    try {
      const response = await authFetch(`${API_BASE}/v1/connectors/magento2/reorders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const payload = (await response.json()) as { projectId: string };
      await loadWorkspace(authUser);
      window.location.href = resolveDesignerUrl(`/designer/project/${payload.projectId}`);
    } finally {
      setCreatingKey(null);
    }
  };

  const startProjectEdit = (project: ProjectCard) => {
    setEditingProjectId(project.id);
    setProjectDraftTitle(project.title);
  };

  const saveProject = async (projectId: string, status?: ProjectCard["status"]) => {
    const title = projectDraftTitle.trim();
    if (!title) {
      setError("Project title is required.");
      return;
    }
    await authFetch(`${API_BASE}/v1/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, ...(status ? { status } : {}) })
    });
    setEditingProjectId(null);
    setProjectDraftTitle("");
    await loadWorkspace(authUser);
  };

  const archiveProject = async (project: ProjectCard) => {
    await authFetch(`${API_BASE}/v1/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: project.status === "archived" ? "draft" : "archived" })
    });
    await loadWorkspace(authUser);
  };

  const deleteProject = async (projectId: string) => {
    await authFetch(`${API_BASE}/v1/projects/${projectId}`, { method: "DELETE" });
    if (editingProjectId === projectId) {
      setEditingProjectId(null);
      setProjectDraftTitle("");
    }
    await loadWorkspace(authUser);
  };

  const startUserEdit = (user: SafeUser) => {
    setEditingUserId(user.id);
    setNewUserForm({
      email: user.email,
      displayName: user.displayName,
      password: "",
      role: user.role
    });
    setSection("users");
  };

  const createUser = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm)
      });
      if (!response.ok) {
        const payload = (await response.json()) as { code?: string };
        throw new Error(payload.code === "user_already_exists" ? "User already exists." : "User could not be created.");
      }
      setNewUserForm({
        email: "",
        displayName: "",
        password: "demo1234",
        role: "customer"
      });
      await loadWorkspace(authUser);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "User could not be created.");
    } finally {
      setAuthBusy(false);
    }
  };

  const saveUser = async () => {
    if (!editingUserId) {
      return;
    }
    const response = await authFetch(`${API_BASE}/v1/users/${editingUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserForm.email,
        displayName: newUserForm.displayName,
        role: newUserForm.role,
        ...(newUserForm.password ? { password: newUserForm.password } : {})
      })
    });
    if (!response.ok) {
      const payload = (await response.json()) as { code?: string };
      throw new Error(payload.code === "email_already_exists" ? "Email address is already in use." : "User could not be updated.");
    }
    setEditingUserId(null);
    setNewUserForm({
      email: "",
      displayName: "",
      password: "demo1234",
      role: "customer"
    });
    await loadWorkspace(authUser);
  };

  const updateUserRole = async (userId: string, role: SafeUser["role"]) => {
    await authFetch(`${API_BASE}/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    await loadWorkspace(authUser);
  };

  const toggleUserStatus = async (user: SafeUser) => {
    await authFetch(`${API_BASE}/v1/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "active" ? "disabled" : "active" })
    });
    await loadWorkspace(authUser);
  };

  const deleteUser = async (userId: string) => {
    await authFetch(`${API_BASE}/v1/users/${userId}`, { method: "DELETE" });
    await loadWorkspace(authUser);
  };

  const createAsset = async () => {
    setAuthBusy(true);
    try {
      await authFetch(`${API_BASE}/v1/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssetForm)
      });
      setNewAssetForm({ filename: "", kind: "image", mimeType: "image/png" });
      await loadWorkspace(authUser);
    } finally {
      setAuthBusy(false);
    }
  };

  const startAssetEdit = (asset: AssetRecord) => {
    setEditingAssetId(asset.id);
    setNewAssetForm({
      filename: asset.filename,
      kind: asset.kind as NewAssetFormState["kind"],
      mimeType: asset.mimeType
    });
    setSection("assets");
  };

  const saveAsset = async () => {
    if (!editingAssetId) {
      return;
    }
    await authFetch(`${API_BASE}/v1/assets/${editingAssetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAssetForm)
    });
    setEditingAssetId(null);
    setNewAssetForm({ filename: "", kind: "image", mimeType: "image/png" });
    await loadWorkspace(authUser);
  };

  const deleteAsset = async (assetId: string) => {
    await authFetch(`${API_BASE}/v1/assets/${assetId}`, { method: "DELETE" });
    await loadWorkspace(authUser);
  };

  const createTemplate = async () => {
    setAuthBusy(true);
    try {
      await authFetch(`${API_BASE}/v1/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplateForm)
      });
      setNewTemplateForm({
        displayName: "",
        description: "",
        blueprintId: blueprints[0]?.id ?? starters[0].blueprintId,
        status: "draft"
      });
      await loadWorkspace(authUser);
    } finally {
      setAuthBusy(false);
    }
  };

  const startTemplateEdit = (template: TemplateRecord) => {
    setEditingTemplateId(template.id);
    setNewTemplateForm({
      displayName: template.displayName,
      description: template.description,
      blueprintId: template.blueprintId,
      status: template.status
    });
    setSection("templates");
  };

  const saveTemplate = async () => {
    if (!editingTemplateId) {
      return;
    }
    await authFetch(`${API_BASE}/v1/templates/${editingTemplateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplateForm)
    });
    setEditingTemplateId(null);
    setNewTemplateForm({
      displayName: "",
      description: "",
      blueprintId: blueprints[0]?.id ?? starters[0].blueprintId,
      status: "draft"
    });
    await loadWorkspace(authUser);
  };

  const toggleTemplateStatus = async (template: TemplateRecord) => {
    await authFetch(`${API_BASE}/v1/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: template.status === "published" ? "draft" : "published" })
    });
    await loadWorkspace(authUser);
  };

  const deleteTemplate = async (templateId: string) => {
    await authFetch(`${API_BASE}/v1/templates/${templateId}`, { method: "DELETE" });
    await loadWorkspace(authUser);
  };

  const createBlueprint = async () => {
    setAuthBusy(true);
    try {
      await authFetch(`${API_BASE}/v1/blueprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBlueprintForm)
      });
      setNewBlueprintForm({ displayName: "", kind: "flat" });
      await loadWorkspace(authUser);
    } finally {
      setAuthBusy(false);
    }
  };

  const startBlueprintEdit = (blueprint: BlueprintRecord) => {
    setEditingBlueprintId(blueprint.id);
    setNewBlueprintForm({
      displayName: blueprint.displayName,
      kind: blueprint.kind as "flat" | "apparel" | "packaging"
    });
    setSection("catalog");
  };

  const saveBlueprint = async () => {
    if (!editingBlueprintId) {
      return;
    }
    await authFetch(`${API_BASE}/v1/blueprints/${editingBlueprintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBlueprintForm)
    });
    setEditingBlueprintId(null);
    setNewBlueprintForm({ displayName: "", kind: "flat" });
    await loadWorkspace(authUser);
  };

  const deleteBlueprint = async (blueprintId: string) => {
    await authFetch(`${API_BASE}/v1/blueprints/${blueprintId}`, { method: "DELETE" });
    await loadWorkspace(authUser);
  };

  const metrics = useMemo(() => {
    const draftCount = projects.filter((project) => project.status === "draft").length;
    const finalizedCount = projects.filter((project) => project.status === "finalized").length;
    const orderedCount = projects.filter((project) => project.status === "ordered").length;
    const reviewCount = projects.filter(
      (project) => project.preflightStatus === "warn" || project.preflightStatus === "fail"
    ).length;

    return {
      draftCount,
      finalizedCount,
      orderedCount,
      reviewCount,
      templateCount: templates.length,
      assetCount: assets.length,
      blueprintCount: blueprints.length,
      userCount: users.length
    };
  }, [assets.length, blueprints.length, projects, templates.length, users.length]);

  const activeProjects = useMemo(
    () =>
      [...projects].sort((left, right) => {
        const leftScore = left.status === "draft" ? 0 : left.status === "finalized" ? 1 : 2;
        const rightScore = right.status === "draft" ? 0 : right.status === "finalized" ? 1 : 2;
        return leftScore - rightScore;
      }),
    [projects]
  );

  const reorderCandidates = useMemo(
    () => projects.filter((project) => project.status === "finalized" || project.status === "ordered"),
    [projects]
  );

  const projectNeedsAttention = useMemo(
    () => projects.filter((project) => project.preflightStatus === "warn" || project.preflightStatus === "fail"),
    [projects]
  );

  const menuItems: Array<{ id: WorkspaceSection; label: string; count?: number; adminOnly?: boolean }> = [
    { id: "overview", label: "Overview" },
    { id: "projects", label: "Projects", count: projects.length },
    { id: "orders", label: "Reorders", count: reorderCandidates.length },
    { id: "assets", label: "Assets", count: assets.length },
    { id: "templates", label: "Templates", count: templates.length },
    { id: "catalog", label: "Catalog", count: blueprints.length },
    { id: "account", label: "Account" },
    { id: "users", label: "Users", count: users.length, adminOnly: true },
    { id: "mail", label: "Mail", count: mailLog.length, adminOnly: true }
  ];

  if (!authUser) {
    return (
      <AppShell
        eyebrow="Workspace"
        compact
        maxWidth={880}
        title="Sign in to Flow2Print"
        subtitle="Use a real local account before entering the workspace. Demo admin: demo@flow2print.local / demo1234."
      >
        <div className="auth-shell">
          <aside className="auth-sidebar">
            <button
              type="button"
              className={`workspace-nav__item ${authView === "login" ? "workspace-nav__item--active" : ""}`}
              onClick={() => setAuthView("login")}
            >
              <span>Sign in</span>
            </button>
            <button
              type="button"
              className={`workspace-nav__item ${authView === "forgot" ? "workspace-nav__item--active" : ""}`}
              onClick={() => setAuthView("forgot")}
            >
              <span>Forgot password</span>
            </button>
            <button
              type="button"
              className={`workspace-nav__item ${authView === "reset" ? "workspace-nav__item--active" : ""}`}
              onClick={() => setAuthView("reset")}
            >
              <span>Reset password</span>
            </button>
          </aside>

          <section className="auth-panel">
            {authError ? <div className="workspace-message workspace-message--error">{authError}</div> : null}
            {authNotice ? <div className="workspace-message">{authNotice}</div> : null}

            {authView === "login" ? (
              <div className="form-card">
                <h3>Sign in</h3>
                <p>Enter your local workspace account.</p>
                <label className="field">
                  <span>Email</span>
                  <input
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <div className="button-group">
                  <button type="button" onClick={() => void login()} disabled={authBusy}>
                    {authBusy ? "Signing in…" : "Sign in"}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => setAuthView("forgot")}>
                    Forgot password
                  </button>
                </div>
              </div>
            ) : null}

            {authView === "forgot" ? (
              <div className="form-card">
                <h3>Forgot password</h3>
                <p>Create a reset token and a mail-log entry for the account.</p>
                <label className="field">
                  <span>Email</span>
                  <input value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} />
                </label>
                <div className="button-group">
                  <button type="button" onClick={() => void requestPasswordReset()} disabled={authBusy}>
                    {authBusy ? "Creating…" : "Create reset token"}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => setAuthView("login")}>
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : null}

            {authView === "reset" ? (
              <div className="form-card">
                <h3>Reset password</h3>
                <p>Use the reset token from the mail log or the generated forgot-password response.</p>
                <label className="field">
                  <span>Reset token</span>
                  <input
                    value={resetForm.token}
                    onChange={(event) => setResetForm((current) => ({ ...current, token: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={resetForm.password}
                    onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <div className="button-group">
                  <button type="button" onClick={() => void resetPassword()} disabled={authBusy}>
                    {authBusy ? "Updating…" : "Set new password"}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => setAuthView("login")}>
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Workspace"
      compact
      maxWidth={1480}
      title="Flow2Print workspace"
      subtitle="A single, role-aware workspace for projects, reorders, assets, templates, catalog, accounts and operational mail."
    >
      <div className="workspace-page">
        <aside className="workspace-sidebar">
          <div className="workspace-brand">
            <strong>{authUser.displayName}</strong>
            <span>
              {authUser.email} · {authUser.role}
            </span>
          </div>
          <nav className="workspace-nav" aria-label="Portal sections">
            {menuItems
              .filter((item) => !item.adminOnly || authUser.role === "admin")
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`workspace-nav__item ${section === item.id ? "workspace-nav__item--active" : ""}`}
                  onClick={() => setSection(item.id)}
                >
                  <span>{item.label}</span>
                  {typeof item.count === "number" ? <span className="workspace-nav__count">{item.count}</span> : null}
                </button>
              ))}
          </nav>
          <div className="workspace-sidebar__footer">
            <span>API</span>
            <strong>{API_BASE}</strong>
            <button type="button" className="button-secondary" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </aside>

        <section className="workspace-main">
          <header className="workspace-header">
            <div>
              <p className="workspace-kicker">Portal</p>
              <h2>
                {section === "overview" ? "Overview" : null}
                {section === "projects" ? "Projects" : null}
                {section === "orders" ? "Reorders and delivery" : null}
                {section === "assets" ? "Reusable assets" : null}
                {section === "templates" ? "Templates" : null}
                {section === "catalog" ? "Catalog and blueprints" : null}
                {section === "account" ? "Account" : null}
                {section === "users" ? "Users" : null}
                {section === "mail" ? "Mail log" : null}
              </h2>
              <p>
                {section === "overview" ? "See what needs attention and jump into active work quickly." : null}
                {section === "projects" ? "Start, resume and reorder projects from one place." : null}
                {section === "orders" ? "Reuse finalized jobs and open delivery-ready outputs." : null}
                {section === "assets" ? "Review reusable image files available to the designer." : null}
                {section === "templates" ? "Start from a template instead of a blank layout." : null}
                {section === "catalog" ? "Keep product blueprint definitions visible to the team." : null}
                {section === "account" ? "Manage your local workspace account and session." : null}
                {section === "users" ? "Admin-only user creation, role changes and access control." : null}
                {section === "mail" ? "Admin-only operational mails such as password resets." : null}
              </p>
            </div>
            <div className="workspace-header__actions">
              <button type="button" className="button-secondary" onClick={() => setSection("projects")}>
                New project
              </button>
              <button type="button" className="button-secondary" onClick={() => void loadWorkspace(authUser)}>
                Refresh
              </button>
            </div>
          </header>

          {error ? <div className="workspace-message workspace-message--error">{error}</div> : null}
          {loading ? <div className="workspace-message">Loading workspace…</div> : null}

          {!loading && section === "overview" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>System status</h3>
                    <p>A quick summary of live work in this environment.</p>
                  </div>
                </div>
                <div className="metric-grid">
                  <article className="metric-card">
                    <span className="metric-card__label">Draft projects</span>
                    <strong>{metrics.draftCount}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">Ready outputs</span>
                    <strong>{metrics.finalizedCount + metrics.orderedCount}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">Need review</span>
                    <strong>{metrics.reviewCount}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">Users</span>
                    <strong>{authUser.role === "admin" ? metrics.userCount : 1}</strong>
                  </article>
                </div>
              </section>

              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Quick start</h3>
                    <p>Start the most common product flows from one place.</p>
                  </div>
                </div>
                <div className="launch-grid">
                  {starters.map((starter) => (
                    <article className="launch-card" key={starter.productRef}>
                      <div>
                        <strong>{starter.label}</strong>
                        <span>{starter.note}</span>
                      </div>
                      <button type="button" onClick={() => void createProject(starter.productRef)} disabled={creatingKey !== null}>
                        {creatingKey === starter.productRef ? "Opening…" : "Start"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Needs attention</h3>
                    <p>Projects with preflight warnings or failed checks.</p>
                  </div>
                </div>
                <div className="list-table">
                  {projectNeedsAttention.length === 0 ? (
                    <div className="empty-state">No projects currently need review.</div>
                  ) : (
                    projectNeedsAttention.map((project) => (
                      <div className="list-row" key={project.id}>
                        <div>
                          <strong>{project.title}</strong>
                          <span>{project.externalProductRef}</span>
                        </div>
                        <span className={badgeTone(project.preflightStatus)}>{statusLabel(project.preflightStatus)}</span>
                        <a className="button-link button-link--secondary" href={resolveDesignerUrl(`/designer/project/${project.id}`)}>
                          Open
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "projects" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Create new project</h3>
                    <p>Start a blank product flow directly from the workspace.</p>
                  </div>
                </div>
                <div className="launch-grid">
                  {starters.map((starter) => (
                    <article className="launch-card" key={`project-${starter.productRef}`}>
                      <div>
                        <strong>{starter.label}</strong>
                        <span>{starter.note}</span>
                      </div>
                      <button type="button" onClick={() => void createProject(starter.productRef)} disabled={creatingKey !== null}>
                        {creatingKey === starter.productRef ? "Opening…" : "Start blank"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>All projects</h3>
                    <p>Rename, archive, delete, resume or reorder projects from the same list.</p>
                  </div>
                </div>
                <div className="list-table">
                  {activeProjects.length === 0 ? <div className="empty-state">No projects in this workspace yet.</div> : null}
                  {activeProjects.map((project) => (
                    <div className="list-row list-row--wide" key={project.id}>
                      <div>
                        {editingProjectId === project.id ? (
                          <>
                            <input value={projectDraftTitle} onChange={(event) => setProjectDraftTitle(event.target.value)} />
                            <span>{project.externalProductRef}</span>
                          </>
                        ) : (
                          <>
                            <strong>{project.title}</strong>
                            <span>
                              {project.externalProductRef} · {project.artifactCount} files
                            </span>
                          </>
                        )}
                      </div>
                      <span className={badgeTone(project.status)}>{statusLabel(project.status)}</span>
                      <span className={badgeTone(project.preflightStatus)}>{statusLabel(project.preflightStatus)}</span>
                      <div className="row-actions">
                        {editingProjectId === project.id ? (
                          <>
                            <button type="button" onClick={() => void saveProject(project.id)}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => {
                                setEditingProjectId(null);
                                setProjectDraftTitle("");
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <a className="button-link button-link--secondary" href={resolveDesignerUrl(`/designer/project/${project.id}`)}>
                              {project.status === "draft" ? "Resume" : "Inspect"}
                            </a>
                            <button type="button" className="button-secondary" onClick={() => startProjectEdit(project)}>
                              Edit
                            </button>
                            <button type="button" className="button-secondary" onClick={() => void archiveProject(project)}>
                              {project.status === "archived" ? "Restore" : "Archive"}
                            </button>
                            {(project.status === "finalized" || project.status === "ordered") && (
                              <button
                                type="button"
                                className="button-secondary"
                                onClick={() => void reorderProject(project.id)}
                                disabled={creatingKey === `reorder:${project.id}`}
                              >
                                {creatingKey === `reorder:${project.id}` ? "Opening…" : "Reorder"}
                              </button>
                            )}
                            <button type="button" className="button-danger" onClick={() => void deleteProject(project.id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "orders" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Reorder-ready jobs</h3>
                    <p>Use finalized or ordered projects as the basis for a new draft.</p>
                  </div>
                </div>
                <div className="list-table">
                  {reorderCandidates.map((project) => (
                    <div className="list-row list-row--wide" key={project.id}>
                      <div>
                        <strong>{project.title}</strong>
                        <span>
                          {project.externalProductRef} · {project.artifactCount} outputs
                        </span>
                      </div>
                      <span className={badgeTone(project.status)}>{statusLabel(project.status)}</span>
                      <div className="row-actions">
                        <a className="button-link button-link--secondary" href={resolveDesignerUrl(`/designer/project/${project.id}`)}>
                          Open files
                        </a>
                        <button
                          type="button"
                          onClick={() => void reorderProject(project.id)}
                          disabled={creatingKey === `reorder:${project.id}`}
                        >
                          {creatingKey === `reorder:${project.id}` ? "Opening…" : "Start reorder"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "assets" ? (
            <div className="workspace-content">
              {authUser.role === "admin" ? (
                <section className="workspace-card">
                  <div className="workspace-card__header">
                  <div>
                      <h3>{editingAssetId ? "Edit asset" : "Create asset"}</h3>
                      <p>{editingAssetId ? "Update a reusable file record." : "Add a reusable file record for the local workspace."}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Filename</span>
                      <input
                        value={newAssetForm.filename}
                        onChange={(event) => setNewAssetForm((current) => ({ ...current, filename: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      <select
                        value={newAssetForm.kind}
                        onChange={(event) =>
                          setNewAssetForm((current) => ({
                            ...current,
                            kind: event.target.value as NewAssetFormState["kind"]
                          }))
                        }
                      >
                        <option value="image">image</option>
                        <option value="svg">svg</option>
                        <option value="pdf">pdf</option>
                        <option value="font">font</option>
                        <option value="technical">technical</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>MIME type</span>
                      <input
                        value={newAssetForm.mimeType}
                        onChange={(event) => setNewAssetForm((current) => ({ ...current, mimeType: event.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={() =>
                        void (editingAssetId ? saveAsset() : createAsset()).catch((assetError) =>
                          setError(assetError instanceof Error ? assetError.message : "Asset could not be saved.")
                        )
                      }
                      disabled={authBusy || !newAssetForm.filename.trim()}
                    >
                      {authBusy ? "Saving…" : editingAssetId ? "Save asset" : "Create asset"}
                    </button>
                    {editingAssetId ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setEditingAssetId(null);
                          setNewAssetForm({ filename: "", kind: "image", mimeType: "image/png" });
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Asset library</h3>
                    <p>Files available to current designers and templates.</p>
                  </div>
                </div>
                <div className="list-table">
                  {assets.map((asset) => (
                      <div className="list-row list-row--wide" key={asset.id}>
                      <div>
                        <strong>{asset.filename}</strong>
                        <span>
                          {asset.mimeType}
                          {asset.widthPx && asset.heightPx ? ` · ${asset.widthPx} × ${asset.heightPx}px` : ""}
                        </span>
                      </div>
                        <span className="badge badge--neutral">{asset.kind}</span>
                        <div className="row-actions">
                          <span className="badge badge--neutral">{asset.id.slice(-8)}</span>
                          {authUser.role === "admin" ? (
                            <>
                              <button type="button" className="button-secondary" onClick={() => startAssetEdit(asset)}>
                                Edit
                              </button>
                              <button type="button" className="button-danger" onClick={() => void deleteAsset(asset.id)}>
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "templates" ? (
            <div className="workspace-content">
              {authUser.role === "admin" ? (
                <section className="workspace-card">
                  <div className="workspace-card__header">
                  <div>
                      <h3>{editingTemplateId ? "Edit template" : "Create template"}</h3>
                      <p>{editingTemplateId ? "Update an existing reusable starting layout." : "Add a new reusable starting layout record."}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={newTemplateForm.displayName}
                        onChange={(event) =>
                          setNewTemplateForm((current) => ({ ...current, displayName: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Blueprint</span>
                      <select
                        value={newTemplateForm.blueprintId}
                        onChange={(event) =>
                          setNewTemplateForm((current) => ({ ...current, blueprintId: event.target.value }))
                        }
                      >
                        {blueprints.map((blueprint) => (
                          <option key={blueprint.id} value={blueprint.id}>
                            {blueprint.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field field--wide">
                      <span>Description</span>
                      <input
                        value={newTemplateForm.description}
                        onChange={(event) =>
                          setNewTemplateForm((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={() =>
                        void (editingTemplateId ? saveTemplate() : createTemplate()).catch((templateError) =>
                          setError(templateError instanceof Error ? templateError.message : "Template could not be saved.")
                        )
                      }
                      disabled={authBusy || !newTemplateForm.displayName.trim() || !newTemplateForm.description.trim()}
                    >
                      {authBusy ? "Saving…" : editingTemplateId ? "Save template" : "Create template"}
                    </button>
                    {editingTemplateId ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setNewTemplateForm({
                            displayName: "",
                            description: "",
                            blueprintId: blueprints[0]?.id ?? starters[0].blueprintId,
                            status: "draft"
                          });
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Template catalog</h3>
                    <p>Published layout starters grouped by compatible product blueprint.</p>
                  </div>
                </div>
                <div className="list-table">
                  {templates.map((template) => {
                    const starter = starterByBlueprint(template.blueprintId);
                    const startKey = `${starter.productRef}:${template.id}`;
                    return (
                      <div className="list-row list-row--wide" key={template.id}>
                        <div>
                          <strong>{template.displayName}</strong>
                          <span>{template.description}</span>
                        </div>
                        <span className={badgeTone(template.status)}>{statusLabel(template.status)}</span>
                        <span className="badge badge--neutral">{starter.label}</span>
                        <div className="row-actions">
                          <button type="button" onClick={() => void createProject(starter.productRef, template.id)} disabled={creatingKey !== null}>
                            {creatingKey === startKey ? "Opening…" : "Use template"}
                          </button>
                          {authUser.role === "admin" ? (
                            <>
                              <button type="button" className="button-secondary" onClick={() => startTemplateEdit(template)}>
                                Edit
                              </button>
                              <button type="button" className="button-secondary" onClick={() => void toggleTemplateStatus(template)}>
                                {template.status === "published" ? "Set draft" : "Publish"}
                              </button>
                              <button type="button" className="button-danger" onClick={() => void deleteTemplate(template.id)}>
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "catalog" ? (
            <div className="workspace-content">
              {authUser.role === "admin" ? (
                <section className="workspace-card">
                  <div className="workspace-card__header">
                  <div>
                      <h3>{editingBlueprintId ? "Edit blueprint" : "Create blueprint"}</h3>
                      <p>{editingBlueprintId ? "Update a product blueprint record." : "Add a new product blueprint record for templates and projects."}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={newBlueprintForm.displayName}
                        onChange={(event) =>
                          setNewBlueprintForm((current) => ({ ...current, displayName: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Kind</span>
                      <select
                        value={newBlueprintForm.kind}
                        onChange={(event) =>
                          setNewBlueprintForm((current) => ({
                            ...current,
                            kind: event.target.value as "flat" | "apparel" | "packaging"
                          }))
                        }
                      >
                        <option value="flat">flat</option>
                        <option value="apparel">apparel</option>
                        <option value="packaging">packaging</option>
                      </select>
                    </label>
                  </div>
                  <div className="button-group">
                    <button
                      type="button"
                      onClick={() =>
                        void (editingBlueprintId ? saveBlueprint() : createBlueprint()).catch((blueprintError) =>
                          setError(blueprintError instanceof Error ? blueprintError.message : "Blueprint could not be saved.")
                        )
                      }
                      disabled={authBusy || !newBlueprintForm.displayName.trim()}
                    >
                      {authBusy ? "Saving…" : editingBlueprintId ? "Save blueprint" : "Create blueprint"}
                    </button>
                    {editingBlueprintId ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setEditingBlueprintId(null);
                          setNewBlueprintForm({ displayName: "", kind: "flat" });
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Blueprints</h3>
                    <p>Product blueprint definitions that templates and projects build on.</p>
                  </div>
                </div>
                <div className="list-table">
                  {blueprints.map((blueprint) => (
                    <div className="list-row list-row--wide" key={blueprint.id}>
                      <div>
                        <strong>{blueprint.displayName}</strong>
                        <span>{blueprint.id}</span>
                      </div>
                      <span className="badge badge--neutral">{blueprint.kind}</span>
                      <div className="row-actions">
                        <span className={badgeTone(blueprint.status ?? "published")}>{statusLabel(blueprint.status ?? "published")}</span>
                        {authUser.role === "admin" ? (
                          <>
                            <button type="button" className="button-secondary" onClick={() => startBlueprintEdit(blueprint)}>
                              Edit
                            </button>
                            <button type="button" className="button-danger" onClick={() => void deleteBlueprint(blueprint.id)}>
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "account" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Your account</h3>
                    <p>Update your profile, change your password, and review the current session.</p>
                  </div>
                </div>
                <div className="auth-layout">
                  <div className="form-card">
                    <h3>Profile</h3>
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={profileForm.displayName}
                        onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>
                    <div className="button-group">
                      <button type="button" onClick={() => void saveProfile()}>
                        Save profile
                      </button>
                    </div>
                  </div>
                  <div className="form-card">
                    <h3>Security</h3>
                    <label className="field">
                      <span>Current password</span>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>New password</span>
                      <input
                        type="password"
                        value={passwordForm.nextPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))
                        }
                      />
                    </label>
                    <div className="button-group">
                      <button type="button" onClick={() => void changePassword()}>
                        Change password
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setForgotEmail(authUser.email);
                          void requestPasswordReset();
                        }}
                      >
                        Create reset token
                      </button>
                    </div>
                  </div>
                </div>
                <div className="list-table">
                  <div className="list-row">
                    <div>
                      <strong>Role</strong>
                      <span>{authUser.displayName}</span>
                    </div>
                    <span className={badgeTone(authUser.role)}>{authUser.role}</span>
                    <span className={badgeTone(authUser.status)}>{authUser.status}</span>
                  </div>
                  <div className="list-row">
                    <div>
                      <strong>Session</strong>
                      <span>{sessionToken ? "Signed in to local workspace" : "Signed out"}</span>
                    </div>
                    <span className="badge badge--neutral">{authUser.email}</span>
                    <button type="button" className="button-secondary" onClick={() => void logout()}>
                      Sign out
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "users" && authUser.role === "admin" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>{editingUserId ? "Edit user" : "Create user"}</h3>
                    <p>{editingUserId ? "Update the selected local workspace account." : "Add local workspace users and assign a role."}</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={newUserForm.displayName}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, displayName: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      value={newUserForm.email}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select
                      value={newUserForm.role}
                      onChange={(event) =>
                        setNewUserForm((current) => ({
                          ...current,
                          role: event.target.value as SafeUser["role"]
                        }))
                      }
                    >
                      <option value="customer">customer</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                </div>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={() =>
                      void (editingUserId ? saveUser() : createUser()).catch((userError) =>
                        setError(userError instanceof Error ? userError.message : "User could not be saved.")
                      )
                    }
                    disabled={authBusy}
                  >
                    {authBusy ? "Saving…" : editingUserId ? "Save user" : "Create user"}
                  </button>
                  {editingUserId ? (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setEditingUserId(null);
                        setNewUserForm({
                          email: "",
                          displayName: "",
                          password: "demo1234",
                          role: "customer"
                        });
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>User directory</h3>
                    <p>Update roles, disable access, or delete users.</p>
                  </div>
                </div>
                <div className="list-table">
                  {users.map((user) => (
                    <div className="list-row list-row--wide" key={user.id}>
                      <div>
                        <strong>{user.displayName}</strong>
                        <span>{user.email}</span>
                      </div>
                      <span className={badgeTone(user.role)}>{user.role}</span>
                      <span className={badgeTone(user.status)}>{user.status}</span>
                      <div className="row-actions">
                        <button type="button" className="button-secondary" onClick={() => startUserEdit(user)}>
                          Edit
                        </button>
                        <button type="button" className="button-secondary" onClick={() => void toggleUserStatus(user)}>
                          {user.status === "active" ? "Disable" : "Enable"}
                        </button>
                        {user.id !== authUser.id ? (
                          <button type="button" className="button-danger" onClick={() => void deleteUser(user.id)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {!loading && section === "mail" && authUser.role === "admin" ? (
            <div className="workspace-content">
              <section className="workspace-card">
                <div className="workspace-card__header">
                  <div>
                    <h3>Mail log</h3>
                    <p>Operational mails generated by the local workspace, including password resets.</p>
                  </div>
                </div>
                <div className="list-table">
                  {mailLog.length === 0 ? (
                    <div className="empty-state">No mails generated yet.</div>
                  ) : (
                    mailLog.map((mail) => (
                      <div className="list-row list-row--wide" key={mail.id}>
                        <div>
                          <strong>{mail.subject}</strong>
                          <span>{mail.preview}</span>
                        </div>
                        <span className="badge badge--neutral">{mail.to}</span>
                        <span className="badge badge--neutral">{mail.kind}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
};
