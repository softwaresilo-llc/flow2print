import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { Flow2PrintDocument } from "@flow2print/design-document";
import { summarizeDocument } from "@flow2print/editor-engine";
import { AppShell } from "@flow2print/ui-kit";

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
const clampBoxToArtboard = (
  box: { x: number; y: number; width: number; height: number },
  artboard: { width: number; height: number }
) => ({
  x: clamp(box.x, 0, artboard.width),
  y: clamp(box.y, 0, artboard.height),
  width: clamp(box.width, 0, Math.max(0, artboard.width - clamp(box.x, 0, artboard.width))),
  height: clamp(box.height, 0, Math.max(0, artboard.height - clamp(box.y, 0, artboard.height)))
});
const layerPreviewText = (layer: DesignerLayer) => {
  if (layer.type === "text") {
    return String(layer.metadata.text ?? layer.name).slice(0, 2).toUpperCase();
  }
  if (layer.type === "shape") {
    return "";
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
  const [overlay, setOverlay] = useState<null | "templates" | "projects">(null);
  const [selectedStarterProductRef, setSelectedStarterProductRef] = useState<string>(starterProducts[0].productRef);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedSurfaceIndex, setSelectedSurfaceIndex] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [leftPanel, setLeftPanel] = useState<"document" | "assets" | "history">("document");
  const [rightPanel, setRightPanel] = useState<"object" | "checks" | "delivery">("object");
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
  const [dragState, setDragState] = useState<{
    layerId: string;
    surfaceIndex: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    layerId: string;
    surfaceIndex: number;
    startClientX: number;
    startClientY: number;
    originWidth: number;
    originHeight: number;
    layerX: number;
    layerY: number;
  } | null>(null);
  const [rotateState, setRotateState] = useState<{
    layerId: string;
    surfaceIndex: number;
    centerClientX: number;
    centerClientY: number;
    originRotation: number;
    startAngle: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const errorTitle = error?.startsWith("This design link is no longer available")
    ? "Design link expired."
    : error?.startsWith("This project is no longer available")
      ? "Project not available."
      : "Project could not be opened.";

  useEffect(() => {
    setRouteFallbackActive(false);
  }, [route.mode, route.value]);

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
        setLeftPanel("document");
        setSelectedLayerId(projectData.document.surfaces[0]?.layers[0]?.id ?? null);
        setSelectedTemplateId(projectData.templateId);
        setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "delivery" : "object");
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
    setLeftPanel("document");
    setRightPanel(projectData.status === "finalized" || projectData.status === "ordered" ? "delivery" : "object");
    await loadRecentProjects();
  };

  const currentSurface = draftDocument?.surfaces[selectedSurfaceIndex] ?? null;
  const selectedLayer = currentSurface?.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const contextMenuLayer = currentSurface?.layers.find((layer) => layer.id === contextMenu?.layerId) ?? null;
  const layerAsset = selectedLayer
    ? assets.find((asset) => asset.id === String(selectedLayer.metadata.assetId ?? ""))
    : null;
  const safeAreaBox = currentSurface ? clampBoxToArtboard(currentSurface.safeBox, currentSurface.artboard) : null;
  const bleedAreaBox = currentSurface ? clampBoxToArtboard(currentSurface.bleedBox, currentSurface.artboard) : null;
  const compatibleTemplates = useMemo(
    () => templates.filter((template) => template.blueprintId === (project?.blueprintId ?? blueprintForProductRef(selectedStarterProductRef))),
    [project?.blueprintId, selectedStarterProductRef, templates]
  );
  const currentTemplate = compatibleTemplates.find((template) => template.id === (project?.templateId ?? selectedTemplateId)) ?? null;
  const isEditableProject = project?.status === "draft";

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
      setSelectedLayerId(null);
      return;
    }
    if (!selectedLayerId || !surface.layers.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(surface.layers[0]?.id ?? null);
    }
  }, [draftDocument, selectedLayerId, selectedSurfaceIndex]);

  useEffect(() => {
    if (selectedLayerId && isEditableProject) {
      setRightPanel("object");
    }
  }, [isEditableProject, selectedLayerId]);

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

  const stageScale = currentSurface
    ? Math.min(820 / currentSurface.artboard.width, 620 / currentSurface.artboard.height, 5.5)
    : 1;
  const effectiveScale = stageScale * zoom;

  useEffect(() => {
    if (!dragState && !resizeState && !rotateState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setDraftDocument((document) => {
        if (!document) {
          return document;
        }

        if (dragState) {
          const deltaX = (event.clientX - dragState.startClientX) / effectiveScale;
          const deltaY = (event.clientY - dragState.startClientY) / effectiveScale;

          return {
            ...document,
            surfaces: document.surfaces.map((surface, surfaceIndex) =>
              surfaceIndex === dragState.surfaceIndex
                ? {
                    ...surface,
                    layers: surface.layers.map((layer) =>
                      layer.id === dragState.layerId
                        ? {
                            ...layer,
                            x: snapToStep(
                              clamp(dragState.originX + deltaX, 0, Math.max(0, surface.artboard.width - layer.width)),
                              snapEnabled
                            ),
                            y: snapToStep(
                              clamp(dragState.originY + deltaY, 0, Math.max(0, surface.artboard.height - layer.height)),
                              snapEnabled
                            )
                          }
                        : layer
                    )
                  }
                : surface
            )
          };
        }

        if (resizeState) {
          const deltaX = (event.clientX - resizeState.startClientX) / effectiveScale;
          const deltaY = (event.clientY - resizeState.startClientY) / effectiveScale;

          return {
            ...document,
            surfaces: document.surfaces.map((surface, surfaceIndex) =>
              surfaceIndex === resizeState.surfaceIndex
                ? {
                    ...surface,
                    layers: surface.layers.map((layer) =>
                      layer.id === resizeState.layerId
                        ? {
                            ...layer,
                            width: snapToStep(
                              clamp(
                                resizeState.originWidth + deltaX,
                                8,
                                Math.max(8, surface.artboard.width - resizeState.layerX)
                              ),
                              snapEnabled
                            ),
                            height: snapToStep(
                              clamp(
                                resizeState.originHeight + deltaY,
                                8,
                                Math.max(8, surface.artboard.height - resizeState.layerY)
                              ),
                              snapEnabled
                            )
                          }
                        : layer
                    )
                  }
                : surface
            )
          };
        }

        if (rotateState) {
          const currentAngle =
            (Math.atan2(event.clientY - rotateState.centerClientY, event.clientX - rotateState.centerClientX) * 180) /
            Math.PI;
          const deltaAngle = currentAngle - rotateState.startAngle;
          const normalizedRotation = ((((rotateState.originRotation + deltaAngle) % 360) + 540) % 360) - 180;

          return {
            ...document,
            surfaces: document.surfaces.map((surface, surfaceIndex) =>
              surfaceIndex === rotateState.surfaceIndex
                ? {
                    ...surface,
                    layers: surface.layers.map((layer) =>
                      layer.id === rotateState.layerId
                        ? {
                            ...layer,
                            rotation: Math.round(normalizedRotation)
                          }
                        : layer
                    )
                  }
                : surface
            )
          };
        }

        return document;
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
      setResizeState(null);
      setRotateState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, effectiveScale, resizeState, rotateState, snapEnabled]);

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
      setRightPanel("checks");
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
      setRightPanel("delivery");
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
      setSelectedLayerId(layerId);
    } finally {
      setSaving(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentSurface || !project || !draftDocument) {
      return;
    }
    setContextMenu(null);
    captureHistory("Upload image");

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
      setSelectedLayerId(layerId);
    } finally {
      setSaving(false);
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
    setSelectedLayerId(currentSurface.layers.find((layer) => layer.id !== selectedLayerId)?.id ?? null);
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
    if (!selectedLayer || !currentSurface) {
      return;
    }
    setContextMenu(null);
    captureHistory(direction === "forward" ? "Bring forward" : "Send backward");
    updateCurrentSurface((surface) => {
      const index = surface.layers.findIndex((layer) => layer.id === selectedLayer.id);
      if (index === -1) {
        return surface;
      }
      const targetIndex =
        direction === "forward"
          ? clamp(index + 1, 0, surface.layers.length - 1)
          : clamp(index - 1, 0, surface.layers.length - 1);
      if (targetIndex === index) {
        return surface;
      }
      const nextLayers = [...surface.layers];
      const [layer] = nextLayers.splice(index, 1);
      nextLayers.splice(targetIndex, 0, layer);
      return { ...surface, layers: nextLayers };
    });
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
    setSelectedLayerId(layerId);
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
      setRightPanel("object");
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
    setRightPanel("delivery");
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
        setSelectedLayerId(null);
        setContextMenu(null);
      } else if (isEditableProject && selectedLayer && isDelete) {
        event.preventDefault();
        deleteSelectedLayer();
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
  }, [currentSurface, hasUnsavedChanges, historyFuture, historyPast, isEditableProject, selectedLayer, snapEnabled]);

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

  const renderWorkspace = () => {
    if (!project || !draftDocument || !currentSurface || !documentSummary) {
      return null;
    }

    return (
      <div className={`workspace-shell ${isEmbedded ? "workspace-shell--embedded" : ""}`}>
        <header className="workspace-topbar">
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
          <div className="workspace-actions">
            <button type="button" className="button--ghost" onClick={() => setOverlay("projects")}>
              Open project
            </button>
            {isEditableProject ? (
              <>
                <button
                  type="button"
                  className="button--ghost"
                  onClick={() => setOverlay("templates")}
                  disabled={templateBusy}
                >
                  {templateBusy ? "Changing..." : "Change template"}
                </button>
                <button
                  type="button"
                  className="button--ghost"
                  onClick={resetDraft}
                  disabled={!hasUnsavedChanges || saving}
                >
                  Discard changes
                </button>
                <button type="button" onClick={() => void saveDraftDocument()} disabled={!hasUnsavedChanges || saving}>
                  {saving ? "Saving..." : "Save draft"}
                </button>
                <button type="button" onClick={() => void finalizeProject()} disabled={finalizing || hasBlockingIssues}>
                  {finalizing ? "Creating..." : "Create print files"}
                </button>
              </>
            ) : (
              <button type="button" onClick={openExportPanel}>
                Open export
              </button>
            )}
            <button type="button" className="button--ghost" onClick={closeWorkspace}>
              {isEmbedded ? "Done" : "Back"}
            </button>
          </div>
        </header>

        <section className="workspace-layout">
          <aside className="workspace-sidebar">
            <article className="panel panel--tight">
              <div className="section-heading">
                <div>
                  <h3>Workspace</h3>
                  <p>Move between document structure, reusable assets, and recent changes.</p>
                </div>
                <span className="badge badge--neutral">
                  {leftPanel === "document"
                    ? `${currentSurface.layers.length} items`
                    : leftPanel === "assets"
                      ? `${availableImageAssets.length} files`
                      : `${historyPast.length} changes`}
                </span>
              </div>
              <div className="panel-tabs">
                <button
                  type="button"
                  className={`panel-tab ${leftPanel === "document" ? "panel-tab--active" : ""}`}
                  onClick={() => setLeftPanel("document")}
                >
                  Document
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
                  className={`panel-tab ${leftPanel === "history" ? "panel-tab--active" : ""}`}
                  onClick={() => setLeftPanel("history")}
                >
                  History
                </button>
              </div>
              {leftPanel === "document" ? (
                <>
                  <div className="surface-list">
                    {draftDocument.surfaces.map((surface, index) => (
                      <button
                        key={surface.surfaceId}
                        type="button"
                        className={`surface-tab ${index === selectedSurfaceIndex ? "surface-tab--active" : ""}`}
                        onClick={() => setSelectedSurfaceIndex(index)}
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
                      <span>Top item appears in front on the canvas.</span>
                    </div>
                  </div>
                  <p className="panel-hint">
                    {isEditableProject
                      ? "Drag to reorder. Use the eye and lock controls for quick changes."
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
                        onClick={() => setSelectedLayerId(layer.id)}
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
                            setSelectedLayerId(layer.id);
                          }
                        }}
                      >
                        <span className="layer-row__index">{index + 1}</span>
                        <span
                          className={`layer-row__preview layer-row__preview--${layer.type}`}
                          style={layer.type === "shape" ? { background: String(layer.metadata.fill ?? "#dbe8ff") } : undefined}
                        >
                          {layer.type === "shape" ? null : layerPreviewText(layer)}
                        </span>
                        <span className="layer-row__content">
                          <strong>{layer.name}</strong>
                          <small>
                            {layer.type}
                            {!layer.visible ? " · hidden" : ""}
                            {layer.locked ? " · locked" : ""}
                          </small>
                        </span>
                        <div className="layer-row__actions">
                          {isEditableProject ? <span className="layer-row__drag" aria-hidden="true">⋮⋮</span> : null}
                          <button
                            type="button"
                            className={`layer-row__icon ${layer.visible ? "" : "layer-row__icon--muted"}`}
                            aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                            disabled={!isEditableProject}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedLayerId(layer.id);
                              toggleSelectedLayerFlag("visible");
                            }}
                          >
                            {layer.visible ? "◉" : "○"}
                          </button>
                          {isEditableProject ? (
                            <button
                              type="button"
                              className={`layer-row__icon ${layer.locked ? "layer-row__icon--muted" : ""}`}
                              aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setSelectedLayerId(layer.id);
                                toggleSelectedLayerFlag("locked");
                              }}
                            >
                              {layer.locked ? "🔒" : "🔓"}
                            </button>
                          ) : (
                            <span className="layer-row__status">{layer.visible ? "Shown" : "Hidden"}</span>
                          )}
                          {isEditableProject ? (
                            <button
                              type="button"
                              className="layer-row__menu"
                              aria-label={`Open actions for ${layer.name}`}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openLayerContextMenuFromElement(event.currentTarget, layer.id);
                              }}
                            >
                              ⋯
                            </button>
                          ) : null}
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
                      <button type="button" onClick={openFilePicker} disabled={saving}>
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
              {leftPanel === "history" ? (
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

          <section className="workspace-stage">
            <div className="stage-header">
              <div>
                <p className="workspace-label">Canvas</p>
                <h2>{currentSurface.label}</h2>
                <p className="stage-subtitle">
                  {isEditableProject
                    ? selectedLayer
                      ? `Editing ${selectedLayer.name}`
                      : "Add an item or select one on the canvas."
                    : selectedLayer
                      ? `Previewing ${selectedLayer.name}`
                      : "Preview only. Open another project or reorder to make changes."}
                </p>
              </div>
              <div className="badge-row">
                <span className="badge badge--neutral">{currentSurface.layers.length} layers</span>
                <span className="badge badge--neutral">{documentSummary.layerCount} total objects</span>
                <span className="badge badge--neutral">{documentSummary.assetCount} linked assets</span>
              </div>
            </div>
            {hasBlockingIssues ? (
              <div className="workspace-alert workspace-alert--warning">
                <div>
                  <strong>Review needed before print files can be created.</strong>
                  <p>Fix the blocking items in Review, or add content directly on the canvas if this side is still empty.</p>
                </div>
                <button type="button" className="button--ghost" onClick={() => setRightPanel("checks")}>
                  Open review
                </button>
              </div>
            ) : null}

            <div className="stage-wrapper">
              <div className="stage-toolbar">
                {isEditableProject ? (
                  <div className="stage-toolbar__group">
                    <span className="stage-toolbar__label">Add</span>
                    <div className="stack-actions">
                      <button type="button" onClick={addTextLayer} disabled={project.status === "finalized"}>
                        Text
                      </button>
                      <button type="button" className="button--ghost" onClick={addShapeLayer} disabled={project.status === "finalized"}>
                        Shape
                      </button>
                      <button
                        type="button"
                        className="button--ghost"
                        onClick={openFilePicker}
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
                ) : (
                  <div className="stage-toolbar__group">
                    <span className="stage-toolbar__label">Mode</span>
                    <div className="readonly-strip">
                      <strong>Preview mode</strong>
                      <span>This design already has print files. You can inspect it here or open another project.</span>
                    </div>
                  </div>
                )}
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
                    {isEditableProject ? (
                      <>
                        <button type="button" className="button--ghost" onClick={undoChange} disabled={historyPast.length === 0}>
                          Undo
                        </button>
                        <button type="button" className="button--ghost" onClick={redoChange} disabled={historyFuture.length === 0}>
                          Redo
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="layout-guide-bar">
                <div className="layout-guide-bar__intro">
                  <strong>Layout</strong>
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
              {isEditableProject && selectedLayer ? (
                <div className="selection-toolbar">
                  <div className="selection-toolbar__intro">
                    <strong>{selectedLayer.name}</strong>
                    <span>{selectedLayer.type}</span>
                  </div>
                  <div className="selection-toolbar__actions">
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
                    <button type="button" className="button--ghost" onClick={deleteSelectedLayer}>
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="artboard-shell">
                <div
                  className={`artboard ${gridEnabled ? "" : "artboard--gridless"}`}
                  style={{
                    width: currentSurface.artboard.width * effectiveScale,
                    height: currentSurface.artboard.height * effectiveScale
                  }}
                  onClick={() => setSelectedLayerId(null)}
                >
                {guidesVisible && bleedAreaBox ? (
                  <div
                    className="artboard__bleed"
                    style={{
                      left: bleedAreaBox.x * effectiveScale,
                      top: bleedAreaBox.y * effectiveScale,
                      width: bleedAreaBox.width * effectiveScale,
                      height: bleedAreaBox.height * effectiveScale
                    }}
                  />
                ) : null}
                {guidesVisible && safeAreaBox ? (
                  <div
                    className="artboard__safe"
                    style={{
                      left: safeAreaBox.x * effectiveScale,
                      top: safeAreaBox.y * effectiveScale,
                      width: safeAreaBox.width * effectiveScale,
                      height: safeAreaBox.height * effectiveScale
                    }}
                  />
                ) : null}
                  {currentSurface.layers.length === 0 ? (
                    <div className="artboard__empty">
                      <strong>Start this side</strong>
                      <p>Add text, a shape, or an image. The blue dashed box is the safe area for important content.</p>
                      <div className="artboard__empty-actions">
                        <button type="button" onClick={addTextLayer} disabled={project.status === "finalized"}>
                          Add text
                        </button>
                        <button type="button" className="button--ghost" onClick={addShapeLayer} disabled={project.status === "finalized"}>
                          Add shape
                        </button>
                        <button
                          type="button"
                          className="button--ghost"
                          onClick={() => void createDemoAsset()}
                          disabled={project.status === "finalized" || saving}
                        >
                          Add sample image
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {currentSurface.layers.map((layer) => {
                    const stageAsset = assets.find((asset) => asset.id === String(layer.metadata.assetId ?? ""));
                    const stageAssetPreview = stageAsset ? localAssetUrls[stageAsset.id] : undefined;
                    const label =
                      layer.type === "text"
                        ? String(layer.metadata.text ?? layer.name)
                        : layer.type === "shape"
                          ? "Shape"
                          : stageAsset?.filename ?? layer.name;
                    const isSelected = layer.id === selectedLayerId;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className={`stage-layer stage-layer--${layer.type} ${isSelected ? "stage-layer--selected" : ""}`}
                        style={{
                          left: layer.x * effectiveScale,
                          top: layer.y * effectiveScale,
                          width: layer.width * effectiveScale,
                          height: layer.height * effectiveScale,
                          opacity: layer.opacity,
                          display: layer.visible ? "grid" : "none",
                          transform: `rotate(${layer.rotation}deg)`,
                          transformOrigin: "center center",
                          background:
                            layer.type === "shape"
                              ? String(layer.metadata.fill ?? "#dbe8ff")
                              : layer.type === "image" && stageAssetPreview
                                ? `center / cover no-repeat url(${stageAssetPreview})`
                                : undefined
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        onContextMenu={(event) => {
                          event.stopPropagation();
                          openLayerContextMenu(event, layer.id);
                        }}
                        onPointerDown={(event) => {
                          if (project.status === "finalized" || layer.locked) {
                            return;
                          }
                          event.stopPropagation();
                          captureHistory();
                          setSelectedLayerId(layer.id);
                          setDragState({
                            layerId: layer.id,
                            surfaceIndex: selectedSurfaceIndex,
                            startClientX: event.clientX,
                            startClientY: event.clientY,
                            originX: layer.x,
                            originY: layer.y
                          });
                        }}
                      >
                        <span className="stage-layer__name">{layer.name}</span>
                        <span className="stage-layer__label">{label}</span>
                        {isSelected && isEditableProject && !layer.locked ? (
                          <>
                            <span
                              className="stage-layer__handle stage-layer__handle--rotate"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                captureHistory();
                                const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                                if (!bounds) {
                                  return;
                                }
                                setRotateState({
                                  layerId: layer.id,
                                  surfaceIndex: selectedSurfaceIndex,
                                  centerClientX: bounds.left + bounds.width / 2,
                                  centerClientY: bounds.top + bounds.height / 2,
                                  originRotation: layer.rotation,
                                  startAngle:
                                    (Math.atan2(
                                      event.clientY - (bounds.top + bounds.height / 2),
                                      event.clientX - (bounds.left + bounds.width / 2)
                                    ) *
                                      180) /
                                    Math.PI
                                });
                              }}
                            />
                            <span
                              className="stage-layer__handle stage-layer__handle--resize"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                captureHistory();
                                setResizeState({
                                  layerId: layer.id,
                                  surfaceIndex: selectedSurfaceIndex,
                                  startClientX: event.clientX,
                                  startClientY: event.clientY,
                                  originWidth: layer.width,
                                  originHeight: layer.height,
                                  layerX: layer.x,
                                  layerY: layer.y
                                });
                              }}
                            />
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="surface-meta-grid">
              <div className="metric-card">
                <strong>Artboard</strong>
                <span className="metric-value">
                  {currentSurface.artboard.width} × {currentSurface.artboard.height}
                </span>
              </div>
              <div className="metric-card">
                <strong>Safe area</strong>
                <span className="metric-value">
                  {safeAreaBox?.width ?? currentSurface.safeBox.width} × {safeAreaBox?.height ?? currentSurface.safeBox.height}
                </span>
              </div>
              <div className="metric-card">
                <strong>Version</strong>
                <span className="metric-value metric-value--small">{project.activeVersionId.slice(-12)}</span>
              </div>
            </div>
            <div className="layout-guide-card">
              <div className="kv-list">
                <div className="kv-item">
                  <strong>Guides</strong>
                  <span>{guidesVisible ? "Visible on canvas" : "Hidden from canvas"}</span>
                </div>
                <div className="kv-item">
                  <strong>Placement</strong>
                  <span>{snapEnabled ? "Snap is on with 2 mm steps." : "Snap is off for free placement."}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="workspace-sidebar">
            <article className="panel panel--tight">
              <div className="section-heading">
                <div>
                  <h3>Inspector</h3>
                  <p>Edit the selected item, review warnings, or export the result.</p>
                </div>
              </div>
              <div className="panel-tabs">
                <button
                  type="button"
                  className={`panel-tab ${rightPanel === "object" ? "panel-tab--active" : ""}`}
                  onClick={() => setRightPanel("object")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`panel-tab ${rightPanel === "checks" ? "panel-tab--active" : ""}`}
                  onClick={() => setRightPanel("checks")}
                >
                  Review
                </button>
                <button
                  type="button"
                  className={`panel-tab ${rightPanel === "delivery" ? "panel-tab--active" : ""}`}
                  onClick={() => setRightPanel("delivery")}
                >
                  Export
                </button>
              </div>
              {rightPanel === "object" && !selectedLayer ? (
                <div className="inspector-empty">
                  <h4>Select an item</h4>
                  <p>Click any text, shape or image on the canvas to edit it here.</p>
                  <div className="inspector-empty__steps">
                    <span>1. Add an item in the canvas toolbar.</span>
                    <span>2. Click it on the canvas.</span>
                    <span>3. Edit its content and size here.</span>
                  </div>
                </div>
              ) : null}
              {rightPanel === "object" && selectedLayer && isEditableProject ? (
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
                    {selectedLayer.type === "image" ? (
                      <div className="kv-list">
                        <div className="kv-item">
                          <strong>Source file</strong>
                          <span>{layerAsset?.filename ?? "none"}</span>
                        </div>
                      </div>
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
              {rightPanel === "object" && selectedLayer && !isEditableProject ? (
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
              {rightPanel === "checks" ? (
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
                        {currentSurface.layers.length === 0 ? (
                          <button type="button" className="button--ghost" onClick={addTextLayer}>
                            Add text
                          </button>
                        ) : null}
                        {currentSurface.layers.length === 0 ? (
                          <button type="button" className="button--ghost" onClick={() => void createDemoAsset()}>
                            Add sample image
                          </button>
                        ) : null}
                        {selectedLayer && !selectedLayer.visible ? (
                          <button type="button" className="button--ghost" onClick={() => toggleSelectedLayerFlag("visible")}>
                            Show selected item
                          </button>
                        ) : null}
                        <button type="button" className="button--ghost" onClick={() => setRightPanel("object")}>
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
              {rightPanel === "delivery" ? (
                <>
                  <div className="section-heading">
                    <div>
                      <h3>Output files</h3>
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
                      <h3>Shop link</h3>
                      <p>Quote and order connection for the current project.</p>
                    </div>
                  </div>
                  <div className="stack-actions">
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
              <h3>{overlay === "templates" ? "Choose a template" : "Open another project"}</h3>
              <p>
                {overlay === "templates"
                  ? "Templates replace the current draft layout with a new starting structure."
                  : "Jump to another saved project without leaving the designer shell."}
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
