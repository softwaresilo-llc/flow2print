import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { Flow2PrintDocument } from "@flow2print/design-document";
import { summarizeDocument } from "@flow2print/editor-engine";
import { AppShell } from "@flow2print/ui-kit";

import { FabricCanvasStage, type FabricCanvasStageHandle } from "./components/FabricCanvasStage";

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
const layerPreviewText = (layer: DesignerLayer) => {
  if (layer.type === "text") {
    return String(layer.metadata.text ?? layer.name).slice(0, 2).toUpperCase();
  }
  if (layer.type === "qr") {
    return "QR";
  }
  if (layer.type === "barcode") {
    return "||";
  }
  if (layer.type === "shape") {
    return String(layer.name ?? "").slice(0, 2).toUpperCase();
  }
  return "IMG";
};

const readJson = async <T,>(response: Response) => {
  if (!response.ok) {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as { code?: string; message?: string };
      const error = new Error(parsed.message ?? parsed.code ?? `Request failed with status ${response.status}`);
      if (parsed.code) {
        error.name = parsed.code;
      }
      throw error;
    } catch {
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
  const [leftPanel, setLeftPanel] = useState<"layers" | "assets" | "session">("layers");
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
  const [historyPastLabels, setHistoryPastLabels] = useState<string[]>([]);
  const [historyFutureLabels, setHistoryFutureLabels] = useState<string[]>([]);
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
          await loadTemplates(blueprintForProductRef(selectedStarterProductRef));
          await loadRecentProjects();
          setProject(null);
          setDraftDocument(null);
          setLaunchSession(null);
          return;
        }

        const [projectData, assetData] = await Promise.all([
          fetch(resolveApiUrl(`/v1/projects/${projectId}`)).then((response) => readJson<ProjectResponse>(response)),
          fetch(resolveApiUrl("/v1/assets")).then((response) => readJson<{ docs: AssetRecord[] }>(response))
        ]);

        await loadTemplates(projectData.blueprintId);
        setLaunchSession(session);
        setProject(projectData);
        setDraftDocument(deepCloneDocument(projectData.document));
        setAssets(assetData.docs);
        await loadRecentProjects();
        setSelectedSurfaceIndex(0);
        setZoom(1);
        setLeftPanel("layers");
        setSelectedLayerId(projectData.document.surfaces[0]?.layers[0]?.id ?? null);
        setSelectedLayerIds(projectData.document.surfaces[0]?.layers[0]?.id ? [projectData.document.surfaces[0].layers[0].id] : []);
        setSelectedTemplateId(projectData.templateId);
        setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "finish" : "edit");
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
    const [projectData, assetData] = await Promise.all([
      fetch(resolveApiUrl(`/v1/projects/${projectId}`)).then((response) => readJson<ProjectResponse>(response)),
      fetch(resolveApiUrl("/v1/assets")).then((response) => readJson<{ docs: AssetRecord[] }>(response))
    ]);
    await loadTemplates(projectData.blueprintId);
    setProject(projectData);
    setDraftDocument(deepCloneDocument(projectData.document));
    setAssets(assetData.docs);
    setSelectedTemplateId(projectData.templateId);
    setLeftPanel("layers");
    setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "finish" : "edit");
    setSelectedLayerId(projectData.document.surfaces[selectedSurfaceIndex]?.layers[0]?.id ?? projectData.document.surfaces[0]?.layers[0]?.id ?? null);
    setSelectedLayerIds(
      projectData.document.surfaces[selectedSurfaceIndex]?.layers[0]?.id
        ? [projectData.document.surfaces[selectedSurfaceIndex].layers[0].id]
        : projectData.document.surfaces[0]?.layers[0]?.id
          ? [projectData.document.surfaces[0].layers[0].id]
          : []
    );
    await loadRecentProjects();
  };

  const currentSurface = draftDocument?.surfaces[selectedSurfaceIndex] ?? null;
  const selectedLayer = currentSurface?.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedLayers = currentSurface?.layers.filter((layer) => selectedLayerIds.includes(layer.id)) ?? [];
  const isCompactViewport = viewportSize.width <= 720;
  const showNavigatorSidebar = !isCompactViewport && rightPanel === "edit";
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
      setSelectedLayerIds(surface.layers[0]?.id ? [surface.layers[0].id] : []);
      setSelectedLayerId(surface.layers[0]?.id ?? null);
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
    setHistoryPastLabels((entries) => [...entries.slice(-39), label]);
    setHistoryFuture([]);
    setHistoryFutureLabels([]);
  };

  const undoChange = () => {
    if (!draftDocument || historyPast.length === 0) {
      return;
    }
    const previous = historyPast[historyPast.length - 1];
    const previousLabel = historyPastLabels[historyPastLabels.length - 1] ?? "Canvas change";
    setHistoryPast((entries) => entries.slice(0, -1));
    setHistoryPastLabels((entries) => entries.slice(0, -1));
    setHistoryFuture((entries) => [deepCloneDocument(draftDocument), ...entries.slice(0, 39)]);
    setHistoryFutureLabels((entries) => [previousLabel, ...entries.slice(0, 39)]);
    setDraftDocument(deepCloneDocument(previous));
  };

  const redoChange = () => {
    if (!draftDocument || historyFuture.length === 0) {
      return;
    }
    const [next, ...rest] = historyFuture;
    const [nextLabel, ...restLabels] = historyFutureLabels;
    setHistoryFuture(rest);
    setHistoryFutureLabels(restLabels);
    setHistoryPast((entries) => [...entries.slice(-39), deepCloneDocument(draftDocument)]);
    setHistoryPastLabels((entries) => [...entries.slice(-39), nextLabel ?? "Canvas change"]);
    setDraftDocument(deepCloneDocument(next));
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
      setHistoryPastLabels([]);
      setHistoryFutureLabels([]);
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
      setHistoryPastLabels([]);
      setHistoryFutureLabels([]);
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
    setHistoryPastLabels([]);
    setHistoryFutureLabels([]);
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
      setHistoryPastLabels([]);
      setHistoryFutureLabels([]);
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
  const recentHistoryEntries = useMemo(
    () =>
      historyPastLabels
        .slice(-6)
        .reverse()
        .map((label, index) => ({
          id: `${label}-${index}`,
          label
        })),
    [historyPastLabels]
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
    <AppShell
      eyebrow="Designer"
      title="Open or continue a project"
      subtitle="This screen only starts or resumes work. The actual designer opens as a compact workspace and can be embedded in Magento as a modal or iframe."
    >
      <div className="designer-launchpad">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>Start a new design</h3>
              <p>Select a product, then choose a blank start or one of the available templates.</p>
            </div>
          </div>
          <div className="product-grid">
            {starterProducts.map((starter) => (
              <article
                className={`product-card ${selectedStarterProductRef === starter.productRef ? "product-card--active" : ""}`}
                key={starter.productRef}
              >
                <div>
                  <h3>{starter.label}</h3>
                  <p>{starter.note}</p>
                </div>
                <div className="product-actions">
                  <button type="button" className="button--ghost" onClick={() => setSelectedStarterProductRef(starter.productRef)}>
                    {selectedStarterProductRef === starter.productRef ? "Selected" : "Choose product"}
                  </button>
                  <button type="button" onClick={() => void createProject(starter.productRef)} disabled={saving}>
                    {saving ? "Opening..." : "Start blank"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="template-picker">
            <div className="section-heading">
              <div>
                <h3>Available templates</h3>
                <p>Use a ready-made starting point for {starterProducts.find((starter) => starter.productRef === selectedStarterProductRef)?.label ?? "this product"}.</p>
              </div>
              <span className="badge badge--neutral">{compatibleTemplates.length}</span>
            </div>
            {compatibleTemplates.length === 0 ? <div className="empty-state">No templates are available for this product yet.</div> : null}
            <div className="template-grid">
              {compatibleTemplates.map((template) => (
                <article className={`template-card ${selectedTemplateId === template.id ? "template-card--active" : ""}`} key={template.id}>
                  <div>
                    <h3>{template.displayName}</h3>
                    <p>{template.description}</p>
                  </div>
                  <div className="product-actions">
                    <button type="button" className="button--ghost" onClick={() => setSelectedTemplateId(template.id)}>
                      {selectedTemplateId === template.id ? "Selected" : "Preview start"}
                    </button>
                    <button type="button" onClick={() => void createProject(selectedStarterProductRef, template.id)} disabled={saving}>
                      {saving ? "Opening..." : "Start with template"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>Recent projects</h3>
              <p>Continue where you left off.</p>
            </div>
            <span className="badge badge--neutral">{recentProjects.length}</span>
          </div>
          {recentProjects.length === 0 ? <div className="empty-state">No projects yet. Start one above.</div> : null}
          <div className="project-grid">
            {recentProjects.map((item) => (
              <article className="project-card" key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.externalProductRef}</p>
                </div>
                <div className="badge-row">
                  <span className="badge badge--neutral">{humanizeStatus(item.status)}</span>
                  <span className={badgeTone(item.preflightStatus)}>{item.preflightStatus ?? "not run"}</span>
                </div>
                <div className="project-actions">
                  <button type="button" onClick={() => openProject(item.id)}>
                    Open project
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );

  const renderNavigatorContent = () => {
    if (!project || !draftDocument || !currentSurface || !documentSummary) {
      return null;
    }

    return (
      <>
        <div className="section-heading section-heading--compact">
          <div>
            <h3>Document</h3>
            <p>Pages, layers, assets, and session actions.</p>
          </div>
          <span className="badge badge--neutral">
            {leftPanel === "layers"
              ? `${currentSurface.layers.length} items`
              : leftPanel === "assets"
                ? `${availableImageAssets.length} files`
                : `${historyPast.length} changes`}
          </span>
        </div>
        <div className="panel-tabs panel-tabs--navigator">
          <button
            type="button"
            className={`panel-tab ${leftPanel === "layers" ? "panel-tab--active" : ""}`}
            onClick={() => setLeftPanel("layers")}
          >
            Layers
          </button>
          <button
            type="button"
            className={`panel-tab ${leftPanel === "assets" ? "panel-tab--active" : ""}`}
            onClick={() => setLeftPanel("assets")}
          >
            Assets
          </button>
          <button
            type="button"
            className={`panel-tab ${leftPanel === "session" ? "panel-tab--active" : ""}`}
            onClick={() => setLeftPanel("session")}
          >
            Session
          </button>
        </div>
        {leftPanel === "layers" ? (
          <>
            <div className="surface-list">
              <div className="surface-actions">
                <label className="surface-label-editor">
                  <span>Current side</span>
                  <input
                    value={currentSurface.label}
                    onChange={(event) => renameCurrentSurface(event.target.value)}
                    disabled={!isEditableProject}
                  />
                </label>
                {isEditableProject ? (
                  <div className="stack-actions">
                    <button type="button" className="button--ghost" onClick={addSurface}>
                      Add side
                    </button>
                    <button type="button" className="button--ghost" onClick={duplicateCurrentSurface}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="button--ghost"
                      onClick={removeCurrentSurface}
                      disabled={draftDocument.surfaces.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
              {draftDocument.surfaces.map((surface, index) => (
                <button
                  key={surface.surfaceId}
                  type="button"
                  className={`surface-tab ${index === selectedSurfaceIndex ? "surface-tab--active" : ""}`}
                  onClick={() => {
                    setSelectedSurfaceIndex(index);
                    setSelectedLayerIds(surface.layers[0]?.id ? [surface.layers[0].id] : []);
                    setSelectedLayerId(surface.layers[0]?.id ?? null);
                  }}
                >
                  <strong>{surface.label}</strong>
                  <span>
                    {surface.artboard.width} × {surface.artboard.height} mm
                  </span>
                </button>
              ))}
            </div>
            <div className="list-section-header">
              <div>
                <strong>Layers</strong>
                <span>Drag to change stacking order.</span>
              </div>
            </div>
            <p className="panel-hint">
              {isEditableProject
                ? "Open actions on a layer to hide, lock, rename, or delete it."
                : "This version is read-only because print files already exist."}
            </p>
            <div className="layer-list">
              {currentSurface.layers.length === 0 ? <div className="empty-state">No items on this side yet.</div> : null}
              {currentSurface.layers.map((layer, index) => (
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
                  {isEditableProject ? <span className="layer-row__grip" aria-hidden="true" /> : <span className="layer-row__index">{index + 1}</span>}
                  <span
                    className={`layer-row__preview layer-row__preview--${layer.type}`}
                    style={layer.type === "shape" ? { background: String(layer.metadata.fill ?? "#dbe8ff") } : undefined}
                  >
                    {layer.type === "shape" ? null : layerPreviewText(layer)}
                  </span>
                  <span className="layer-row__content">
                    <strong>{layer.name}</strong>
                    <small>{layer.type}</small>
                  </span>
                  <div className="layer-row__meta">
                    {!layer.visible ? <span className="badge badge--neutral">Hidden</span> : null}
                    {layer.locked ? <span className="badge badge--neutral">Locked</span> : null}
                  </div>
                  <div className="layer-row__actions">
                    {isEditableProject ? (
                      <button
                        type="button"
                        className="button--ghost button--ghost-compact"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openLayerContextMenuFromElement(event.currentTarget, layer.id);
                        }}
                      >
                        Actions
                      </button>
                    ) : (
                      <span className="layer-row__state">{layer.visible ? "Shown" : "Hidden"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {leftPanel === "assets" ? (
          <>
            <div className="list-section-header">
              <div>
                <strong>Library</strong>
                <span>All available images for this workspace.</span>
              </div>
            </div>
            <div className="asset-list">
              {availableImageAssets.length === 0 ? <div className="empty-state">No uploaded image files yet.</div> : null}
              {availableImageAssets.map((asset) => (
                <div className="asset-item" key={`library-${asset.id}`}>
                  <div className="asset-item__content">
                    <strong>{asset.filename}</strong>
                    <span>{asset.mimeType}</span>
                  </div>
                  {isEditableProject ? (
                    <button type="button" className="button--ghost" onClick={() => placeExistingAsset(asset)}>
                      Use
                    </button>
                  ) : (
                    <span className="badge badge--neutral">Available</span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}
        {leftPanel === "session" ? (
          <>
            <div className="history-summary">
              <div className="kv-item">
                <strong>Version</strong>
                <span>{project.activeVersionId.slice(-12)}</span>
              </div>
              <div className="kv-item">
                <strong>Template</strong>
                <span>{currentTemplate?.displayName ?? "Blank start"}</span>
              </div>
              <div className="kv-item">
                <strong>Changes not saved</strong>
                <span>{hasUnsavedChanges ? "Yes" : "No"}</span>
              </div>
              <div className="kv-item">
                <strong>Undo available</strong>
                <span>{historyPast.length}</span>
              </div>
            </div>
            <div className="history-actions">
              {isEditableProject ? (
                <>
                  <button type="button" className="button--ghost" onClick={undoChange} disabled={historyPast.length === 0}>
                    Undo
                  </button>
                  <button type="button" className="button--ghost" onClick={redoChange} disabled={historyFuture.length === 0}>
                    Redo
                  </button>
                  <button type="button" className="button--ghost" onClick={resetDraft} disabled={!hasUnsavedChanges || saving}>
                    Discard
                  </button>
                  <button type="button" onClick={() => void saveDraftDocument()} disabled={!hasUnsavedChanges || saving}>
                    {saving ? "Saving..." : "Save draft"}
                  </button>
                </>
              ) : (
                <button type="button" onClick={openExportPanel}>
                  Open files
                </button>
              )}
            </div>
            <div className="list-section-header">
              <div>
                <strong>Recent changes</strong>
                <span>The latest actions in this editing session.</span>
              </div>
            </div>
            <div className="history-list">
              {recentHistoryEntries.length === 0 ? (
                <div className="empty-state">No local changes yet. Start with text, an image, or a template.</div>
              ) : null}
              {recentHistoryEntries.map((entry, index) => (
                <div className="history-item" key={entry.id}>
                  <span className="history-item__index">{recentHistoryEntries.length - index}</span>
                  <div className="history-item__content">
                    <strong>{entry.label}</strong>
                    <span>{index === 0 ? "Most recent" : "Earlier in this session"}</span>
                  </div>
                </div>
              ))}
            </div>
            {isEditableProject ? (
              <div className="layout-guide-card">
                <div className="kv-list">
                  <div className="kv-item">
                    <strong>Shortcuts</strong>
                    <span>Cmd/Ctrl+S save, Cmd/Ctrl+Z undo, Delete removes, arrows nudge.</span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  const renderWorkspace = () => {
    if (!project || !draftDocument || !currentSurface || !documentSummary) {
      return null;
    }

    return (
      <div className={`workspace-shell ${isEmbedded ? "workspace-shell--embedded" : ""}`}>
        <header className="workspace-topbar workspace-topbar--editor">
          <div className="workspace-title">
            <p className="workspace-label">Project</p>
            <h1>{project.title}</h1>
            <div className="badge-row">
              <span className={badgeTone(project.status)}>{humanizeStatus(project.status)}</span>
              <span className={badgeTone(project.preflightReport?.status ?? null)}>
                {project.preflightReport?.status ?? "preflight pending"}
              </span>
              <span className="badge badge--neutral">{project.externalProductRef}</span>
              {hasUnsavedChanges ? <span className="badge badge--warning">unsaved changes</span> : null}
              {hasBlockingIssues ? <span className="badge badge--danger">review required</span> : null}
            </div>
          </div>
          <div className="workspace-mode-switch" role="tablist" aria-label="Designer workflow">
            <button
              type="button"
              className={`workspace-mode ${rightPanel === "edit" ? "workspace-mode--active" : ""}`}
              onClick={() => setRightPanel("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              className={`workspace-mode ${rightPanel === "review" ? "workspace-mode--active" : ""}`}
              onClick={() => setRightPanel("review")}
            >
              Review
            </button>
            <button
              type="button"
              className={`workspace-mode ${rightPanel === "finish" ? "workspace-mode--active" : ""}`}
              onClick={() => setRightPanel("finish")}
            >
              Finish
            </button>
          </div>
          <div className="workspace-actions workspace-actions--editor">
            {isEditableProject && rightPanel === "edit" ? (
              <button type="button" className="button--ghost" onClick={() => void saveDraftDocument()} disabled={!hasUnsavedChanges || saving}>
                {saving ? "Saving..." : "Save draft"}
              </button>
            ) : null}
            {isEditableProject && rightPanel === "edit" ? (
              <button type="button" onClick={() => setRightPanel("review")}>
                Review design
              </button>
            ) : null}
            {isEditableProject && rightPanel === "review" ? (
              <>
                <button type="button" className="button--ghost" onClick={() => setRightPanel("edit")}>
                  Back to edit
                </button>
                <button type="button" onClick={() => void finalizeProject()} disabled={finalizing || hasBlockingIssues}>
                  {finalizing ? "Creating..." : "Create print files"}
                </button>
              </>
            ) : null}
            {!isEditableProject && rightPanel === "finish" ? (
              <button type="button" onClick={openExportPanel}>
                Open export
              </button>
            ) : null}
            <button type="button" className="button--ghost" onClick={() => setOverlay("menu")}>
              More
            </button>
          </div>
        </header>

        <section className="workspace-layout">
          {showNavigatorSidebar ? (
            <aside className="workspace-sidebar workspace-sidebar--navigator">
            <article className="panel panel--tight panel--navigator">
              <div className="section-heading section-heading--compact">
                <div>
                  <h3>Document</h3>
                  <p>Pages, layers, assets, and session actions.</p>
                </div>
                <span className="badge badge--neutral">
                  {leftPanel === "layers"
                    ? `${currentSurface.layers.length} items`
                    : leftPanel === "assets"
                      ? `${availableImageAssets.length} files`
                      : `${historyPast.length} changes`}
                </span>
              </div>
              <div className="panel-tabs panel-tabs--navigator">
                <button
                  type="button"
                  className={`panel-tab ${leftPanel === "layers" ? "panel-tab--active" : ""}`}
                  onClick={() => setLeftPanel("layers")}
                >
                  Layers
                </button>
                <button
                  type="button"
                  className={`panel-tab ${leftPanel === "assets" ? "panel-tab--active" : ""}`}
                  onClick={() => setLeftPanel("assets")}
                >
                  Assets
                </button>
                <button
                  type="button"
                  className={`panel-tab ${leftPanel === "session" ? "panel-tab--active" : ""}`}
                  onClick={() => setLeftPanel("session")}
                >
                  Session
                </button>
              </div>
              {leftPanel === "layers" ? (
                <>
                  <div className="surface-list">
                    <div className="surface-actions">
                      <label className="surface-label-editor">
                        <span>Current side</span>
                        <input
                          value={currentSurface.label}
                          onChange={(event) => renameCurrentSurface(event.target.value)}
                          disabled={!isEditableProject}
                        />
                      </label>
                      {isEditableProject ? (
                        <div className="stack-actions">
                          <button type="button" className="button--ghost" onClick={addSurface}>
                            Add side
                          </button>
                          <button type="button" className="button--ghost" onClick={duplicateCurrentSurface}>
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="button--ghost"
                            onClick={removeCurrentSurface}
                            disabled={draftDocument.surfaces.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {draftDocument.surfaces.map((surface, index) => (
                      <button
                        key={surface.surfaceId}
                        type="button"
                        className={`surface-tab ${index === selectedSurfaceIndex ? "surface-tab--active" : ""}`}
                        onClick={() => {
                          setSelectedSurfaceIndex(index);
                          setSelectedLayerIds(surface.layers[0]?.id ? [surface.layers[0].id] : []);
                          setSelectedLayerId(surface.layers[0]?.id ?? null);
                        }}
                      >
                        <strong>{surface.label}</strong>
                        <span>
                          {surface.artboard.width} × {surface.artboard.height} mm
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="list-section-header">
                    <div>
                      <strong>Layers</strong>
                      <span>Drag to change stacking order.</span>
                    </div>
                  </div>
                  <p className="panel-hint">
                    {isEditableProject
                      ? "Open actions on a layer to hide, lock, rename, or delete it."
                      : "This version is read-only because print files already exist."}
                  </p>
                  <div className="layer-list">
                    {currentSurface.layers.length === 0 ? <div className="empty-state">No items on this side yet.</div> : null}
                    {currentSurface.layers.map((layer, index) => (
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
                        {isEditableProject ? <span className="layer-row__grip" aria-hidden="true" /> : <span className="layer-row__index">{index + 1}</span>}
                        <span
                          className={`layer-row__preview layer-row__preview--${layer.type}`}
                          style={layer.type === "shape" ? { background: String(layer.metadata.fill ?? "#dbe8ff") } : undefined}
                        >
                          {layer.type === "shape" ? null : layerPreviewText(layer)}
                        </span>
                        <span className="layer-row__content">
                          <strong>{layer.name}</strong>
                          <small>{layer.type}</small>
                        </span>
                        <div className="layer-row__meta">
                          {!layer.visible ? <span className="badge badge--neutral">Hidden</span> : null}
                          {layer.locked ? <span className="badge badge--neutral">Locked</span> : null}
                        </div>
                        <div className="layer-row__actions">
                          {isEditableProject ? (
                            <button
                              type="button"
                              className="button--ghost button--ghost-compact"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleLayerSelection(layer.id);
                                openLayerContextMenuFromElement(event.currentTarget, layer.id);
                              }}
                            >
                              Actions
                            </button>
                          ) : (
                            <span className="layer-row__status">{layer.visible ? "Shown" : "Hidden"}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {leftPanel === "assets" ? (
                <>
                  <div className="panel-hint">
                    Keep brand images here so they can be reused on the current side without re-uploading them.
                  </div>
                  {isEditableProject ? (
                    <div className="stack-actions">
                      <button type="button" onClick={() => openFilePicker("insert")} disabled={saving}>
                        {saving ? "Uploading..." : "Upload image"}
                      </button>
                      <button type="button" className="button--ghost" onClick={() => void createDemoAsset()} disabled={saving}>
                        Sample image
                      </button>
                    </div>
                  ) : null}
                  <div className="list-section-header">
                    <div>
                      <strong>Placed on this project</strong>
                      <span>Already linked and ready to reuse.</span>
                    </div>
                  </div>
                  <div className="asset-list">
                    {linkedAssets.length === 0 ? <div className="empty-state">No images have been placed yet.</div> : null}
                    {linkedAssets.map((asset) => (
                      <div className="asset-item" key={asset.id}>
                        <div className="asset-item__content">
                          <strong>{asset.filename}</strong>
                          <span>{asset.widthPx && asset.heightPx ? `${asset.widthPx} × ${asset.heightPx}px` : asset.kind}</span>
                        </div>
                        {isEditableProject ? (
                          <button type="button" className="button--ghost" onClick={() => placeExistingAsset(asset)}>
                            Place
                          </button>
                        ) : (
                          <span className="badge badge--neutral">Linked</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="list-section-header">
                    <div>
                      <strong>Library</strong>
                      <span>All available images for this workspace.</span>
                    </div>
                  </div>
                  <div className="asset-list">
                    {availableImageAssets.length === 0 ? <div className="empty-state">No uploaded image files yet.</div> : null}
                    {availableImageAssets.map((asset) => (
                      <div className="asset-item" key={`library-${asset.id}`}>
                        <div className="asset-item__content">
                          <strong>{asset.filename}</strong>
                          <span>{asset.mimeType}</span>
                        </div>
                        {isEditableProject ? (
                          <button type="button" className="button--ghost" onClick={() => placeExistingAsset(asset)}>
                            Use
                          </button>
                        ) : (
                          <span className="badge badge--neutral">Available</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {leftPanel === "session" ? (
                <>
                  <div className="history-summary">
                    <div className="kv-item">
                      <strong>Version</strong>
                      <span>{project.activeVersionId.slice(-12)}</span>
                    </div>
                    <div className="kv-item">
                      <strong>Template</strong>
                      <span>{currentTemplate?.displayName ?? "Blank start"}</span>
                    </div>
                    <div className="kv-item">
                      <strong>Changes not saved</strong>
                      <span>{hasUnsavedChanges ? "Yes" : "No"}</span>
                    </div>
                    <div className="kv-item">
                      <strong>Undo available</strong>
                      <span>{historyPast.length}</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    {isEditableProject ? (
                      <>
                        <button type="button" className="button--ghost" onClick={undoChange} disabled={historyPast.length === 0}>
                          Undo
                        </button>
                        <button type="button" className="button--ghost" onClick={redoChange} disabled={historyFuture.length === 0}>
                          Redo
                        </button>
                        <button type="button" onClick={() => void saveDraftDocument()} disabled={!hasUnsavedChanges || saving}>
                          {saving ? "Saving..." : "Save draft"}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={openExportPanel}>
                        Open export
                      </button>
                    )}
                  </div>
                  <div className="list-section-header">
                    <div>
                      <strong>Recent changes</strong>
                      <span>The latest actions in this editing session.</span>
                    </div>
                  </div>
                  <div className="history-list">
                    {recentHistoryEntries.length === 0 ? (
                      <div className="empty-state">No local changes yet. Start with text, a shape, or an image.</div>
                    ) : null}
                    {recentHistoryEntries.map((entry, index) => (
                      <div className="history-item" key={entry.id}>
                        <span className="history-item__index">{recentHistoryEntries.length - index}</span>
                        <div className="history-item__content">
                          <strong>{entry.label}</strong>
                          <span>{index === 0 ? "Most recent" : "Earlier in this session"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isEditableProject ? (
                    <div className="layout-guide-card">
                      <div className="kv-list">
                        <div className="kv-item">
                          <strong>Shortcuts</strong>
                          <span>Cmd/Ctrl+S save, Cmd/Ctrl+Z undo, Delete removes, arrows nudge.</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={(event) => void handleFileSelection(event)}
              />
            </article>
          </aside>
          ) : null}

          <section className="workspace-stage workspace-stage--primary">
            <div className="stage-header stage-header--editor">
              <div>
                <p className="workspace-label">Canvas</p>
                <h2>{currentSurface.label}</h2>
                <p className="stage-subtitle">
                  {rightPanel === "edit"
                    ? selectedLayer
                      ? `Editing ${selectedLayer.name}`
                      : "Add content or select an item on the canvas."
                    : rightPanel === "review"
                      ? "Check layout warnings and print readiness for this side."
                      : "Use generated files or hand the design off to the next step."}
                </p>
              </div>
              <div className="badge-row">
                <span className="badge badge--neutral">{currentSurface.layers.length} layers</span>
                <span className="badge badge--neutral">{documentSummary.assetCount} linked assets</span>
                <span className="badge badge--neutral">{currentTemplate?.displayName ?? "Blank start"}</span>
              </div>
            </div>
            {hasBlockingIssues && rightPanel !== "review" ? (
              <div className="workspace-alert workspace-alert--warning">
                <div>
                  <strong>Review needed before print files can be created.</strong>
                  <p>Fix the blocking items in Review, or add content directly on the canvas if this side is still empty.</p>
                </div>
                <button type="button" className="button--ghost" onClick={() => setRightPanel("review")}>
                  Open review
                </button>
              </div>
            ) : null}

            <div className="stage-wrapper">
              {rightPanel === "edit" && !isBlankSurface ? (
                <div className="stage-toolbar">
                  <div className="stage-toolbar__group">
                    <span className="stage-toolbar__label">Insert</span>
                    <div className="stack-actions">
                      <button type="button" onClick={addTextLayer} disabled={project.status === "finalized"}>
                        Text
                      </button>
                      <button type="button" className="button--ghost" onClick={addShapeLayer} disabled={project.status === "finalized"}>
                        Shape
                      </button>
                      <button type="button" className="button--ghost" onClick={addQrLayer} disabled={project.status === "finalized"}>
                        QR code
                      </button>
                      <button type="button" className="button--ghost" onClick={addBarcodeLayer} disabled={project.status === "finalized"}>
                        Barcode
                      </button>
                      <button
                        type="button"
                        className="button--ghost"
                        onClick={() => openFilePicker("insert")}
                        disabled={project.status === "finalized" || saving}
                      >
                        {saving ? "Uploading..." : "Upload image"}
                      </button>
                      <button
                        type="button"
                        className="button--ghost"
                        onClick={() => void createDemoAsset()}
                        disabled={project.status === "finalized" || saving}
                      >
                        Sample image
                      </button>
                      <button
                        type="button"
                        className="button--ghost"
                        onClick={() => setOverlay("templates")}
                        disabled={templateBusy}
                      >
                        {templateBusy ? "Changing..." : "Template"}
                      </button>
                    </div>
                  </div>
                  <div className="stage-toolbar__group">
                    <span className="stage-toolbar__label">View</span>
                    <div className="stack-actions">
                      <span className="badge badge--neutral">Zoom {Math.round(zoom * 100)}%</span>
                      <button type="button" className="button--ghost" onClick={() => setZoom((value) => clamp(value - 0.1, 0.5, 2))}>
                        -
                      </button>
                      <button type="button" className="button--ghost" onClick={() => setZoom(1)}>
                        Fit
                      </button>
                      <button type="button" className="button--ghost" onClick={() => setZoom((value) => clamp(value + 0.1, 0.5, 2))}>
                        +
                      </button>
                      <button type="button" className={`button--ghost ${gridEnabled ? "toggle-active" : ""}`} onClick={() => setGridEnabled((value) => !value)}>
                        Grid
                      </button>
                      <button type="button" className={`button--ghost ${guidesVisible ? "toggle-active" : ""}`} onClick={() => setGuidesVisible((value) => !value)}>
                        Guides
                      </button>
                      <button type="button" className={`button--ghost ${snapEnabled ? "toggle-active" : ""}`} onClick={() => setSnapEnabled((value) => !value)}>
                        Snap
                      </button>
                      <button type="button" className="button--ghost" onClick={undoChange} disabled={historyPast.length === 0}>
                        Undo
                      </button>
                      <button type="button" className="button--ghost" onClick={redoChange} disabled={historyFuture.length === 0}>
                        Redo
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {rightPanel === "edit" && isBlankSurface ? (
                <div className="canvas-startbar">
                  <div className="canvas-startbar__copy">
                    <strong>Start designing</strong>
                    <span>Choose one starting action. You can add more content after the first item is on the canvas.</span>
                  </div>
                  <div className="stack-actions">
                    <button type="button" onClick={addTextLayer} disabled={project.status === "finalized"}>
                      Add text
                    </button>
                    <button
                      type="button"
                      className="button--ghost"
                      onClick={() => openFilePicker("insert")}
                      disabled={project.status === "finalized" || saving}
                    >
                      {saving ? "Uploading..." : "Upload image"}
                    </button>
                    <button
                      type="button"
                      className="button--ghost"
                      onClick={() => setOverlay("templates")}
                      disabled={templateBusy}
                    >
                      {templateBusy ? "Changing..." : "Use template"}
                    </button>
                  </div>
                </div>
              ) : null}
              {rightPanel !== "edit" ? (
                <div className="readonly-strip">
                  <strong>{rightPanel === "review" ? "Review mode" : "Finish mode"}</strong>
                  <span>
                    {rightPanel === "review"
                      ? "Resolve issues and confirm this side is ready."
                      : "Open generated files or sync this project back to the shop."}
                  </span>
                </div>
              ) : null}
              {rightPanel === "edit" ? (
              <div className="layout-guide-bar">
                <div className="layout-guide-bar__intro">
                  <strong>Print guides</strong>
                  <span>Keep important content inside the safe area. Backgrounds may extend into bleed.</span>
                </div>
                <div className="layout-guide-bar__items">
                  <span className="layout-guide-pill">
                    <span className="layout-guide-swatch layout-guide-swatch--sheet" />
                    Final size
                  </span>
                  <span className="layout-guide-pill">
                    <span className="layout-guide-swatch layout-guide-swatch--safe" />
                    Safe area
                  </span>
                  <span className="layout-guide-pill">
                    <span className="layout-guide-swatch layout-guide-swatch--bleed" />
                    Bleed
                  </span>
                  <span className={selectedLayerLayoutStatus?.tone ?? "badge badge--neutral"}>
                    {selectedLayerLayoutStatus?.text ?? "Select an item to check placement."}
                  </span>
                </div>
              </div>
              ) : null}
              {isEditableProject && rightPanel === "edit" && (selectedLayer || multiSelectionActive) ? (
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
                        <button type="button" className="button--ghost" onClick={() => toggleSelectedLayerFlag("visible")}>
                          {selectedLayer.visible ? "Hide" : "Show"}
                        </button>
                        <button type="button" className="button--ghost" onClick={() => toggleSelectedLayerFlag("locked")}>
                          {selectedLayer.locked ? "Unlock" : "Lock"}
                        </button>
                        <button type="button" className="button--ghost" onClick={() => moveSelectedLayer("forward")}>
                          Bring forward
                        </button>
                        <button type="button" className="button--ghost" onClick={() => moveSelectedLayer("backward")}>
                          Send backward
                        </button>
                        <button type="button" className="button--ghost" onClick={() => alignSelectedLayer("center")}>
                          Center X
                        </button>
                        <button type="button" className="button--ghost" onClick={() => alignSelectedLayer("middle")}>
                          Center Y
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
                      </>
                    ) : null}
                    {!cropMode && multiSelectionActive ? (
                      <>
                        <button type="button" className="button--ghost" onClick={groupSelectedLayers} disabled={!canGroupSelection}>
                          Group
                        </button>
                        <button type="button" className="button--ghost" onClick={() => distributeSelectedLayers("horizontal")} disabled={!canDistributeSelection}>
                          Distribute H
                        </button>
                        <button type="button" className="button--ghost" onClick={() => distributeSelectedLayers("vertical")} disabled={!canDistributeSelection}>
                          Distribute V
                        </button>
                        <button type="button" className="button--ghost" onClick={() => moveSelectedLayer("forward")}>
                          Bring forward
                        </button>
                        <button type="button" className="button--ghost" onClick={() => moveSelectedLayer("backward")}>
                          Send backward
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
                    <p>Use the crop controls above to reposition the image inside its print frame.</p>
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
                      <p>Add text, a shape, a QR code, a barcode, or an image. The blue dashed box is the safe area for important content.</p>
                </div>
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
                    isEditable={isEditableProject}
                    selectedLayerIds={selectedLayerIds}
                    onSelectionChange={selectLayerIds}
                    onSurfaceChange={(nextSurface, historyLabel) => {
                      captureHistory(historyLabel);
                      updateCurrentSurface(() => nextSurface);
                    }}
                  />
                </div>
              </div>
              {isCompactViewport && rightPanel === "edit" && isEditableProject ? (
                <div className="mobile-action-bar">
                  <button type="button" onClick={addTextLayer}>
                    Text
                  </button>
                  <button type="button" className="button--ghost" onClick={() => openFilePicker("insert")} disabled={saving}>
                    Image
                  </button>
                  <button type="button" className="button--ghost" onClick={() => setOverlay("navigator")}>
                    Layers
                  </button>
                  <button type="button" className="button--ghost" onClick={() => setRightPanel("review")}>
                    Review
                  </button>
                  <button type="button" className="button--ghost" onClick={() => setOverlay("menu")}>
                    More
                  </button>
                </div>
              ) : null}
            </div>

          </section>

          <aside className="workspace-sidebar workspace-sidebar--inspector">
            <article className="panel panel--tight">
              <div className="section-heading section-heading--compact">
                <div>
                  <h3>{rightPanel === "edit" ? "Properties" : rightPanel === "review" ? "Review" : "Files & hand-off"}</h3>
                  <p>
                    {rightPanel === "edit"
                      ? "Edit the selected item or inspect its placement."
                      : rightPanel === "review"
                        ? "Resolve issues and confirm print readiness."
                        : "Open files or sync this project back to the shop."}
                  </p>
                </div>
              </div>
              {rightPanel === "edit" && !selectedLayer ? (
                <div className="inspector-empty">
                  <h4>Nothing selected</h4>
                  <p>Select an item on the canvas to edit its content and placement here.</p>
                  <div className="inspector-empty__steps">
                    <span>Add content from the Insert toolbar.</span>
                    <span>Select it on the canvas.</span>
                    <span>Adjust content, size, and appearance here.</span>
                  </div>
                </div>
              ) : null}
              {rightPanel === "edit" && selectedLayer && isEditableProject ? (
                <div className="inspector-form">
                  <div className="inspector-summary">
                    <div>
                      <p className="workspace-label">Selected</p>
                      <h4>{selectedLayer.name}</h4>
                    </div>
                    <div className="badge-row">
                      <span className="badge badge--neutral">{selectedLayer.type}</span>
                      <span className="badge badge--neutral">{selectedLayer.visible ? "visible" : "hidden"}</span>
                      <span className="badge badge--neutral">{selectedLayer.locked ? "locked" : "editable"}</span>
                      {isEditableProject ? (
                        <button
                          type="button"
                          className="button--ghost inspector-summary__menu"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openLayerContextMenuFromElement(event.currentTarget, selectedLayer.id);
                          }}
                        >
                          More actions
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {!selectedLayer.visible ? (
                    <div className="workspace-alert workspace-alert--subtle">
                      <div>
                        <strong>This item is hidden.</strong>
                        <p>Hidden items do not appear in previews or print files until you show them again.</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="inspector-section">
                    <div className="inspector-section__header">
                      <h4>Content</h4>
                      <p>What this item shows.</p>
                    </div>
                    <label>
                      <span>Name</span>
                      <input
                        value={selectedLayer.name}
                        onChange={(event) =>
                          updateSelectedLayer((layer) => ({
                            ...layer,
                            name: event.target.value
                          }))
                        }
                        disabled={project.status === "finalized" || selectedLayer.locked}
                      />
                    </label>
                    {selectedLayer.type === "text" ? (
                      <>
                        <label>
                          <span>Text</span>
                          <textarea
                            value={String(selectedLayer.metadata.text ?? "")}
                            onChange={(event) =>
                              updateSelectedLayer((layer) => ({
                                ...layer,
                                metadata: {
                                  ...layer.metadata,
                                  text: event.target.value
                                }
                              }))
                            }
                            disabled={project.status === "finalized" || selectedLayer.locked}
                          />
                        </label>
                        <div className="inspector-grid">
                          <label>
                            <span>Font size</span>
                            <input
                              type="number"
                              value={Number(selectedLayer.metadata.fontSize ?? 18)}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    fontSize: clamp(Number(event.target.value) || 18, 10, 96)
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            />
                          </label>
                          <label>
                            <span>Weight</span>
                            <select
                              value={String(selectedLayer.metadata.fontWeight ?? "600")}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    fontWeight: event.target.value
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            >
                              <option value="400">Regular</option>
                              <option value="600">Semibold</option>
                              <option value="700">Bold</option>
                            </select>
                          </label>
                          <label>
                            <span>Color</span>
                            <input
                              type="color"
                              value={String(selectedLayer.metadata.color ?? "#1b2430")}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    color: event.target.value
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            />
                          </label>
                          <label>
                            <span>Alignment</span>
                            <select
                              value={String(selectedLayer.metadata.textAlign ?? "left")}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    textAlign: event.target.value
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                        </div>
                      </>
                    ) : null}
                    {selectedLayer.type === "shape" ? (
                      <label>
                        <span>Color</span>
                        <input
                          type="color"
                          value={String(selectedLayer.metadata.fill ?? "#dbe8ff")}
                          onChange={(event) =>
                            updateSelectedLayer((layer) => ({
                              ...layer,
                              metadata: {
                                ...layer.metadata,
                                fill: event.target.value
                              }
                            }))
                          }
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                    ) : null}
                    {selectedLayer.type === "qr" || selectedLayer.type === "barcode" ? (
                      <label>
                        <span>{selectedLayer.type === "qr" ? "Link or value" : "Code value"}</span>
                        <input
                          value={String(selectedLayer.metadata.value ?? "")}
                          onChange={(event) =>
                            updateSelectedLayer((layer) => ({
                              ...layer,
                              metadata: {
                                ...layer.metadata,
                                value: event.target.value
                              }
                            }))
                          }
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                    ) : null}
                    {selectedLayer.type === "image" ? (
                      <>
                        <div className="kv-list">
                          <div className="kv-item">
                            <strong>Source file</strong>
                            <span>{layerAsset?.filename ?? "none"}</span>
                          </div>
                        </div>
                        <div className="inspector-grid">
                          <label>
                            <span>Fit</span>
                            <select
                              value={String(selectedLayer.metadata.fitMode ?? "cover")}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    fitMode: event.target.value
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="stretch">Stretch</option>
                            </select>
                          </label>
                          <label>
                            <span>Mask</span>
                            <select
                              value={String(selectedLayer.metadata.maskShape ?? "rect")}
                              onChange={(event) =>
                                updateSelectedLayer((layer) => ({
                                  ...layer,
                                  metadata: {
                                    ...layer.metadata,
                                    maskShape: event.target.value
                                  }
                                }))
                              }
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            >
                              <option value="rect">Rectangle</option>
                              <option value="rounded">Rounded</option>
                              <option value="circle">Circle</option>
                            </select>
                          </label>
                          <label>
                            <span>Crop X</span>
                            <input
                              type="number"
                              value={Number(selectedLayer.metadata.cropX ?? 0)}
                              onChange={(event) => updateSelectedImageCrop("cropX", Number(event.target.value))}
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            />
                          </label>
                          <label>
                            <span>Crop Y</span>
                            <input
                              type="number"
                              value={Number(selectedLayer.metadata.cropY ?? 0)}
                              onChange={(event) => updateSelectedImageCrop("cropY", Number(event.target.value))}
                              disabled={project.status === "finalized" || selectedLayer.locked}
                            />
                          </label>
                        </div>
                        <div className="stack-actions">
                          <button
                            type="button"
                            className="button--ghost"
                            onClick={() => openFilePicker("replace")}
                            disabled={project.status === "finalized" || selectedLayer.locked || saving}
                          >
                            Replace image
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
                            disabled={project.status === "finalized" || selectedLayer.locked}
                          >
                            Reset crop
                          </button>
                        </div>
                        <div className="stack-actions">
                          <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropX", Number(selectedLayer.metadata.cropX ?? 0) - 2)} disabled={project.status === "finalized" || selectedLayer.locked}>
                            Crop left
                          </button>
                          <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropX", Number(selectedLayer.metadata.cropX ?? 0) + 2)} disabled={project.status === "finalized" || selectedLayer.locked}>
                            Crop right
                          </button>
                          <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropY", Number(selectedLayer.metadata.cropY ?? 0) - 2)} disabled={project.status === "finalized" || selectedLayer.locked}>
                            Crop up
                          </button>
                          <button type="button" className="button--ghost" onClick={() => updateSelectedImageCrop("cropY", Number(selectedLayer.metadata.cropY ?? 0) + 2)} disabled={project.status === "finalized" || selectedLayer.locked}>
                            Crop down
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="inspector-section">
                    <div className="inspector-section__header">
                      <h4>Size and position</h4>
                      <p>Measured in millimeters.</p>
                    </div>
                    <div className="inspector-grid">
                      <label>
                        <span>Left</span>
                        <input
                          type="number"
                          value={selectedLayer.x}
                          onChange={(event) => updateLayerNumericField("x", event.target.value)}
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                      <label>
                        <span>Top</span>
                        <input
                          type="number"
                          value={selectedLayer.y}
                          onChange={(event) => updateLayerNumericField("y", event.target.value)}
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                      <label>
                        <span>Width</span>
                        <input
                          type="number"
                          value={selectedLayer.width}
                          onChange={(event) => updateLayerNumericField("width", event.target.value)}
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                      <label>
                        <span>Height</span>
                        <input
                          type="number"
                          value={selectedLayer.height}
                          onChange={(event) => updateLayerNumericField("height", event.target.value)}
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="inspector-section">
                    <div className="inspector-section__header">
                      <h4>Appearance</h4>
                      <p>Visibility and transparency.</p>
                    </div>
                    <div className="inspector-grid">
                      <label>
                        <span>Rotation</span>
                        <input
                          type="number"
                          value={selectedLayer.rotation}
                          onChange={(event) => updateLayerNumericField("rotation", event.target.value)}
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                      <label>
                        <span>Opacity %</span>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.opacity * 100)}
                          onChange={(event) =>
                            updateLayerNumericField("opacity", String(Number(event.target.value) / 100))
                          }
                          disabled={project.status === "finalized" || selectedLayer.locked}
                        />
                      </label>
                    </div>
                    <div className="kv-list">
                      <div className="kv-item">
                        <strong>Visibility</strong>
                        <span>{selectedLayer.visible ? "Visible on canvas and in print files" : "Hidden from canvas and print files"}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Editing</strong>
                        <span>{selectedLayer.locked ? "Locked against accidental changes" : "Unlocked for editing"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {rightPanel === "edit" && selectedLayer && !isEditableProject ? (
                <div className="inspector-form">
                  <div className="inspector-summary">
                    <div>
                      <p className="workspace-label">Selected</p>
                      <h4>{selectedLayer.name}</h4>
                    </div>
                    <div className="badge-row">
                      <span className="badge badge--neutral">{selectedLayer.type}</span>
                      <span className="badge badge--neutral">{selectedLayer.visible ? "visible" : "hidden"}</span>
                    </div>
                  </div>
                  <div className="workspace-alert workspace-alert--subtle">
                    <div>
                      <strong>Read-only preview.</strong>
                      <p>This version is locked because print files already exist. Open another project to keep editing.</p>
                    </div>
                  </div>
                  <div className="inspector-section">
                    <div className="inspector-section__header">
                      <h4>Content</h4>
                      <p>What this item contains.</p>
                    </div>
                    <div className="kv-list">
                      <div className="kv-item">
                        <strong>Name</strong>
                        <span>{selectedLayer.name}</span>
                      </div>
                      {selectedLayer.type === "text" ? (
                        <div className="kv-item">
                          <strong>Text</strong>
                          <span>{String(selectedLayer.metadata.text ?? "") || "n/a"}</span>
                        </div>
                      ) : null}
                      {selectedLayer.type === "image" ? (
                        <div className="kv-item">
                          <strong>Source file</strong>
                          <span>{layerAsset?.filename ?? "none"}</span>
                        </div>
                      ) : null}
                      {selectedLayer.type === "qr" || selectedLayer.type === "barcode" ? (
                        <div className="kv-item">
                          <strong>{selectedLayer.type === "qr" ? "Value" : "Code"}</strong>
                          <span>{String(selectedLayer.metadata.value ?? "") || "n/a"}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="inspector-section">
                    <div className="inspector-section__header">
                      <h4>Placement</h4>
                      <p>Measured in millimeters.</p>
                    </div>
                    <div className="kv-list">
                      <div className="kv-item">
                        <strong>Left</strong>
                        <span>{selectedLayer.x}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Top</strong>
                        <span>{selectedLayer.y}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Width</strong>
                        <span>{selectedLayer.width}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Height</strong>
                        <span>{selectedLayer.height}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Rotation</strong>
                        <span>{selectedLayer.rotation}</span>
                      </div>
                      <div className="kv-item">
                        <strong>Opacity</strong>
                        <span>{Math.round(selectedLayer.opacity * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {rightPanel === "review" ? (
                <>
                  <div className={`review-summary ${hasBlockingIssues ? "review-summary--warning" : "review-summary--pass"}`}>
                    <div>
                      <strong>{hasBlockingIssues ? "This side still needs attention." : "This side is ready for print files."}</strong>
                      <p>
                        {hasBlockingIssues
                          ? "Resolve the blocking items below. You can jump back to editing at any time."
                          : "Only warnings or informational notes remain on this side."}
                      </p>
                    </div>
                    {isEditableProject ? (
                      <div className="stack-actions">
                        {selectedLayer && !selectedLayer.visible ? (
                          <button type="button" className="button--ghost" onClick={() => toggleSelectedLayerFlag("visible")}>
                            Show selected item
                          </button>
                        ) : null}
                        <button type="button" className="button--ghost" onClick={() => setRightPanel("edit")}>
                          Back to editing
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="section-heading">
                    <div>
                      <h3>Live checks</h3>
                      <p>Quick layout hints before you create print files.</p>
                    </div>
                    <span className="badge badge--neutral">{liveChecks.length}</span>
                  </div>
                  <div className="issue-list">
                    {liveChecks.length === 0 ? <div className="empty-state">No immediate layout issues on this side.</div> : null}
                    {liveChecks.map((issue, index) => (
                      <div className="issue-item" key={`${issue.severity}-${index}`}>
                        <strong className={`issue-severity issue-severity--${issue.severity}`}>{issue.severity}</strong>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="section-heading">
                    <div>
                      <h3>Preflight</h3>
                      <p>Latest print-file validation.</p>
                    </div>
                    <span className={badgeTone(project.preflightReport?.status ?? null)}>
                      {project.preflightReport?.status ?? "not run"}
                    </span>
                  </div>
                  <div className="issue-list">
                    {project.preflightReport?.issues.length ? null : <div className="empty-state">No print-file validation has been generated yet.</div>}
                    {project.preflightReport?.issues.map((issue) => (
                      <div className="issue-item" key={issue.id}>
                        <strong>{issue.issueCode}</strong>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {rightPanel === "finish" ? (
                <>
                  <div className="section-heading">
                    <div>
                      <h3>Files</h3>
                      <p>Generated after you create print files.</p>
                    </div>
                    <span className="badge badge--neutral">{project.artifacts.length}</span>
                  </div>
                  <div className="artifact-list">
                    {project.artifacts.length === 0 ? <div className="empty-state">No files yet. Create print files to generate them.</div> : null}
                    {project.artifacts.map((artifact) => (
                      <div className="artifact-item" key={artifact.id}>
                        <strong>{humanizeStatus(artifact.artifactType)}</strong>
                        <a className="button-link button-link--ghost" href={resolveApiUrl(artifact.href)} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className="section-heading">
                    <div>
                      <h3>External references</h3>
                      <p>Optional links for the next system step.</p>
                    </div>
                  </div>
                  <div className="stack-actions stack-actions--secondary">
                    <button type="button" className="button--ghost" onClick={() => void linkCommerce("quote")} disabled={syncingCommerce}>
                      {syncingCommerce ? "Syncing..." : "Link quote"}
                    </button>
                    <button type="button" className="button--ghost" onClick={() => void linkCommerce("order")} disabled={syncingCommerce}>
                      {syncingCommerce ? "Syncing..." : "Link order"}
                    </button>
                  </div>
                  <div className="kv-list">
                    <div className="kv-item">
                      <strong>Status</strong>
                      <span className={badgeTone(project.commerceLink?.state ?? null)}>
                        {project.commerceLink ? humanizeStatus(project.commerceLink.state) : "not linked"}
                      </span>
                    </div>
                    <div className="kv-item">
                      <strong>Quote ref</strong>
                      <span>{project.commerceLink?.externalQuoteRef ?? "n/a"}</span>
                    </div>
                    <div className="kv-item">
                      <strong>Order ref</strong>
                      <span>{project.commerceLink?.externalOrderRef ?? "n/a"}</span>
                    </div>
                    <div className="kv-item">
                      <strong>Session</strong>
                      <span>{launchSession ? launchSession.customerEmail : "direct load"}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </article>
          </aside>
        </section>
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
      <div className="workspace-overlay" role="dialog" aria-modal="true">
        <div className="workspace-overlay__backdrop" onClick={() => setOverlay(null)} />
        <div className="workspace-overlay__panel">
          <div className="section-heading">
            <div>
              <h3>
                {overlay === "templates"
                  ? "Choose a template"
                  : overlay === "projects"
                    ? "Open another project"
                    : overlay === "navigator"
                      ? "Document"
                    : "Workspace options"}
              </h3>
              <p>
                {overlay === "templates"
                  ? "Templates replace the current draft layout with a new starting structure."
                  : overlay === "projects"
                    ? "Jump to another saved project without leaving the designer shell."
                    : overlay === "navigator"
                      ? "Pages, layers, assets, and session actions."
                    : "Session actions live here so the canvas can stay focused on design work."}
              </p>
            </div>
            <button type="button" className="button--ghost" onClick={() => setOverlay(null)}>
              Close
            </button>
          </div>

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
                  <h3>Project</h3>
                  <p>Open another project or leave this workspace.</p>
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
                  {isCompactViewport ? (
                    <button type="button" className="button--ghost" onClick={() => setOverlay("navigator")}>
                      Open document
                    </button>
                  ) : null}
                </div>
              </article>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu || !contextMenuLayer || !isEditableProject) {
      return null;
    }

    return (
      <div
        className="context-menu"
        style={{
          left: Math.min(contextMenu.x, window.innerWidth - 220),
          top: Math.min(contextMenu.y, window.innerHeight - 260)
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="context-menu__header">
          <strong>{contextMenuLayer.name}</strong>
          <span>{contextMenuLayer.type}</span>
        </div>
        <button type="button" onClick={() => { duplicateSelectedLayer(); setContextMenu(null); }}>
          Duplicate
        </button>
        <button type="button" onClick={() => { toggleSelectedLayerFlag("visible"); setContextMenu(null); }}>
          {contextMenuLayer.visible ? "Hide item" : "Show item"}
        </button>
        <button type="button" onClick={() => { toggleSelectedLayerFlag("locked"); setContextMenu(null); }}>
          {contextMenuLayer.locked ? "Unlock item" : "Lock item"}
        </button>
        <button type="button" onClick={() => { moveSelectedLayer("forward"); setContextMenu(null); }}>
          Bring forward
        </button>
        <button type="button" onClick={() => { moveSelectedLayer("backward"); setContextMenu(null); }}>
          Send backward
        </button>
        <button type="button" onClick={() => { alignSelectedLayer("center"); setContextMenu(null); }}>
          Center in safe area
        </button>
        <button type="button" className="context-menu__danger" onClick={() => { deleteSelectedLayer(); setContextMenu(null); }}>
          Delete
        </button>
      </div>
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
