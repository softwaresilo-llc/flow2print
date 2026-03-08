import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { Flow2PrintDocument } from "@flow2print/design-document";
import { summarizeDocument } from "@flow2print/editor-engine";

import { DesignerLauncher } from "./components/DesignerLauncher";
import { DesignerAssetsPanel } from "./components/DesignerAssetsPanel";
import { DesignerEditPanel } from "./components/DesignerEditPanel";
import { DesignerFinishPanel } from "./components/DesignerFinishPanel";
import { DesignerHistoryPanel } from "./components/DesignerHistoryPanel";
import { DesignerInspectorPanel } from "./components/DesignerInspectorPanel";
import { DesignerNavigatorPanel } from "./components/DesignerNavigatorPanel";
import { DesignerOverlay } from "./components/DesignerOverlay";
import { DesignerPreviewPanel } from "./components/DesignerPreviewPanel";
import { DesignerReviewPanel } from "./components/DesignerReviewPanel";
import { DesignerSideFilmstrip } from "./components/DesignerSideFilmstrip";
import { DesignerStagePreview } from "./components/DesignerStagePreview";
import { DesignerToolRail } from "./components/DesignerToolRail";
import { DesignerWorkspaceTopbar } from "./components/DesignerWorkspaceTopbar";
import { FabricCanvasStage, type FabricCanvasStageHandle } from "./components/FabricCanvasStage";
import { LayerContextMenu } from "./components/LayerContextMenu";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const browserOrigin =
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}` : "";
const API_BASE = import.meta.env.VITE_FLOW2PRINT_API_URL
  ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_API_URL)
  : browserOrigin
    ? `${browserOrigin}:3000`
    : "";
const DESIGNER_BASE = import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL
  ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL)
  : browserOrigin
    ? `${browserOrigin}:5173`
    : "";
const CONNECTOR_RETURN_URL = import.meta.env.VITE_FLOW2PRINT_RETURN_URL ?? "/flow2print/return";
const resolveApiUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`);
const resolveDesignerUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${DESIGNER_BASE}${path}`);

interface ProjectResponse {
  id: string;
  title: string;
  status: string;
  approvalState: string;
  blueprintId: string;
  activeVersionId: string;
  externalProductRef: string;
  templateId: string | null;
  latestJobs: Array<{ jobId: string; jobType: string; status: string }>;
  artifacts: ArtifactRecord[];
  preflightReport: PreflightReport | null;
  commerceLink: CommerceLink | null;
  document: Flow2PrintDocument;
}

interface ArtifactRecord {
  id: string;
  artifactType: string;
  href: string;
  createdAt: string;
}

interface PreflightReport {
  id: string;
  status: "pass" | "warn" | "fail";
  createdAt: string;
  issues: Array<{
    id: string;
    severity: "info" | "warning" | "blocking";
    issueCode: string;
    message: string;
    surfaceKey: string;
  }>;
}

interface LaunchSessionResponse {
  id: string;
  projectId: string;
  externalProductRef: string;
  customerEmail: string;
  expiresAt: string;
}

interface AssetRecord {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
}

interface CommerceLink {
  id: string;
  state: "launch_created" | "quote_linked" | "order_linked";
  externalQuoteRef: string | null;
  externalOrderRef: string | null;
  externalStoreId: string;
}

interface ProjectListItem {
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

interface TemplateRecord {
  id: string;
  displayName: string;
  description: string;
  blueprintId: string;
  status: "published" | "draft";
}

interface HistoryEntryMeta {
  label: string;
  createdAt: string;
  icon: string;
}

type DesignerLayer = Flow2PrintDocument["surfaces"][number]["layers"][number];
type DesignerSurface = Flow2PrintDocument["surfaces"][number];

const starterProducts = [
  { label: "Business Card", productRef: "SKU-BUSINESS-CARD", blueprintId: "bp_business_card", note: "Flat print" },
  { label: "T-Shirt", productRef: "SKU-TSHIRT-BLACK", blueprintId: "bp_tshirt", note: "Apparel zones" },
  { label: "Packaging", productRef: "SKU-FOLDING-CARTON", blueprintId: "bp_carton", note: "Dieline flow" }
] as const;

const blueprintForProductRef = (productRef: string) =>
  starterProducts.find((starter) => starter.productRef === productRef)?.blueprintId ?? "bp_business_card";

const getRoute = () => {
  const [, designer, mode, value] = window.location.pathname.split("/");
  if (designer !== "designer") {
    return { mode: "project", value: "" };
  }
  return { mode, value };
};

const isEmbeddedRoute = () => {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("embedded") === "1" || searchParams.get("layout") === "modal" || window.self !== window.top;
};
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

const badgeTone = (value: string | null) => {
  if (value === "pass" || value === "finalized" || value === "ordered" || value === "succeeded") {
    return "badge badge--success";
  }
  if (value === "warn" || value === "warning" || value === "pending" || value === "running") {
    return "badge badge--warning";
  }
  if (value === "quote_linked" || value === "launch_created") {
    return "badge badge--accent";
  }
  return "badge badge--neutral";
};

const humanizeStatus = (value: string) => value.replaceAll("_", " ");
const formatShortTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
const formatRelativeTime = (value: string) => {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
const historyIconForLabel = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes("color")) {
    return "palette";
  }
  if (normalized.includes("move") || normalized.includes("align") || normalized.includes("nudge")) {
    return "open_with";
  }
  if (normalized.includes("text") || normalized.includes("rename") || normalized.includes("edit")) {
    return "edit_note";
  }
  if (normalized.includes("add")) {
    return "add_box";
  }
  if (normalized.includes("delete") || normalized.includes("remove")) {
    return "delete";
  }
  if (normalized.includes("group")) {
    return "layers";
  }
  if (normalized.includes("image") || normalized.includes("crop")) {
    return "image";
  }
  return "history";
};

const deepCloneDocument = (document: Flow2PrintDocument) =>
  JSON.parse(JSON.stringify(document)) as Flow2PrintDocument;
const deepCloneLayer = (layer: DesignerLayer) => JSON.parse(JSON.stringify(layer)) as DesignerLayer;

const pruneUnusedDocumentAssets = (document: Flow2PrintDocument): Flow2PrintDocument => {
  const usedAssetIds = new Set(
    document.surfaces.flatMap((surface) =>
      surface.layers
        .map((layer) => String(layer.metadata.assetId ?? ""))
        .filter((assetId) => assetId.length > 0)
    )
  );

  return {
    ...document,
    assets: document.assets.filter((asset) => usedAssetIds.has(asset.assetId))
  };
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const SNAP_STEP_MM = 2;
const snapToStep = (value: number, enabled: boolean) =>
  enabled ? Math.round(value / SNAP_STEP_MM) * SNAP_STEP_MM : Math.round(value * 10) / 10;
const getImageLayerSize = (surface: DesignerSurface) => ({
  width: Math.max(18, Math.min(surface.safeBox.width * 0.6, surface.artboard.width - 12, 68)),
  height: Math.max(18, Math.min(surface.safeBox.height * 0.45, surface.artboard.height - 12, 58))
});
const layerPreviewIcon = (layer: DesignerLayer) => {
  if (layer.type === "text") {
    return "title";
  }
  if (layer.type === "image") {
    return "image";
  }
  if (layer.type === "shape") {
    return "category";
  }
  if (layer.type === "qr") {
    return "qr_code_2";
  }
  if (layer.type === "barcode") {
    return "barcode";
  }
  return "widgets";
};

const getPreferredLayerId = (surface: DesignerSurface | undefined) =>
  surface?.layers.find((layer) => layer.type === "text")?.id ?? surface?.layers[0]?.id ?? null;

const readJson = async <T,>(response: Response) => {
  if (!response.ok) {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { code?: string; message?: string };
      const requestError = new Error(parsed.message ?? parsed.code ?? `Request failed with status ${response.status}`);
      if (parsed.code) {
        requestError.name = parsed.code;
      }
      throw requestError;
    } catch (parseError) {
      if (parseError instanceof Error && parseError.name !== "SyntaxError") {
        throw parseError;
      }
      throw new Error(body || `Request failed with status ${response.status}`);
    }
  }
  return response.json() as Promise<T>;
};

const friendlyLoadError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.name === "launch_session_not_found" || error.message.includes("launch_session_not_found")) {
      return "This design link is no longer available. Start a new design or open one of your recent projects below.";
    }
    if (error.name === "project_not_found" || error.message.includes("project_not_found")) {
      return "This project is no longer available. Start a new design or open another recent project.";
    }
    if (error.message.includes("Failed to fetch")) {
      return "Flow2Print could not reach the local API. Make sure the local services are running, then try again.";
    }
    if (error.message.includes("JSON.parse") || error.message.includes("Unexpected token")) {
      return "Flow2Print received an unexpected response while opening this project. Try refreshing or opening another project.";
    }
    return error.message;
  }
  return "Unable to load project.";
};

export const DesignerApp = () => {
  const route = getRoute();
  const [routeFallbackActive, setRouteFallbackActive] = useState(false);
  const effectiveRoute =
    routeFallbackActive && (route.mode === "launch" || route.mode === "project")
      ? { mode: "project", value: "" }
      : route;
  const isEmbedded = isEmbeddedRoute();
  const [launchSession, setLaunchSession] = useState<LaunchSessionResponse | null>(null);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [draftDocument, setDraftDocument] = useState<Flow2PrintDocument | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([]);
  const [localAssetUrls, setLocalAssetUrls] = useState<Record<string, string>>({});
  const [overlay, setOverlay] = useState<null | "templates" | "projects" | "menu" | "navigator" | "properties">(null);
  const [selectedStarterProductRef, setSelectedStarterProductRef] = useState<string>(starterProducts[0].productRef);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSurfaceIndex, setSelectedSurfaceIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [leftPanel, setLeftPanel] = useState<"layers" | "assets" | "history">("layers");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [rightPanel, setRightPanel] = useState<"edit" | "review" | "finish">("edit");
  const [cropMode, setCropMode] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 1024
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [syncingCommerce, setSyncingCommerce] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: string;
  } | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dropTargetLayerId, setDropTargetLayerId] = useState<string | null>(null);
  const [historyPast, setHistoryPast] = useState<Flow2PrintDocument[]>([]);
  const [historyFuture, setHistoryFuture] = useState<Flow2PrintDocument[]>([]);
  const [historyPastEntries, setHistoryPastEntries] = useState<HistoryEntryMeta[]>([]);
  const [historyFutureEntries, setHistoryFutureEntries] = useState<HistoryEntryMeta[]>([]);
  const [filePickerMode, setFilePickerMode] = useState<"insert" | "replace">("insert");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<FabricCanvasStageHandle | null>(null);
  const errorTitle = error?.startsWith("This design link is no longer available")
    ? "Design link expired."
    : error?.startsWith("This project is no longer available")
      ? "Project not available."
      : "Project could not be opened.";

  useEffect(() => {
    setRouteFallbackActive(false);
  }, [route.mode, route.value]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadRecentProjects = async () => {
    const response = await fetch(resolveApiUrl("/v1/projects"));
    const payload = await readJson<{ docs: ProjectListItem[] }>(response);
    setRecentProjects(payload.docs);
  };

  const loadTemplates = async (blueprintId?: string) => {
    const url = blueprintId ? resolveApiUrl(`/v1/templates?blueprintId=${encodeURIComponent(blueprintId)}`) : resolveApiUrl("/v1/templates");
    const response = await fetch(url);
    const payload = await readJson<{ docs: TemplateRecord[] }>(response);
    setTemplates(payload.docs);
    return payload.docs;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const session =
          effectiveRoute.mode === "launch" && effectiveRoute.value
            ? await fetch(resolveApiUrl(`/v1/launch-sessions/${effectiveRoute.value}`)).then((response) =>
                readJson<LaunchSessionResponse>(response)
              )
            : null;

        const projectId = session?.projectId ?? (effectiveRoute.mode === "project" ? effectiveRoute.value : "");
        if (!projectId) {
          await Promise.allSettled([
            loadTemplates(blueprintForProductRef(selectedStarterProductRef)),
            loadRecentProjects()
          ]);
          setProject(null);
          setDraftDocument(null);
          setLaunchSession(null);
          return;
        }

        const projectData = await fetch(resolveApiUrl(`/v1/projects/${projectId}`)).then((response) =>
          readJson<ProjectResponse>(response)
        );
        const assetData = await fetch(resolveApiUrl("/v1/assets")).then((response) =>
          readJson<{ docs: AssetRecord[] }>(response)
        );

        setLaunchSession(session);
        setProject(projectData);
        setDraftDocument(deepCloneDocument(projectData.document));
        setAssets(assetData.docs);
        setSelectedSurfaceIndex(0);
        setZoom(1);
        setLeftPanel("layers");
        const initialLayerId = getPreferredLayerId(projectData.document.surfaces[0]);
        setSelectedLayerId(initialLayerId);
        setSelectedLayerIds(initialLayerId ? [initialLayerId] : []);
        setSelectedTemplateId(projectData.templateId);
        setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "finish" : "edit");
        void Promise.allSettled([loadTemplates(projectData.blueprintId), loadRecentProjects()]);
      } catch (loadError) {
        if (
          effectiveRoute.mode === "launch" &&
          loadError instanceof Error &&
          (loadError.name === "launch_session_not_found" || loadError.message.includes("launch_session_not_found"))
        ) {
          setRouteFallbackActive(true);
          setError(friendlyLoadError(loadError));
          setProject(null);
          setDraftDocument(null);
          setLaunchSession(null);
          await loadTemplates(blueprintForProductRef(selectedStarterProductRef)).catch(() => undefined);
          await loadRecentProjects().catch(() => undefined);
          return;
        }
        if (
          effectiveRoute.mode === "project" &&
          loadError instanceof Error &&
          (loadError.name === "project_not_found" || loadError.message.includes("project_not_found"))
        ) {
          setRouteFallbackActive(true);
          setError(friendlyLoadError(loadError));
          setProject(null);
          setDraftDocument(null);
          setLaunchSession(null);
          await loadTemplates(blueprintForProductRef(selectedStarterProductRef)).catch(() => undefined);
          await loadRecentProjects().catch(() => undefined);
          return;
        }
        setError(friendlyLoadError(loadError));
        setProject(null);
        setDraftDocument(null);
        setLaunchSession(null);
        await loadTemplates(blueprintForProductRef(selectedStarterProductRef)).catch(() => undefined);
        await loadRecentProjects().catch(() => undefined);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [effectiveRoute.mode, effectiveRoute.value, selectedStarterProductRef]);

  const reloadProject = async (projectId: string) => {
    const projectData = await fetch(resolveApiUrl(`/v1/projects/${projectId}`)).then((response) =>
      readJson<ProjectResponse>(response)
    );
    const assetData = await fetch(resolveApiUrl("/v1/assets")).then((response) =>
      readJson<{ docs: AssetRecord[] }>(response)
    );
    setProject(projectData);
    setDraftDocument(deepCloneDocument(projectData.document));
    setAssets(assetData.docs);
    setSelectedTemplateId(projectData.templateId);
    setLeftPanel("layers");
    setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "finish" : "edit");
    const surfaceLayerId =
      getPreferredLayerId(projectData.document.surfaces[selectedSurfaceIndex]) ??
      getPreferredLayerId(projectData.document.surfaces[0]);
    setSelectedLayerId(surfaceLayerId);
    setSelectedLayerIds(surfaceLayerId ? [surfaceLayerId] : []);
    void Promise.allSettled([loadTemplates(projectData.blueprintId), loadRecentProjects()]);
  };

  const currentSurface = draftDocument?.surfaces[selectedSurfaceIndex] ?? null;
  const selectedLayer = currentSurface?.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedLayers = currentSurface?.layers.filter((layer) => selectedLayerIds.includes(layer.id)) ?? [];
  const isCompactViewport = viewportSize.width <= 720;
  const multiSelectionActive = selectedLayerIds.length > 1;
  const canGroupSelection = multiSelectionActive && selectedLayers.every((layer) => layer.type !== "group");
  const canDistributeSelection = selectedLayerIds.length > 2;
  const canUngroupSelection = !multiSelectionActive && selectedLayer?.type === "group";
  const contextMenuLayer = currentSurface?.layers.find((layer) => layer.id === contextMenu?.layerId) ?? null;
  const layerAsset = selectedLayer
    ? assets.find((asset) => asset.id === String(selectedLayer.metadata.assetId ?? ""))
    : null;
  const compatibleTemplates = useMemo(
    () => templates.filter((template) => template.blueprintId === (project?.blueprintId ?? blueprintForProductRef(selectedStarterProductRef))),
    [project?.blueprintId, selectedStarterProductRef, templates]
  );
  const currentTemplate = compatibleTemplates.find((template) => template.id === (project?.templateId ?? selectedTemplateId)) ?? null;
  const isEditableProject = project?.status === "draft";
  const isStageEditable = isEditableProject && rightPanel === "edit";
  const isReadOnlyPreview = !isEditableProject && rightPanel === "edit";
  const isBlankSurface = (currentSurface?.layers.length ?? 0) === 0;

  const documentSummary = useMemo(
    () => (draftDocument ? summarizeDocument(draftDocument) : null),
    [draftDocument]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!project || !draftDocument) {
      return false;
    }
    return JSON.stringify(project.document) !== JSON.stringify(draftDocument);
  }, [project, draftDocument]);

  useEffect(() => {
    if (!draftDocument) {
      return;
    }
    if (selectedSurfaceIndex > draftDocument.surfaces.length - 1) {
      setSelectedSurfaceIndex(0);
      return;
    }
    const surface = draftDocument.surfaces[selectedSurfaceIndex];
    if (!surface) {
      setSelectedLayerIds([]);
      setSelectedLayerId(null);
      return;
    }
    if (!selectedLayerId || !surface.layers.some((layer) => layer.id === selectedLayerId)) {
      const nextLayerId = getPreferredLayerId(surface);
      setSelectedLayerIds(nextLayerId ? [nextLayerId] : []);
      setSelectedLayerId(nextLayerId);
    }
  }, [draftDocument, selectedLayerId, selectedSurfaceIndex]);

  useEffect(() => {
    if (selectedLayerIds.length > 1) {
      return;
    }
    const nextIds = selectedLayerId ? [selectedLayerId] : [];
    if (selectedLayerIds.length === nextIds.length && selectedLayerIds.every((value, index) => value === nextIds[index])) {
      return;
    }
    setSelectedLayerIds(nextIds);
  }, [selectedLayerId, selectedLayerIds]);

  useEffect(() => {
    if (selectedLayerId && isEditableProject) {
      setRightPanel("edit");
    }
  }, [isEditableProject, selectedLayerId]);

  useEffect(() => {
    if (!selectedLayer || selectedLayer.type !== "image") {
      setCropMode(false);
    }
  }, [selectedLayer]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const close = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (project) {
      return;
    }
    if (compatibleTemplates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }
    if (!selectedTemplateId || !compatibleTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(compatibleTemplates[0]?.id ?? null);
    }
  }, [compatibleTemplates, project, selectedTemplateId]);

  useEffect(() => {
    if (!isEmbedded || !project) {
      return;
    }
    window.parent.postMessage(
      {
        type: "flow2print:status",
        projectId: project.id,
        status: project.status,
        preflightStatus: project.preflightReport?.status ?? null,
        artifactCount: project.artifacts.length
      },
      "*"
    );
  }, [isEmbedded, project]);

  const stageViewportWidth =
    viewportSize.width <= 720 ? Math.max(260, viewportSize.width - 36) : viewportSize.width <= 1120 ? Math.max(360, viewportSize.width - 56) : 820;
  const stageViewportHeight = viewportSize.width <= 720 ? 360 : 620;
  const stageScale = currentSurface
    ? Math.min(stageViewportWidth / currentSurface.artboard.width, stageViewportHeight / currentSurface.artboard.height, 5.5)
    : 1;
  const effectiveScale = stageScale * zoom;

  const updateDraftDocument = (updater: (document: Flow2PrintDocument) => Flow2PrintDocument) => {
    setDraftDocument((document) => (document ? updater(document) : document));
  };

  const captureHistory = (label = "Canvas change") => {
    if (!draftDocument) {
      return;
    }
    setHistoryPast((entries) => [...entries.slice(-39), deepCloneDocument(draftDocument)]);
    setHistoryPastEntries((entries) => [
      ...entries.slice(-39),
      {
        label,
        createdAt: new Date().toISOString(),
        icon: historyIconForLabel(label)
      }
    ]);
    setHistoryFuture([]);
    setHistoryFutureEntries([]);
  };

  const undoChange = () => {
    if (!draftDocument || historyPast.length === 0) {
      return;
    }
    const previous = historyPast[historyPast.length - 1];
    const previousEntry =
      historyPastEntries[historyPastEntries.length - 1] ?? {
        label: "Canvas change",
        createdAt: new Date().toISOString(),
        icon: historyIconForLabel("Canvas change")
      };
    setHistoryPast((entries) => entries.slice(0, -1));
    setHistoryPastEntries((entries) => entries.slice(0, -1));
    setHistoryFuture((entries) => [deepCloneDocument(draftDocument), ...entries.slice(0, 39)]);
    setHistoryFutureEntries((entries) => [previousEntry, ...entries.slice(0, 39)]);
    setDraftDocument(deepCloneDocument(previous));
  };

  const redoChange = () => {
    if (!draftDocument || historyFuture.length === 0) {
      return;
    }
    const [next, ...rest] = historyFuture;
    const [nextEntry, ...restEntries] = historyFutureEntries;
    setHistoryFuture(rest);
    setHistoryFutureEntries(restEntries);
    setHistoryPast((entries) => [...entries.slice(-39), deepCloneDocument(draftDocument)]);
    setHistoryPastEntries((entries) => [
      ...entries.slice(-39),
      nextEntry ?? {
        label: "Canvas change",
        createdAt: new Date().toISOString(),
        icon: historyIconForLabel("Canvas change")
      }
    ]);
    setDraftDocument(deepCloneDocument(next));
  };

  const restoreHistoryEntry = (restoreIndex: number) => {
    if (!draftDocument || restoreIndex < 0 || restoreIndex >= historyPast.length) {
      return;
    }

    const targetDocument = historyPast[restoreIndex];
    const targetEntry = historyPastEntries[restoreIndex];
    const newerDocuments = historyPast.slice(restoreIndex + 1).map((entry) => deepCloneDocument(entry));
    const newerEntries = historyPastEntries.slice(restoreIndex + 1);

    setHistoryFuture([deepCloneDocument(draftDocument), ...newerDocuments, ...historyFuture]);
    setHistoryFutureEntries([
      {
        label: targetEntry?.label ?? "Canvas change",
        createdAt: new Date().toISOString(),
        icon: targetEntry?.icon ?? historyIconForLabel("Canvas change")
      },
      ...newerEntries,
      ...historyFutureEntries
    ]);
    setHistoryPast(historyPast.slice(0, restoreIndex));
    setHistoryPastEntries(historyPastEntries.slice(0, restoreIndex));
    setDraftDocument(deepCloneDocument(targetDocument));
  };

  const clearHistory = () => {
    setHistoryPast([]);
    setHistoryFuture([]);
    setHistoryPastEntries([]);
    setHistoryFutureEntries([]);
  };

  const updateCurrentSurface = (updater: (surface: DesignerSurface) => DesignerSurface) => {
    updateDraftDocument((document) => ({
      ...document,
      surfaces: document.surfaces.map((surface, index) =>
        index === selectedSurfaceIndex ? updater(surface) : surface
      )
    }));
  };

  const updateSelectedLayer = (updater: (layer: DesignerLayer) => DesignerLayer) => {
    if (!selectedLayerId || !currentSurface) {
      return;
    }
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: surface.layers.map((layer) => (layer.id === selectedLayerId ? updater(layer) : layer))
    }));
  };

  const openLayerContextMenu = (
    event: {
      preventDefault: () => void;
      clientX: number;
      clientY: number;
    },
    layerId: string
  ) => {
    event.preventDefault();
    if (!isEditableProject) {
      return;
    }
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
    setContextMenu({
      x: "clientX" in event ? event.clientX : 0,
      y: "clientY" in event ? event.clientY : 0,
      layerId
    });
  };

  const openLayerContextMenuFromElement = (element: Element, layerId: string) => {
    const rect = element.getBoundingClientRect();
    openLayerContextMenu(
      {
        preventDefault: () => undefined,
        clientX: rect.right - 8,
        clientY: rect.bottom + 6
      },
      layerId
    );
  };

  const updateLayerNumericField = (field: "x" | "y" | "width" | "height" | "rotation" | "opacity", value: string) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || !currentSurface) {
      return;
    }
    updateSelectedLayer((layer) => {
      if (field === "width") {
        return { ...layer, width: clamp(numericValue, 8, currentSurface.artboard.width) };
      }
      if (field === "height") {
        return { ...layer, height: clamp(numericValue, 8, currentSurface.artboard.height) };
      }
      if (field === "rotation") {
        return { ...layer, rotation: clamp(numericValue, -180, 180) };
      }
      if (field === "opacity") {
        return { ...layer, opacity: clamp(numericValue, 0.1, 1) };
      }
      return { ...layer, [field]: numericValue };
    });
  };

  const saveDraftDocument = async (document?: Flow2PrintDocument) => {
    if (!project || !draftDocument) {
      return;
    }
    const payloadDocument = document ?? draftDocument;
    setSaving(true);
    try {
      await fetch(resolveApiUrl(`/v1/projects/${project.id}/autosave`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ document: payloadDocument })
      });
      await reloadProject(project.id);
      setHistoryPast([]);
      setHistoryFuture([]);
      setHistoryPastEntries([]);
      setHistoryFutureEntries([]);
    } finally {
      setSaving(false);
    }
  };

  const finalizeProject = async () => {
    if (!project || !draftDocument) {
      return;
    }
    if (hasBlockingIssues) {
      setRightPanel("review");
      return;
    }
    try {
      setFinalizing(true);
      if (hasUnsavedChanges) {
        await saveDraftDocument(draftDocument);
      }
      await fetch(resolveApiUrl(`/v1/projects/${project.id}/finalize`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approvalIntent: "auto",
          proofMode: "digital"
        })
      });
      await reloadProject(project.id);
      setRightPanel("finish");
      setHistoryPast([]);
      setHistoryFuture([]);
      setHistoryPastEntries([]);
      setHistoryFutureEntries([]);
    } finally {
      setFinalizing(false);
    }
  };

  const addTextLayer = () => {
    if (!currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Add text");
    const layerId = `lyr_${crypto.randomUUID()}`;
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: [
        ...surface.layers,
        {
          id: layerId,
          type: "text",
          name: `Text ${surface.layers.length + 1}`,
          visible: true,
          locked: false,
          x: 12,
          y: 12 + surface.layers.length * 6,
          width: Math.max(40, surface.artboard.width - 24),
          height: 24,
          rotation: 0,
          opacity: 1,
          metadata: {
            text: "Type your headline"
          }
        }
      ]
    }));
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const addShapeLayer = () => {
    if (!currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Add shape");
    const layerId = `lyr_${crypto.randomUUID()}`;
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: [
        ...surface.layers,
        {
          id: layerId,
          type: "shape",
          name: `Shape ${surface.layers.length + 1}`,
          visible: true,
          locked: false,
          x: 16,
          y: 16 + surface.layers.length * 8,
          width: 32,
          height: 20,
          rotation: 0,
          opacity: 1,
          metadata: {
            fill: "#dbe8ff"
          }
        }
      ]
    }));
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const addQrLayer = () => {
    if (!currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Add QR code");
    const layerId = `lyr_${crypto.randomUUID()}`;
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: [
        ...surface.layers,
        {
          id: layerId,
          type: "qr",
          name: `QR Code ${surface.layers.length + 1}`,
          visible: true,
          locked: false,
          x: 16,
          y: 16 + surface.layers.length * 8,
          width: 28,
          height: 28,
          rotation: 0,
          opacity: 1,
          metadata: {
            value: "https://flow2print.local"
          }
        }
      ]
    }));
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const addBarcodeLayer = () => {
    if (!currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Add barcode");
    const layerId = `lyr_${crypto.randomUUID()}`;
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: [
        ...surface.layers,
        {
          id: layerId,
          type: "barcode",
          name: `Barcode ${surface.layers.length + 1}`,
          visible: true,
          locked: false,
          x: 18,
          y: 18 + surface.layers.length * 8,
          width: 54,
          height: 18,
          rotation: 0,
          opacity: 1,
          metadata: {
            value: "5901234123457"
          }
        }
      ]
    }));
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const createDemoAsset = async () => {
    if (!project || !currentSurface || !draftDocument) {
      return;
    }
    setContextMenu(null);
    captureHistory("Add sample image");
    setSaving(true);
    try {
      const response = await fetch(resolveApiUrl("/v1/assets"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: `demo-${project.id}.png`,
          kind: "image",
          mimeType: "image/png",
          widthPx: 1800,
          heightPx: 1200
        })
      });
      const asset = await readJson<AssetRecord>(response);
      setAssets((currentAssets) => [asset, ...currentAssets]);
      const layerId = `lyr_${crypto.randomUUID()}`;
      const imageSize = getImageLayerSize(currentSurface);
      const alreadyLinked = draftDocument.assets.some((entry) => entry.assetId === asset.id);
      updateDraftDocument((document) => ({
        ...document,
        assets: alreadyLinked ? document.assets : [...document.assets, { assetId: asset.id, role: "source" }],
        surfaces: document.surfaces.map((surface, index) =>
          index === selectedSurfaceIndex
            ? {
                ...surface,
                layers: [
                  ...surface.layers,
                  {
                    id: layerId,
                    type: "image",
                    name: `Image ${surface.layers.length + 1}`,
                    visible: true,
                    locked: false,
                    x: Math.round((surface.safeBox.x + 4) * 10) / 10,
                    y: Math.round((surface.safeBox.y + 4) * 10) / 10,
                    width: imageSize.width,
                    height: imageSize.height,
                    rotation: 0,
                    opacity: 1,
                    metadata: {
                      assetId: asset.id,
                      fitMode: "cover"
                    }
                  }
                ]
              }
            : surface
        )
      }));
      setSelectedLayerIds([layerId]);
      setSelectedLayerId(layerId);
    } finally {
      setSaving(false);
    }
  };

  const openFilePicker = (mode: "insert" | "replace" = "insert") => {
    setFilePickerMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentSurface || !project || !draftDocument) {
      return;
    }
    setContextMenu(null);
    captureHistory(filePickerMode === "replace" ? "Replace image" : "Upload image");

    const objectUrl = URL.createObjectURL(file);
    const dimensions = await new Promise<{ width: number | null; height: number | null }>((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve({ width: null, height: null });
        return;
      }
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: null, height: null });
      image.src = objectUrl;
    });

    setSaving(true);
    try {
      const response = await fetch(resolveApiUrl("/v1/assets"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: file.name,
          kind: "image",
          mimeType: file.type || "application/octet-stream",
          widthPx: dimensions.width,
          heightPx: dimensions.height
        })
      });
      const asset = await readJson<AssetRecord>(response);
      setAssets((currentAssets) => [asset, ...currentAssets]);
      setLocalAssetUrls((currentUrls) => ({ ...currentUrls, [asset.id]: objectUrl }));
      const alreadyLinked = draftDocument.assets.some((entry) => entry.assetId === asset.id);
      if (filePickerMode === "replace" && selectedLayer?.type === "image") {
        updateDraftDocument((document) => ({
          ...document,
          assets: alreadyLinked ? document.assets : [...document.assets, { assetId: asset.id, role: "source" }],
          surfaces: document.surfaces.map((surface, index) =>
            index === selectedSurfaceIndex
              ? {
                  ...surface,
                  layers: surface.layers.map((layer) =>
                    layer.id === selectedLayer.id
                      ? {
                          ...layer,
                          name: file.name,
                          metadata: {
                            ...layer.metadata,
                            assetId: asset.id
                          }
                        }
                      : layer
                  )
                }
              : surface
          )
        }));
      } else {
        const layerId = `lyr_${crypto.randomUUID()}`;
        const imageSize = getImageLayerSize(currentSurface);
        updateDraftDocument((document) => ({
          ...document,
          assets: alreadyLinked ? document.assets : [...document.assets, { assetId: asset.id, role: "source" }],
          surfaces: document.surfaces.map((surface, index) =>
            index === selectedSurfaceIndex
              ? {
                  ...surface,
                  layers: [
                    ...surface.layers,
                    {
                      id: layerId,
                      type: "image",
                      name: file.name,
                      visible: true,
                      locked: false,
                      x: Math.round((surface.safeBox.x + 4) * 10) / 10,
                      y: Math.round((surface.safeBox.y + 4) * 10) / 10,
                      width: imageSize.width,
                      height: imageSize.height,
                      rotation: 0,
                      opacity: 1,
                      metadata: {
                        assetId: asset.id,
                        fitMode: "cover"
                      }
                    }
                  ]
                }
              : surface
          )
        }));
        setSelectedLayerIds([layerId]);
        setSelectedLayerId(layerId);
      }
    } finally {
      setSaving(false);
      setFilePickerMode("insert");
      event.target.value = "";
    }
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId || !currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Delete item");
    updateDraftDocument((document) =>
      pruneUnusedDocumentAssets({
        ...document,
        surfaces: document.surfaces.map((surface, index) =>
          index === selectedSurfaceIndex
            ? {
                ...surface,
                layers: surface.layers.filter((layer) => layer.id !== selectedLayerId)
              }
            : surface
        )
      })
    );
    const nextLayerId = currentSurface.layers.find((layer) => layer.id !== selectedLayerId)?.id ?? null;
    setSelectedLayerIds(nextLayerId ? [nextLayerId] : []);
    setSelectedLayerId(nextLayerId);
  };

  const deleteSelectedLayers = () => {
    if (!currentSurface || selectedLayerIds.length === 0) {
      return;
    }
    const selectedSet = new Set(selectedLayerIds);
    setContextMenu(null);
    captureHistory(selectedLayerIds.length > 1 ? "Delete selection" : "Delete item");
    updateDraftDocument((document) =>
      pruneUnusedDocumentAssets({
        ...document,
        surfaces: document.surfaces.map((surface, index) =>
          index === selectedSurfaceIndex
            ? {
                ...surface,
                layers: surface.layers.filter((layer) => !selectedSet.has(layer.id))
              }
            : surface
        )
      })
    );
    setSelectedLayerIds([]);
    setSelectedLayerId(null);
  };

  const duplicateSelectedLayer = () => {
    if (!selectedLayer || !currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Duplicate item");
    const layerId = `lyr_${crypto.randomUUID()}`;
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: [
        ...surface.layers,
        {
          ...selectedLayer,
          id: layerId,
          name: `${selectedLayer.name} copy`,
          x: Math.min(selectedLayer.x + 6, Math.max(0, surface.artboard.width - selectedLayer.width)),
          y: Math.min(selectedLayer.y + 6, Math.max(0, surface.artboard.height - selectedLayer.height))
        }
      ]
    }));
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const toggleSelectedLayerFlag = (field: "visible" | "locked") => {
    setContextMenu(null);
    captureHistory(field === "visible" ? "Toggle visibility" : "Toggle lock");
    updateSelectedLayer((layer) => ({
      ...layer,
      [field]: !layer[field]
    }));
  };

  const moveSelectedLayer = (direction: "forward" | "backward") => {
    if (!selectedLayerIds.length) {
      return;
    }
    setContextMenu(null);
    if (direction === "forward") {
      stageRef.current?.bringForward();
      return;
    }
    stageRef.current?.sendBackward();
  };

  const alignSelectedLayer = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedLayer || !currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory(`Align ${mode}`);
    updateSelectedLayer((layer) => {
      const safe = currentSurface.safeBox;
      if (mode === "left") {
        return { ...layer, x: safe.x };
      }
      if (mode === "center") {
        return { ...layer, x: Math.round((safe.x + (safe.width - layer.width) / 2) * 10) / 10 };
      }
      if (mode === "right") {
        return { ...layer, x: Math.round((safe.x + safe.width - layer.width) * 10) / 10 };
      }
      if (mode === "top") {
        return { ...layer, y: safe.y };
      }
      if (mode === "middle") {
        return { ...layer, y: Math.round((safe.y + (safe.height - layer.height) / 2) * 10) / 10 };
      }
      return { ...layer, y: Math.round((safe.y + safe.height - layer.height) * 10) / 10 };
    });
  };

  const reorderLayer = (fromLayerId: string, toLayerId: string) => {
    if (!currentSurface || fromLayerId === toLayerId) {
      return;
    }
    captureHistory("Reorder layers");
    updateCurrentSurface((surface) => {
      const fromIndex = surface.layers.findIndex((layer) => layer.id === fromLayerId);
      const toIndex = surface.layers.findIndex((layer) => layer.id === toLayerId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return surface;
      }
      const nextLayers = [...surface.layers];
      const [moved] = nextLayers.splice(fromIndex, 1);
      nextLayers.splice(toIndex, 0, moved);
      return {
        ...surface,
        layers: nextLayers
      };
    });
  };

  const placeExistingAsset = (asset: AssetRecord) => {
    if (!currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory("Place existing image");
    const layerId = `lyr_${crypto.randomUUID()}`;
    const imageSize = getImageLayerSize(currentSurface);
    updateDraftDocument((document) => {
      const alreadyLinked = document.assets.some((entry) => entry.assetId === asset.id);
      return {
        ...document,
        assets: alreadyLinked ? document.assets : [...document.assets, { assetId: asset.id, role: "source" }],
        surfaces: document.surfaces.map((surface, index) =>
          index === selectedSurfaceIndex
            ? {
                ...surface,
                layers: [
                  ...surface.layers,
                  {
                    id: layerId,
                    type: "image",
                    name: asset.filename,
                    visible: true,
                    locked: false,
                    x: Math.round((surface.safeBox.x + 4) * 10) / 10,
                    y: Math.round((surface.safeBox.y + 4) * 10) / 10,
                    width: imageSize.width,
                    height: imageSize.height,
                    rotation: 0,
                    opacity: 1,
                    metadata: {
                      assetId: asset.id,
                      fitMode: "cover"
                    }
                  }
                ]
              }
            : surface
        )
      };
    });
    setSelectedLayerIds([layerId]);
    setSelectedLayerId(layerId);
  };

  const groupSelectedLayers = () => {
    if (!currentSurface || selectedLayerIds.length < 2) {
      return;
    }
    const selectedSet = new Set(selectedLayerIds);
    const selectedLayers = currentSurface.layers.filter((layer) => selectedSet.has(layer.id));
    if (selectedLayers.length < 2) {
      return;
    }
    captureHistory("Group items");
    const minX = Math.min(...selectedLayers.map((layer) => layer.x));
    const minY = Math.min(...selectedLayers.map((layer) => layer.y));
    const maxX = Math.max(...selectedLayers.map((layer) => layer.x + layer.width));
    const maxY = Math.max(...selectedLayers.map((layer) => layer.y + layer.height));
    const insertIndex = currentSurface.layers.findIndex((layer) => selectedSet.has(layer.id));
    const groupId = `lyr_${crypto.randomUUID()}`;
    const groupLayer: DesignerLayer = {
      id: groupId,
      type: "group",
      name: `Group ${currentSurface.layers.length - selectedLayers.length + 1}`,
      visible: true,
      locked: false,
      x: Number(minX.toFixed(2)),
      y: Number(minY.toFixed(2)),
      width: Number((maxX - minX).toFixed(2)),
      height: Number((maxY - minY).toFixed(2)),
      rotation: 0,
      opacity: 1,
      metadata: {
        children: selectedLayers.map((layer) => deepCloneLayer(layer))
      }
    };
    updateCurrentSurface((surface) => {
      const unselected = surface.layers.filter((layer) => !selectedSet.has(layer.id));
      const nextLayers = [...unselected];
      nextLayers.splice(Math.max(insertIndex, 0), 0, groupLayer);
      return {
        ...surface,
        layers: nextLayers
      };
    });
    setSelectedLayerIds([groupId]);
    setSelectedLayerId(groupId);
  };

  const ungroupSelectedLayer = () => {
    if (!selectedLayer || selectedLayer.type !== "group" || !currentSurface) {
      return;
    }
    const children = Array.isArray(selectedLayer.metadata.children)
      ? (selectedLayer.metadata.children as DesignerLayer[])
      : [];
    if (children.length === 0) {
      return;
    }
    captureHistory("Ungroup items");
    updateCurrentSurface((surface) => {
      const groupIndex = surface.layers.findIndex((layer) => layer.id === selectedLayer.id);
      const nextLayers = [...surface.layers.filter((layer) => layer.id !== selectedLayer.id)];
      nextLayers.splice(groupIndex, 0, ...children);
      return {
        ...surface,
        layers: nextLayers
      };
    });
    setSelectedLayerIds(children.map((child) => child.id));
    setSelectedLayerId(children[0]?.id ?? null);
  };

  const distributeSelectedLayers = (axis: "horizontal" | "vertical") => {
    if (!currentSurface || selectedLayerIds.length < 3) {
      return;
    }
    const selectedSet = new Set(selectedLayerIds);
    const selectedLayers = currentSurface.layers.filter((layer) => selectedSet.has(layer.id));
    const sortedLayers = [...selectedLayers].sort((left, right) => (axis === "horizontal" ? left.x - right.x : left.y - right.y));
    const first = sortedLayers[0];
    const last = sortedLayers[sortedLayers.length - 1];
    const distance = axis === "horizontal" ? last.x - first.x : last.y - first.y;
    const step = distance / (sortedLayers.length - 1);
    captureHistory(axis === "horizontal" ? "Distribute horizontally" : "Distribute vertically");
    updateCurrentSurface((surface) => ({
      ...surface,
      layers: surface.layers.map((layer) => {
        const selectedIndex = sortedLayers.findIndex((entry) => entry.id === layer.id);
        if (selectedIndex <= 0 || selectedIndex === sortedLayers.length - 1) {
          return layer;
        }
        return axis === "horizontal"
          ? {
              ...layer,
              x: Number((first.x + step * selectedIndex).toFixed(2))
            }
          : {
              ...layer,
              y: Number((first.y + step * selectedIndex).toFixed(2))
            };
      })
    }));
  };

  const updateSelectedImageCrop = (field: "cropX" | "cropY", value: number) => {
    if (!selectedLayer || selectedLayer.type !== "image") {
      return;
    }
    captureHistory(field === "cropX" ? "Adjust crop horizontally" : "Adjust crop vertically");
    updateSelectedLayer((layer) => ({
      ...layer,
      metadata: {
        ...layer.metadata,
        [field]: clamp(Number(value) || 0, 0, 4096)
      }
    }));
  };

  const selectLayerIds = (nextIds: string[]) => {
    setSelectedLayerIds(nextIds);
    setSelectedLayerId(nextIds[0] ?? null);
  };

  const handleLayerSelection = (layerId: string, additive = false) => {
    if (!additive) {
      selectLayerIds([layerId]);
      return;
    }
    setSelectedLayerIds((currentIds) => {
      const nextIds = currentIds.includes(layerId)
        ? currentIds.filter((currentId) => currentId !== layerId)
        : [...currentIds, layerId];
      setSelectedLayerId(nextIds[0] ?? null);
      return nextIds;
    });
  };

  const selectSurface = (index: number) => {
    if (!draftDocument) {
      return;
    }
    const surface = draftDocument.surfaces[index];
    setSelectedSurfaceIndex(index);
    setSelectedLayerIds(surface?.layers[0]?.id ? [surface.layers[0].id] : []);
    setSelectedLayerId(surface?.layers[0]?.id ?? null);
    setCropMode(false);
  };

  const renameCurrentSurface = (label: string) => {
    if (!currentSurface) {
      return;
    }
    updateCurrentSurface((surface) => ({
      ...surface,
      label
    }));
  };

  const addSurface = () => {
    if (!draftDocument || !currentSurface) {
      return;
    }
    captureHistory("Add side");
    const nextSurface: DesignerSurface = {
      ...currentSurface,
      surfaceId: `surface_${crypto.randomUUID()}`,
      label: `Side ${draftDocument.surfaces.length + 1}`,
      layers: []
    };
    updateDraftDocument((document) => ({
      ...document,
      surfaces: [...document.surfaces, nextSurface]
    }));
    setSelectedSurfaceIndex(draftDocument.surfaces.length);
    setSelectedLayerIds([]);
    setSelectedLayerId(null);
  };

  const duplicateCurrentSurface = () => {
    if (!draftDocument || !currentSurface) {
      return;
    }
    captureHistory("Duplicate side");
    const duplicatedSurface: DesignerSurface = {
      ...currentSurface,
      surfaceId: `surface_${crypto.randomUUID()}`,
      label: `${currentSurface.label} copy`,
      layers: currentSurface.layers.map((layer) => ({
        ...layer,
        id: `lyr_${crypto.randomUUID()}`,
        name: `${layer.name}`
      }))
    };
    updateDraftDocument((document) => ({
      ...document,
      surfaces: [
        ...document.surfaces.slice(0, selectedSurfaceIndex + 1),
        duplicatedSurface,
        ...document.surfaces.slice(selectedSurfaceIndex + 1)
      ]
    }));
    setSelectedSurfaceIndex(selectedSurfaceIndex + 1);
    setSelectedLayerIds(duplicatedSurface.layers[0]?.id ? [duplicatedSurface.layers[0].id] : []);
    setSelectedLayerId(duplicatedSurface.layers[0]?.id ?? null);
  };

  const removeCurrentSurface = () => {
    if (!draftDocument || draftDocument.surfaces.length <= 1 || !currentSurface) {
      return;
    }
    if (!window.confirm(`Remove ${currentSurface.label}?`)) {
      return;
    }
    captureHistory("Remove side");
    updateDraftDocument((document) => ({
      ...document,
      surfaces: document.surfaces.filter((_, index) => index !== selectedSurfaceIndex)
    }));
    setSelectedSurfaceIndex((value) => Math.max(0, value - 1));
    setSelectedLayerIds([]);
    setSelectedLayerId(null);
  };

  const linkCommerce = async (mode: "quote" | "order") => {
    if (!project) {
      return;
    }
    setSyncingCommerce(true);
    try {
      const endpoint =
        mode === "quote" ? "/v1/connectors/magento2/quote-links" : "/v1/connectors/magento2/order-links";
      const payload =
        mode === "quote"
          ? {
              projectId: project.id,
              externalQuoteRef: `quote-${project.id.slice(-8)}`,
              externalStoreId: "default",
              externalProductRef: project.externalProductRef
            }
          : {
              projectId: project.id,
              externalOrderRef: `order-${project.id.slice(-8)}`,
              externalStoreId: "default",
              externalProductRef: project.externalProductRef
            };

      await fetch(resolveApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      await reloadProject(project.id);
    } finally {
      setSyncingCommerce(false);
    }
  };

  const resetDraft = () => {
    if (!project) {
      return;
    }
    setHistoryPast([]);
    setHistoryFuture([]);
    setHistoryPastEntries([]);
    setHistoryFutureEntries([]);
    setDraftDocument(deepCloneDocument(project.document));
    setSelectedSurfaceIndex(0);
    setSelectedLayerIds(project.document.surfaces[0]?.layers[0]?.id ? [project.document.surfaces[0].layers[0].id] : []);
    setSelectedLayerId(project.document.surfaces[0]?.layers[0]?.id ?? null);
  };

  const openProject = (projectId: string) => {
    window.location.href = resolveDesignerUrl(`/designer/project/${projectId}${isEmbedded ? "?embedded=1" : ""}`);
  };

  const applyTemplate = async (templateId: string | null) => {
    if (!project) {
      return;
    }

    const hasContent = draftDocument ? draftDocument.surfaces.some((surface) => surface.layers.length > 0) : false;
    if (hasContent && !window.confirm("Applying another template replaces the current layout on this project. Continue?")) {
      return;
    }

    setTemplateBusy(true);
    try {
      await fetch(resolveApiUrl(`/v1/projects/${project.id}/apply-template`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ templateId })
      });
      await reloadProject(project.id);
      setOverlay(null);
      setSelectedSurfaceIndex(0);
      setRightPanel("edit");
      setHistoryPast([]);
      setHistoryFuture([]);
      setHistoryPastEntries([]);
      setHistoryFutureEntries([]);
    } finally {
      setTemplateBusy(false);
    }
  };

  const createProject = async (productRef: string, templateId?: string | null) => {
    setSaving(true);
    try {
      const response = await fetch(resolveApiUrl("/v1/launch-sessions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          connectorType: "magento2",
          externalStoreId: "default",
          externalProductRef: productRef,
          templateId,
          customer: {
            email: "demo@flow2print.local",
            isGuest: false
          },
          locale: "en-US",
          currency: "USD",
          returnUrl: CONNECTOR_RETURN_URL,
          options: {}
        })
      });
      const payload = await readJson<{ designerUrl: string }>(response);
      const designerUrl = resolveDesignerUrl(payload.designerUrl);
      window.location.href = isEmbedded ? `${designerUrl}?embedded=1` : designerUrl;
    } finally {
      setSaving(false);
    }
  };

  const closeWorkspace = () => {
    if (isEmbedded) {
      window.parent.postMessage(
        {
          type: "flow2print:close",
          projectId: project?.id ?? null,
          status: project?.status ?? null
        },
        "*"
      );
      return;
    }
    window.location.href = resolveDesignerUrl("/designer");
  };

  const openExportPanel = () => {
    setRightPanel("finish");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey));
      const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      const isDelete = event.key === "Delete" || event.key === "Backspace";
      const step = event.shiftKey ? 5 : 1;

      if (isUndo) {
        event.preventDefault();
        undoChange();
      } else if (isRedo) {
        event.preventDefault();
        redoChange();
      } else if (isSave && isEditableProject && hasUnsavedChanges) {
        event.preventDefault();
        void saveDraftDocument();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSelectedLayerIds([]);
        setSelectedLayerId(null);
        setContextMenu(null);
      } else if (isEditableProject && selectedLayerIds.length > 0 && isDelete) {
        event.preventDefault();
        deleteSelectedLayers();
      } else if (isEditableProject && selectedLayer && currentSurface && event.key.startsWith("Arrow")) {
        event.preventDefault();
        captureHistory(`Nudge ${event.key.replace("Arrow", "").toLowerCase()}`);
        updateSelectedLayer((layer) => ({
          ...layer,
          x:
            event.key === "ArrowLeft"
              ? snapToStep(clamp(layer.x - step, 0, Math.max(0, currentSurface.artboard.width - layer.width)), snapEnabled)
              : event.key === "ArrowRight"
                ? snapToStep(clamp(layer.x + step, 0, Math.max(0, currentSurface.artboard.width - layer.width)), snapEnabled)
                : layer.x,
          y:
            event.key === "ArrowUp"
              ? snapToStep(clamp(layer.y - step, 0, Math.max(0, currentSurface.artboard.height - layer.height)), snapEnabled)
              : event.key === "ArrowDown"
                ? snapToStep(clamp(layer.y + step, 0, Math.max(0, currentSurface.artboard.height - layer.height)), snapEnabled)
                : layer.y
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSurface, hasUnsavedChanges, historyFuture, historyPast, isEditableProject, selectedLayer, selectedLayerIds, snapEnabled]);

  const linkedAssets = useMemo(() => {
    if (!draftDocument) {
      return [];
    }
    return draftDocument.assets
      .map((entry) => assets.find((asset) => asset.id === entry.assetId))
      .filter((asset): asset is AssetRecord => Boolean(asset));
  }, [assets, draftDocument]);
  const availableImageAssets = useMemo(() => assets.filter((asset) => asset.kind === "image"), [assets]);
  const filteredImageAssets = useMemo(() => {
    const query = assetSearchQuery.trim().toLowerCase();
    return availableImageAssets
      .filter((asset) => {
        if (!query) {
          return true;
        }
        return asset.filename.toLowerCase().includes(query) || asset.mimeType.toLowerCase().includes(query);
      })
      .map((asset) => ({
        ...asset,
        previewUrl: localAssetUrls[asset.id] ?? resolveApiUrl(`/v1/assets/${asset.id}/file`),
        linked: linkedAssets.some((linkedAsset) => linkedAsset.id === asset.id)
      }));
  }, [assetSearchQuery, availableImageAssets, linkedAssets, localAssetUrls]);
  const recentHistoryEntries = useMemo(
    () =>
      historyPastEntries
        .slice(-6)
        .reverse()
        .map((entry, index) => ({
          id: `${entry.label}-${entry.createdAt}-${index}`,
          label: entry.label,
          icon: entry.icon,
          relativeTime: formatRelativeTime(entry.createdAt),
          timeLabel: formatShortTime(entry.createdAt),
          restoreIndex: historyPast.length - 1 - index
        })),
    [historyPast.length, historyPastEntries]
  );

  const selectedLayerLayoutStatus = useMemo(() => {
    if (!selectedLayer || !currentSurface) {
      return null;
    }

    const withinSafeArea =
      selectedLayer.x >= currentSurface.safeBox.x &&
      selectedLayer.y >= currentSurface.safeBox.y &&
      selectedLayer.x + selectedLayer.width <= currentSurface.safeBox.x + currentSurface.safeBox.width &&
      selectedLayer.y + selectedLayer.height <= currentSurface.safeBox.y + currentSurface.safeBox.height;

    return withinSafeArea
      ? {
          tone: "badge badge--success",
          text: "Selected item sits inside the safe area."
        }
      : {
          tone: "badge badge--warning",
          text: "Selected item touches or extends beyond the safe area."
        };
  }, [currentSurface, selectedLayer]);

  const liveChecks = useMemo(() => {
    if (!currentSurface) {
      return [];
    }

    const issues: Array<{ severity: "info" | "warning" | "blocking"; message: string }> = [];
    const visibleLayerCount = currentSurface.layers.filter((layer) => layer.visible).length;

    if (currentSurface.layers.length === 0) {
      issues.push({ severity: "blocking", message: "Add at least one item before creating print files." });
    }

    if (currentSurface.layers.length > 0 && visibleLayerCount === 0) {
      issues.push({ severity: "blocking", message: "Show at least one item before creating print files." });
    }

    currentSurface.layers.forEach((layer) => {
      if (!layer.visible) {
        issues.push({ severity: "info", message: `${layer.name} is hidden.` });
      }
      if (layer.type === "text" && !String(layer.metadata.text ?? "").trim()) {
        issues.push({ severity: "blocking", message: `${layer.name} has no text content.` });
      }
      if (layer.x < currentSurface.safeBox.x || layer.y < currentSurface.safeBox.y) {
        issues.push({ severity: "warning", message: `${layer.name} starts outside the safe area.` });
      }
      if (
        layer.x + layer.width > currentSurface.safeBox.x + currentSurface.safeBox.width ||
        layer.y + layer.height > currentSurface.safeBox.y + currentSurface.safeBox.height
      ) {
        issues.push({ severity: "warning", message: `${layer.name} extends beyond the safe area.` });
      }
      if (layer.type === "image" && !layer.metadata.assetId) {
        issues.push({ severity: "blocking", message: `${layer.name} has no linked asset.` });
      }
    });

    return issues;
  }, [currentSurface]);
  const hasBlockingIssues = liveChecks.some((issue) => issue.severity === "blocking");

  const renderLauncher = () => (
    <DesignerLauncher
      starterProducts={starterProducts}
      selectedStarterProductRef={selectedStarterProductRef}
      selectedTemplateId={selectedTemplateId}
      compatibleTemplates={compatibleTemplates.map((template) => ({
        id: template.id,
        displayName: template.displayName,
        description: template.description
      }))}
      recentProjects={recentProjects.map((item) => ({
        id: item.id,
        title: item.title,
        externalProductRef: item.externalProductRef,
        statusBadge: humanizeStatus(item.status),
        preflightBadge: {
          className: badgeTone(item.preflightStatus),
          label: item.preflightStatus ?? "not run"
        }
      }))}
      saving={saving}
      onSelectStarterProduct={setSelectedStarterProductRef}
      onSelectTemplate={setSelectedTemplateId}
      onCreateBlankProject={(productRef) => void createProject(productRef)}
      onCreateTemplateProject={(productRef, templateId) => void createProject(productRef, templateId)}
      onOpenProject={openProject}
    />
  );

  const renderNavigatorContent = () => {
    if (!project || !draftDocument || !currentSurface || !documentSummary) {
      return null;
    }

    if (leftPanel === "layers") {
      return (
        <DesignerNavigatorPanel
          title="Layers"
          summary=""
          description=""
          footer={
            isEditableProject ? (
              <>
                <button
                  type="button"
                  className="icon-button"
                  title="Session history"
                  aria-label="Session history"
                  onClick={() => setLeftPanel("history")}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    stat_1
                  </span>
                </button>
                <div className="navigator-footer__actions">
                  <button
                    type="button"
                    className="icon-button"
                    title="Group selection"
                    aria-label="Group selection"
                    onClick={groupSelectedLayers}
                    disabled={!canGroupSelection}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      layers
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Delete selection"
                    aria-label="Delete selection"
                    onClick={deleteSelectedLayers}
                    disabled={selectedLayerIds.length === 0}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
              </>
            ) : null
          }
          content={
          <>
            <div className="layer-list">
              {currentSurface.layers.length === 0 ? <div className="empty-state">No items on this side yet.</div> : null}
              {currentSurface.layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`layer-row ${layer.id === selectedLayerId ? "layer-row--active" : ""} ${
                    draggingLayerId === layer.id ? "layer-row--dragging" : ""
                  } ${dropTargetLayerId === layer.id ? "layer-row--drop-target" : ""}`}
                  onClick={(event) => {
                    handleLayerSelection(layer.id, event.shiftKey || event.metaKey || event.ctrlKey);
                  }}
                  onContextMenu={(event) => openLayerContextMenu(event, layer.id)}
                  role="button"
                  tabIndex={0}
                  draggable={isEditableProject}
                  onDragStart={(event) => {
                    if (!isEditableProject) {
                      return;
                    }
                    setDraggingLayerId(layer.id);
                    setDropTargetLayerId(layer.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", layer.id);
                  }}
                  onDragOver={(event) => {
                    if (!isEditableProject || !draggingLayerId) {
                      return;
                    }
                    event.preventDefault();
                    setDropTargetLayerId(layer.id);
                  }}
                  onDrop={(event) => {
                    if (!isEditableProject) {
                      return;
                    }
                    event.preventDefault();
                    const fromLayerId = event.dataTransfer.getData("text/plain") || draggingLayerId;
                    if (fromLayerId) {
                      reorderLayer(fromLayerId, layer.id);
                    }
                    setDraggingLayerId(null);
                    setDropTargetLayerId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingLayerId(null);
                    setDropTargetLayerId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleLayerSelection(layer.id);
                    }
                  }}
                >
                  <span className={`layer-row__preview layer-row__preview--${layer.type}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {layerPreviewIcon(layer)}
                    </span>
                  </span>
                  <span className="layer-row__content">
                    <strong>{layer.name}</strong>
                    <small>{layer.type}</small>
                  </span>
                  <div className="layer-row__actions">
                    <button
                      type="button"
                      className={`icon-button ${layer.visible ? "" : "icon-button--muted"}`}
                      aria-label={layer.visible ? "Hide layer" : "Show layer"}
                      title={layer.visible ? "Hide layer" : "Show layer"}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isEditableProject) {
                          return;
                        }
                        setSelectedLayerIds([layer.id]);
                        setSelectedLayerId(layer.id);
                        captureHistory("Toggle visibility");
                        updateDraftDocument((document) => ({
                          ...document,
                          surfaces: document.surfaces.map((surface, surfaceIndex) =>
                            surfaceIndex === selectedSurfaceIndex
                              ? {
                                  ...surface,
                                  layers: surface.layers.map((surfaceLayer) =>
                                    surfaceLayer.id === layer.id
                                      ? {
                                          ...surfaceLayer,
                                          visible: !surfaceLayer.visible
                                        }
                                      : surfaceLayer
                                  )
                                }
                              : surface
                          )
                        }));
                      }}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {layer.visible ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`icon-button ${layer.locked ? "icon-button--muted" : ""}`}
                      aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                      title={layer.locked ? "Unlock layer" : "Lock layer"}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isEditableProject) {
                          return;
                        }
                        setSelectedLayerIds([layer.id]);
                        setSelectedLayerId(layer.id);
                        captureHistory("Toggle lock");
                        updateDraftDocument((document) => ({
                          ...document,
                          surfaces: document.surfaces.map((surface, surfaceIndex) =>
                            surfaceIndex === selectedSurfaceIndex
                              ? {
                                  ...surface,
                                  layers: surface.layers.map((surfaceLayer) =>
                                    surfaceLayer.id === layer.id
                                      ? {
                                          ...surfaceLayer,
                                          locked: !surfaceLayer.locked
                                        }
                                      : surfaceLayer
                                  )
                                }
                              : surface
                          )
                        }));
                      }}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {layer.locked ? "lock" : "lock_open"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
          }
        />
      );
    }

    if (leftPanel === "assets") {
      return (
        <DesignerAssetsPanel
          assets={filteredImageAssets}
          searchQuery={assetSearchQuery}
          onSearchQueryChange={setAssetSearchQuery}
          onUpload={() => openFilePicker("insert")}
          onUseAsset={(assetId) => {
            const asset = availableImageAssets.find((entry) => entry.id === assetId);
            if (asset) {
              placeExistingAsset(asset);
            }
          }}
          isEditableProject={isEditableProject}
        />
      );
    }

    return (
      <DesignerHistoryPanel
        statusLabel={humanizeStatus(project.status)}
        templateName={currentTemplate?.displayName ?? "Blank start"}
        hasUnsavedChanges={hasUnsavedChanges}
        undoCount={historyPast.length}
        entries={recentHistoryEntries}
        onRestore={restoreHistoryEntry}
        onClear={clearHistory}
      />
    );
  };

  const renderWorkspace = () => {
    if (!project || !draftDocument || !currentSurface || !documentSummary) {
      return null;
    }

    return (
      <div className={`workspace-shell ${isEmbedded ? "workspace-shell--embedded" : ""}`}>
        <DesignerWorkspaceTopbar
          projectTitle={
            <span className="workspace-title__brand">
              <span className="material-symbols-outlined" aria-hidden="true">
                print
              </span>
              <span>{project.title}</span>
            </span>
          }
          statusLine={
            <>
              <span className="workspace-statusline__label">Status:</span>
              <span className={`status-pill ${saving ? "status-pill--working" : hasUnsavedChanges ? "status-pill--warning" : "status-pill--saved"}`}>
                <span className="status-pill__dot" aria-hidden="true" />
                {saving ? "Saving" : hasUnsavedChanges ? "Unsaved" : "Saved"}
              </span>
            </>
          }
          mode={rightPanel}
          onModeChange={setRightPanel}
          editLabel={isEditableProject ? "Design" : "Preview"}
          tools={
            rightPanel === "edit" ? (
              <>
                {isEditableProject ? (
                  <div className="workspace-tool-group">
                    <button
                      type="button"
                      className="workspace-tool-button workspace-tool-button--icon"
                      onClick={undoChange}
                      disabled={historyPast.length === 0}
                      aria-label="Undo"
                      title="Undo"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        undo
                      </span>
                    </button>
                    <button
                      type="button"
                      className="workspace-tool-button workspace-tool-button--icon"
                      onClick={redoChange}
                      disabled={historyFuture.length === 0}
                      aria-label="Redo"
                      title="Redo"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        redo
                      </span>
                    </button>
                  </div>
                ) : null}
                <div className="workspace-tool-group workspace-tool-group--zoom">
                  <button
                    type="button"
                    className="workspace-tool-button workspace-tool-button--icon"
                    onClick={() => setZoom((value) => clamp(value - 0.1, 0.5, 2))}
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      remove
                    </span>
                  </button>
                  <button type="button" className="workspace-tool-button workspace-tool-button--label" onClick={() => setZoom(1)}>
                    Fit
                  </button>
                  <button
                    type="button"
                    className="workspace-tool-button workspace-tool-button--icon"
                    onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 2))}
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      add
                    </span>
                  </button>
                  <span className="workspace-tool-group__divider" aria-hidden="true" />
                  <span className="workspace-tool-zoom-label">{Math.round(zoom * 100)}%</span>
                </div>
              </>
            ) : null
          }
          actions={
            <button
              type="button"
              className="workspace-tool-button workspace-tool-button--icon"
              onClick={() => setOverlay("menu")}
              aria-label="More actions"
              title="More actions"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                more_horiz
              </span>
            </button>
          }
        />

        <section
          className={`workspace-layout ${
            rightPanel === "edit" && !isCompactViewport && isEditableProject
              ? "workspace-layout--with-sidebar"
              : "workspace-layout--preview"
          }`}
        >
          {rightPanel === "edit" && isEditableProject ? (
            <DesignerToolRail
              isEditableProject={isEditableProject}
              saving={saving}
              activeUtilityPanel={leftPanel}
              onOpenUtilityPanel={(panel) => {
                setLeftPanel(panel);
                if (isCompactViewport) {
                  setOverlay("navigator");
                }
              }}
              onAddText={addTextLayer}
              onAddImage={() => openFilePicker("insert")}
              onAddShape={addShapeLayer}
              onOpenMenu={() => setOverlay("menu")}
            />
          ) : null}

          {rightPanel === "edit" && !isCompactViewport && isEditableProject ? (
            <aside className="workspace-sidebar workspace-sidebar--navigator">{renderNavigatorContent()}</aside>
          ) : null}

          <section className="workspace-stage workspace-stage--primary">
            <div className="stage-header stage-header--editor">
              <div className="stage-header__crumbs">
                <span>Workspace /</span>
                <h2>
                  {currentSurface.label} ({currentSurface.artboard.width}×{currentSurface.artboard.height}mm)
                </h2>
              </div>
              <div className="badge-row">
                <span className="badge badge--neutral">{currentSurface.layers.length} items on canvas</span>
              </div>
            </div>
            {hasBlockingIssues && !isBlankSurface && rightPanel !== "review" ? (
              <div className="workspace-alert workspace-alert--warning">
                <div>
                  <strong>Review required</strong>
                  <p>Fix blocking issues before files can be created.</p>
                </div>
                <button type="button" className="button--ghost" onClick={() => setRightPanel("review")}>
                  Open review
                </button>
              </div>
            ) : null}

            <div className="stage-wrapper">
              {rightPanel === "edit" && selectedLayerLayoutStatus && selectedLayerLayoutStatus.tone !== "badge badge--success" ? (
                <div className="layout-status-row">
                  <span className={selectedLayerLayoutStatus.tone}>{selectedLayerLayoutStatus.text}</span>
                </div>
              ) : null}
              {isEditableProject && rightPanel === "edit" && (cropMode || multiSelectionActive) ? (
                <div className={`selection-toolbar ${cropMode ? "selection-toolbar--crop" : ""}`}>
                  <div className="selection-toolbar__intro">
                    <strong>{multiSelectionActive ? `${selectedLayerIds.length} items selected` : selectedLayer?.name}</strong>
                    <span>
                      {cropMode && selectedLayer?.type === "image"
                        ? "crop mode"
                        : multiSelectionActive
                          ? "multi selection"
                          : selectedLayer?.type}
                    </span>
                  </div>
                  <div className="selection-toolbar__actions">
                    {cropMode && selectedLayer?.type === "image" ? (
                      <>
                        <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropX", Number(selectedLayer.metadata.cropX ?? 0) - 2)}>
                          Left
                        </button>
                        <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropX", Number(selectedLayer.metadata.cropX ?? 0) + 2)}>
                          Right
                        </button>
                        <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropY", Number(selectedLayer.metadata.cropY ?? 0) - 2)}>
                          Up
                        </button>
                        <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropY", Number(selectedLayer.metadata.cropY ?? 0) + 2)}>
                          Down
                        </button>
                        <button
                          type="button"
                          className="button--ghost"
                          onClick={() =>
                            updateSelectedLayer((layer) => ({
                              ...layer,
                              metadata: {
                                ...layer.metadata,
                                cropX: 0,
                                cropY: 0
                              }
                            }))
                          }
                        >
                          Reset
                        </button>
                        <button type="button" onClick={() => setCropMode(false)}>
                          Done
                        </button>
                      </>
                    ) : null}
                    {!cropMode && !multiSelectionActive && selectedLayer ? (
                      <>
                        <button type="button" className="button--ghost" onClick={duplicateSelectedLayer}>
                          Duplicate
                        </button>
                        {selectedLayer.type === "image" ? (
                          <button type="button" className="button--ghost" onClick={() => setCropMode(true)}>
                            Crop image
                          </button>
                        ) : null}
                        {canUngroupSelection ? (
                          <button type="button" className="button--ghost" onClick={ungroupSelectedLayer}>
                            Ungroup
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button--ghost"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openLayerContextMenuFromElement(event.currentTarget, selectedLayer.id);
                          }}
                        >
                          More actions
                        </button>
                      </>
                    ) : null}
                    {!cropMode && multiSelectionActive ? (
                      <>
                        <button type="button" className="button--ghost" onClick={groupSelectedLayers} disabled={!canGroupSelection}>
                          Group
                        </button>
                        <button type="button" className="button--ghost" onClick={() => distributeSelectedLayers("horizontal")} disabled={!canDistributeSelection}>
                          Space H
                        </button>
                        <button type="button" className="button--ghost" onClick={() => distributeSelectedLayers("vertical")} disabled={!canDistributeSelection}>
                          Space V
                        </button>
                      </>
                    ) : null}
                    {!cropMode ? (
                    <button type="button" className="button--ghost" onClick={deleteSelectedLayers}>
                      Delete
                    </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {cropMode && selectedLayer?.type === "image" ? (
                <div className="crop-mode-banner">
                  <div>
                    <strong>Crop mode</strong>
                    <p>Move the image inside its frame, then confirm.</p>
                  </div>
                  <button type="button" className="button--ghost" onClick={() => setCropMode(false)}>
                    Exit crop mode
                  </button>
                </div>
              ) : null}
              <div className="artboard-shell">
                <div
                  className={`artboard ${gridEnabled ? "" : "artboard--gridless"}`}
                  style={{
                    width: currentSurface.artboard.width * effectiveScale,
                    height: currentSurface.artboard.height * effectiveScale
                  }}
                  onClick={() => {
                    setSelectedLayerIds([]);
                    setSelectedLayerId(null);
                  }}
                >
                  {currentSurface.layers.length === 0 ? (
                    <div className="artboard__empty">
                      <strong>Start this side</strong>
                      <p>Use the left toolbar to add text, images, or shapes.</p>
                    </div>
                  ) : null}
                  {currentSurface.layers.length > 0 ? (
                    <DesignerStagePreview
                      surface={currentSurface}
                      scale={effectiveScale}
                      selectedLayerIds={selectedLayerIds}
                      assetUrls={localAssetUrls}
                      onSelectLayerIds={selectLayerIds}
                    />
                  ) : null}
                  <FabricCanvasStage
                    ref={stageRef}
                    surface={currentSurface}
                    assetUrls={localAssetUrls}
                    zoom={zoom}
                    maxWidth={stageViewportWidth}
                    maxHeight={stageViewportHeight}
                    cropMode={cropMode}
                    cropLayerId={cropMode ? selectedLayer?.id ?? null : null}
                    gridEnabled={gridEnabled}
                    guidesVisible={guidesVisible}
                    isEditable={isStageEditable}
                    selectedLayerIds={selectedLayerIds}
                    onSelectionChange={selectLayerIds}
                    onSurfaceChange={(nextSurface, historyLabel) => {
                      captureHistory(historyLabel);
                      updateCurrentSurface(() => nextSurface);
                    }}
                  />
                </div>
              </div>
              <div className="canvas-dock" aria-label="Canvas controls">
                <button type="button" className="canvas-dock__button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 2))}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    zoom_in
                  </span>
                </button>
                <button type="button" className="canvas-dock__button" onClick={() => setGuidesVisible((value) => !value)}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    pan_tool
                  </span>
                </button>
                <button type="button" className={`canvas-dock__button ${gridEnabled ? "canvas-dock__button--active" : ""}`} onClick={() => setGridEnabled((value) => !value)}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    grid_4x4
                  </span>
                </button>
              </div>
              {draftDocument.surfaces.length > 1 ? (
                <DesignerSideFilmstrip
                  surfaces={draftDocument.surfaces}
                  selectedSurfaceIndex={selectedSurfaceIndex}
                  isEditableProject={isEditableProject && rightPanel === "edit"}
                  onSelectSurface={selectSurface}
                  onAddSurface={addSurface}
                  onDuplicateSurface={duplicateCurrentSurface}
                  onRemoveSurface={removeCurrentSurface}
                />
              ) : null}
            </div>

          </section>

          <aside className="workspace-sidebar workspace-sidebar--inspector">
            <DesignerInspectorPanel
              title={rightPanel === "edit" ? (isEditableProject ? "Item Properties" : "Preview") : rightPanel === "review" ? "Pre-flight Check" : "Files"}
              description={
                rightPanel === "edit"
                  ? isEditableProject
                    ? undefined
                    : "Review the locked layout and generated output."
                  : rightPanel === "review"
                    ? "Review print issues before generating output."
                    : "Open the latest generated files."
              }
              badge={
                rightPanel === "edit" && selectedLayer ? <span className="badge badge--neutral">Active</span> : null
              }
            >
              {rightPanel === "edit" ? (
                isEditableProject ? (
                  <DesignerEditPanel
                    selectedLayer={selectedLayer}
                    isEditableProject={isEditableProject}
                    layerAssetFilename={layerAsset?.filename ?? null}
                    saving={saving}
                    onUpdateSelectedLayer={updateSelectedLayer}
                    onUpdateLayerNumericField={updateLayerNumericField}
                    onUpdateSelectedImageCrop={updateSelectedImageCrop}
                    onOpenReplaceImage={() => openFilePicker("replace")}
                  />
                ) : (
                  <DesignerPreviewPanel
                    selectedLayerName={selectedLayer?.name ?? null}
                    selectedLayerType={selectedLayer?.type ?? null}
                    surfaceLabel={currentSurface.label}
                    surfaceCount={draftDocument.surfaces.length}
                    itemCount={currentSurface.layers.length}
                    artifactCount={project.artifacts.length}
                    templateName={currentTemplate?.displayName ?? null}
                    statusBadge={<span className={badgeTone(project.status)}>{humanizeStatus(project.status)}</span>}
                  />
                )
              ) : null}
              {rightPanel === "review" ? (
                <DesignerReviewPanel
                  hasBlockingIssues={hasBlockingIssues}
                  isEditableProject={isEditableProject}
                  finalizing={finalizing}
                  canShowSelectedItem={Boolean(selectedLayer && !selectedLayer.visible)}
                  liveChecks={liveChecks}
                  preflightStatusClassName={badgeTone(project.preflightReport?.status ?? null)}
                  preflightStatusLabel={project.preflightReport?.status ?? "not run"}
                  preflightIssues={project.preflightReport?.issues ?? []}
                  onShowSelectedItem={() => toggleSelectedLayerFlag("visible")}
                  onBackToEditing={() => setRightPanel("edit")}
                  onCreatePrintFiles={() => void finalizeProject()}
                />
              ) : null}
              {rightPanel === "finish" ? (
                <DesignerFinishPanel
                  artifacts={project.artifacts.map((artifact) => ({
                    id: artifact.id,
                    label: humanizeStatus(artifact.artifactType),
                    href: resolveApiUrl(artifact.href)
                  }))}
                  quoteRef={project.commerceLink?.externalQuoteRef ?? "n/a"}
                  orderRef={project.commerceLink?.externalOrderRef ?? "n/a"}
                />
              ) : null}
            </DesignerInspectorPanel>
          </aside>
        </section>
        <footer className="workspace-footer">
          <div className="workspace-footer__group">
            <span>X: {Math.round(selectedLayer?.x ?? 0)}px</span>
            <span>Y: {Math.round(selectedLayer?.y ?? 0)}px</span>
          </div>
          <div className="workspace-footer__group">
            <span>{project.externalProductRef.replace("SKU-", "").replaceAll("-", " ")}</span>
            <span className="workspace-footer__status">Press-ready: PDF/X-1a</span>
          </div>
        </footer>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={(event) => void handleFileSelection(event)}
        />
      </div>
    );
  };

  const renderOverlay = () => {
    if (!project || !overlay) {
      return null;
    }

    return (
      <DesignerOverlay
        title={
          overlay === "templates"
            ? "Choose a template"
            : overlay === "projects"
              ? "Open another project"
              : overlay === "navigator"
                ? leftPanel === "layers"
                  ? "Layers"
                  : leftPanel === "assets"
                    ? "Assets"
                  : "History"
                : "Workspace options"
        }
        description={
          overlay === "templates"
            ? "Choose a starting layout for this product."
            : overlay === "projects"
              ? "Open another saved project."
              : overlay === "navigator"
                ? "Support panels that stay out of the main design area."
              : "Project and setup actions that are not part of the canvas."
        }
        onClose={() => setOverlay(null)}
      >

          {overlay === "templates" ? (
            <div className="template-grid">
              <article className={`template-card ${project.templateId === null ? "template-card--active" : ""}`}>
                <div>
                  <h3>Blank layout</h3>
                  <p>Start from an empty surface for this product.</p>
                </div>
                <div className="product-actions">
                  <button type="button" onClick={() => void applyTemplate(null)} disabled={templateBusy}>
                    {templateBusy ? "Applying..." : "Use blank layout"}
                  </button>
                </div>
              </article>
              {compatibleTemplates.map((template) => (
                <article className={`template-card ${project.templateId === template.id ? "template-card--active" : ""}`} key={template.id}>
                  <div>
                    <h3>{template.displayName}</h3>
                    <p>{template.description}</p>
                  </div>
                  <div className="product-actions">
                    <button type="button" onClick={() => void applyTemplate(template.id)} disabled={templateBusy}>
                      {templateBusy ? "Applying..." : project.templateId === template.id ? "Re-apply template" : "Use template"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {overlay === "projects" ? (
            <div className="project-grid">
              {recentProjects.map((item) => (
                <article className={`project-card ${item.id === project.id ? "project-card--active" : ""}`} key={item.id}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.externalProductRef}</p>
                  </div>
                  <div className="badge-row">
                    <span className={badgeTone(item.status)}>{humanizeStatus(item.status)}</span>
                    <span className={badgeTone(item.preflightStatus)}>{item.preflightStatus ?? "not run"}</span>
                  </div>
                  <div className="product-actions">
                    <button type="button" className="button--ghost" onClick={() => openProject(item.id)} disabled={item.id === project.id}>
                      {item.id === project.id ? "Current project" : "Open project"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {overlay === "navigator" ? <div className="workspace-overlay__content">{renderNavigatorContent()}</div> : null}

          {overlay === "menu" ? (
            <div className="workspace-menu-grid">
              <article className="template-card">
                <div>
                  <h3>Add more</h3>
                  <p>Insert less common content on the current side.</p>
                </div>
                <div className="product-actions">
                  <button
                    type="button"
                    className="button--ghost"
                    onClick={() => {
                      addQrLayer();
                      setOverlay(null);
                    }}
                    disabled={!isEditableProject}
                  >
                    QR code
                  </button>
                  <button
                    type="button"
                    className="button--ghost"
                    onClick={() => {
                      addBarcodeLayer();
                      setOverlay(null);
                    }}
                    disabled={!isEditableProject}
                  >
                    Barcode
                  </button>
                  <button
                    type="button"
                    className="button--ghost"
                    onClick={() => {
                      void createDemoAsset();
                      setOverlay(null);
                    }}
                    disabled={!isEditableProject || saving}
                  >
                    Sample image
                  </button>
                </div>
              </article>
              <article className="template-card">
                <div>
                  <h3>Project</h3>
                  <p>Switch project or leave the workspace.</p>
                </div>
                <div className="product-actions">
                  <button type="button" className="button--ghost" onClick={() => setOverlay("projects")}>
                    Open project
                  </button>
                  <button type="button" className="button--ghost" onClick={closeWorkspace}>
                    {isEmbedded ? "Done" : "Close"}
                  </button>
                </div>
              </article>
              <article className="template-card">
                <div>
                  <h3>Template</h3>
                  <p>{currentTemplate?.displayName ?? "Blank layout"}</p>
                </div>
                <div className="product-actions">
                  <button type="button" className="button--ghost" onClick={() => setOverlay("templates")} disabled={templateBusy}>
                    {templateBusy ? "Changing..." : "Change template"}
                  </button>
                  <button
                    type="button"
                    className="button--ghost"
                    onClick={() => {
                      setLeftPanel("layers");
                      setOverlay("navigator");
                    }}
                  >
                    Open layers
                  </button>
                </div>
              </article>
              <article className="template-card">
                <div>
                  <h3>Canvas view</h3>
                  <p>Show layout guides and snapping helpers.</p>
                </div>
                <div className="product-actions">
                  <button
                    type="button"
                    className={`button--ghost ${gridEnabled ? "toggle-active" : ""}`}
                    onClick={() => setGridEnabled((value) => !value)}
                  >
                    {gridEnabled ? "Hide grid" : "Show grid"}
                  </button>
                  <button
                    type="button"
                    className={`button--ghost ${snapEnabled ? "toggle-active" : ""}`}
                    onClick={() => setSnapEnabled((value) => !value)}
                  >
                    {snapEnabled ? "Turn snap off" : "Turn snap on"}
                  </button>
                </div>
              </article>
            </div>
          ) : null}
      </DesignerOverlay>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu || !contextMenuLayer || !isEditableProject) {
      return null;
    }

    return (
      <LayerContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        layerName={contextMenuLayer.name}
        layerType={contextMenuLayer.type}
        visible={contextMenuLayer.visible}
        locked={contextMenuLayer.locked}
        onDuplicate={() => {
          duplicateSelectedLayer();
          setContextMenu(null);
        }}
        onToggleVisible={() => {
          toggleSelectedLayerFlag("visible");
          setContextMenu(null);
        }}
        onToggleLocked={() => {
          toggleSelectedLayerFlag("locked");
          setContextMenu(null);
        }}
        onBringForward={() => {
          moveSelectedLayer("forward");
          setContextMenu(null);
        }}
        onSendBackward={() => {
          moveSelectedLayer("backward");
          setContextMenu(null);
        }}
        onCenter={() => {
          alignSelectedLayer("center");
          setContextMenu(null);
        }}
        onDelete={() => {
          deleteSelectedLayer();
          setContextMenu(null);
        }}
      />
    );
  };

  return (
    <>
      {loading ? <div className="message-card">Loading project…</div> : null}
      {error ? (
        <div className="message-card message-card--error">
          <strong>{errorTitle}</strong>
          <p>{error}</p>
        </div>
      ) : null}
      {!loading && !project ? renderLauncher() : null}
      {project ? renderWorkspace() : null}
      {project ? renderOverlay() : null}
      {project ? renderContextMenu() : null}
    </>
  );
};
