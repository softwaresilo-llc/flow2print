import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  ActiveSelection,
  Canvas,
  Circle,
  FabricImage,
  Group,
  Rect,
  Textbox,
  type FabricObject
} from "fabric";

import type { Flow2PrintDocument } from "@flow2print/design-document";

type DesignerLayer = Flow2PrintDocument["surfaces"][number]["layers"][number];
type DesignerSurface = Flow2PrintDocument["surfaces"][number];

interface FabricCanvasStageProps {
  surface: DesignerSurface;
  assetUrls: Record<string, string>;
  selectedLayerIds: string[];
  zoom: number;
  maxWidth: number;
  maxHeight: number;
  cropMode: boolean;
  cropLayerId: string | null;
  gridEnabled: boolean;
  guidesVisible: boolean;
  isEditable: boolean;
  onSelectionChange: (ids: string[]) => void;
  onSurfaceChange: (surface: DesignerSurface, historyLabel: string) => void;
}

export interface FabricCanvasStageHandle {
  bringForward: () => void;
  sendBackward: () => void;
}

type FabricLayerObject = FabricObject & {
  data?: {
    layerId: string;
    layerType: DesignerLayer["type"];
    layerName: string;
    layerMetadata: Record<string, unknown>;
    locked: boolean;
    visible: boolean;
  };
};

const GRID_STEP = 16;
const HISTORY_LABELS: Record<string, string> = {
  moving: "Move selection",
  scaling: "Resize selection",
  rotating: "Rotate selection",
  modified: "Edit selection"
};

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getCenteredOffset = (frameSize: number, renderedSize: number) => (frameSize - renderedSize) / 2;
const clampImageOffset = (offset: number, frameSize: number, renderedSize: number) => {
  const centeredOffset = getCenteredOffset(frameSize, renderedSize);
  if (renderedSize <= frameSize) {
    return centeredOffset;
  }
  return Math.min(0, Math.max(frameSize - renderedSize, offset));
};

const createMask = (layer: DesignerLayer, width: number, height: number) => {
  const maskShape = String(layer.metadata.maskShape ?? "rect");
  if (maskShape === "rounded") {
    return new Rect({
      left: 0,
      top: 0,
      width,
      height,
      rx: Math.min(width, height) * 0.08,
      ry: Math.min(width, height) * 0.08,
      originX: "left",
      originY: "top"
    });
  }
  if (maskShape === "circle") {
    const radius = Math.min(width, height) / 2;
    return new Circle({
      left: width / 2,
      top: height / 2,
      radius,
      originX: "center",
      originY: "center"
    });
  }
  return new Rect({
    left: 0,
    top: 0,
    width,
    height,
    originX: "left",
    originY: "top"
  });
};

const createTextObject = (layer: DesignerLayer, scale: number) =>
  new Textbox(String(layer.metadata.text ?? layer.name), {
    left: layer.x * scale,
    top: layer.y * scale,
    width: layer.width * scale,
    height: layer.height * scale,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    lockScalingFlip: true,
    originX: "left",
    originY: "top",
    fill: String(layer.metadata.color ?? "#1b2430"),
    fontSize: Math.max(10, Number(layer.metadata.fontSize ?? 18) * scale * 0.28),
    fontWeight: String(layer.metadata.fontWeight ?? "600"),
    textAlign: String(layer.metadata.textAlign ?? "left") as "left" | "center" | "right",
    editable: false
  });

const createShapeObject = (layer: DesignerLayer, scale: number) =>
  new Rect({
    left: layer.x * scale,
    top: layer.y * scale,
    width: layer.width * scale,
    height: layer.height * scale,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    lockScalingFlip: true,
    originX: "left",
    originY: "top",
    rx: 10,
    ry: 10,
    fill: String(layer.metadata.fill ?? "#dbe8ff"),
    stroke: "#9bb0d8",
    strokeWidth: 1
  });

const createQrOrBarcodeObject = (layer: DesignerLayer, scale: number) => {
  const width = layer.width * scale;
  const height = layer.height * scale;
  const frame = new Rect({
    left: 0,
    top: 0,
    width,
    height,
    rx: layer.type === "qr" ? 6 : 4,
    ry: layer.type === "qr" ? 6 : 4,
    fill: "#ffffff",
    stroke: "#aeb7c5",
    strokeWidth: 1
  });
  const label = new Textbox(String(layer.metadata.value ?? layer.name), {
    left: 8,
    top: layer.type === "qr" ? height / 2 - 18 : height / 2 - 10,
    width: Math.max(24, width - 16),
    fontSize: Math.max(10, 12 * scale * 0.4),
    fontWeight: "600",
    fill: "#1b2430",
    textAlign: "center",
    editable: false
  });
  return new Group([frame, label], {
    left: layer.x * scale,
    top: layer.y * scale,
    width,
    height,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    lockScalingFlip: true,
    originX: "left",
    originY: "top"
  });
};

const createImageObject = async (layer: DesignerLayer, scale: number, assetUrls: Record<string, string>) => {
  const assetId = String(layer.metadata.assetId ?? "");
  const url = assetUrls[assetId];
  const left = layer.x * scale;
  const top = layer.y * scale;
  const renderWidth = layer.width * scale;
  const renderHeight = layer.height * scale;
  if (!url) {
    return new Group(
      [
        new Rect({
          left: 0,
          top: 0,
          width: renderWidth,
          height: renderHeight,
          fill: "#eef4fb",
          stroke: "#aac2e8",
          strokeWidth: 1
        }),
        new Textbox(layer.name, {
          left: 8,
          top: 8,
          width: Math.max(24, renderWidth - 16),
          fontSize: Math.max(10, 12 * scale * 0.45),
          fill: "#40608f",
          editable: false
        })
      ],
      {
        left,
        top,
        angle: layer.rotation,
        opacity: layer.opacity,
        visible: layer.visible,
        selectable: !layer.locked,
        evented: !layer.locked,
        hasControls: !layer.locked,
        originX: "left",
        originY: "top"
      }
    );
  }

  const image = await FabricImage.fromURL(url);
  const sourceWidth = image.width ?? renderWidth;
  const sourceHeight = image.height ?? renderHeight;
  const fitMode = String(layer.metadata.fitMode ?? "cover");
  const uniformScale =
    fitMode === "contain"
      ? Math.min(renderWidth / sourceWidth, renderHeight / sourceHeight)
      : fitMode === "cover"
        ? Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight)
        : null;
  image.set({
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
    scaleX: uniformScale ?? renderWidth / sourceWidth,
    scaleY: uniformScale ?? renderHeight / sourceHeight
  });

  const renderedWidth = image.getScaledWidth();
  const renderedHeight = image.getScaledHeight();
  const cropOffsetX = Number(layer.metadata.cropX ?? 0) * scale;
  const cropOffsetY = Number(layer.metadata.cropY ?? 0) * scale;
  image.set({
    left: clampImageOffset(getCenteredOffset(renderWidth, renderedWidth) + cropOffsetX, renderWidth, renderedWidth),
    top: clampImageOffset(getCenteredOffset(renderHeight, renderedHeight) + cropOffsetY, renderHeight, renderedHeight)
  });

  return new Group([image], {
    left,
    top,
    width: renderWidth,
    height: renderHeight,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    originX: "left",
    originY: "top",
    clipPath: createMask(layer, renderWidth, renderHeight)
  });
};

const createGroupObject = async (layer: DesignerLayer, scale: number, assetUrls: Record<string, string>) => {
  const children = Array.isArray(layer.metadata.children) ? (layer.metadata.children as DesignerLayer[]) : [];
  const childObjects = await Promise.all(
    children.map(async (child) =>
      createFabricObject(
        {
          ...child,
          x: child.x - layer.x,
          y: child.y - layer.y
        },
        scale,
        assetUrls
      )
    )
  );
  return new Group(childObjects.filter(Boolean) as FabricObject[], {
    left: layer.x * scale,
    top: layer.y * scale,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    hasControls: !layer.locked,
    lockScalingFlip: true,
    originX: "left",
    originY: "top"
  });
};

const createFabricObject = async (layer: DesignerLayer, scale: number, assetUrls: Record<string, string>) => {
  let object: FabricObject;
  switch (layer.type) {
    case "text":
      object = createTextObject(layer, scale);
      break;
    case "shape":
      object = createShapeObject(layer, scale);
      break;
    case "image":
      object = await createImageObject(layer, scale, assetUrls);
      break;
    case "qr":
    case "barcode":
      object = createQrOrBarcodeObject(layer, scale);
      break;
    case "group":
      object = await createGroupObject(layer, scale, assetUrls);
      break;
    default:
      object = createShapeObject({ ...layer, type: "shape" }, scale);
      break;
  }

  const fabricObject = object as FabricLayerObject;
  fabricObject.data = {
    layerId: layer.id,
    layerType: layer.type,
    layerName: layer.name,
    layerMetadata: deepClone(layer.metadata),
    locked: layer.locked,
    visible: layer.visible
  };
  return fabricObject;
};

const layerFromFabricObject = (object: FabricLayerObject, scale: number): DesignerLayer | null => {
  const data = object.data;
  if (!data) {
    return null;
  }

  const absoluteXY = object.getXY();
  const common = {
    id: data.layerId,
    type: data.layerType,
    name: data.layerName,
    visible: object.visible,
    locked: data.locked,
    x: Number((absoluteXY.x / scale).toFixed(2)),
    y: Number((absoluteXY.y / scale).toFixed(2)),
    width: Number((object.getScaledWidth() / scale).toFixed(2)),
    height: Number((object.getScaledHeight() / scale).toFixed(2)),
    rotation: Number((object.angle ?? 0).toFixed(2)),
    opacity: Number((object.opacity ?? 1).toFixed(2)),
    metadata: deepClone(data.layerMetadata)
  } satisfies DesignerLayer;

  if (data.layerType === "text" && object instanceof Textbox) {
    return {
      ...common,
      metadata: {
        ...common.metadata,
        text: object.text ?? "",
        color: object.fill,
        fontSize: Number(((object.fontSize ?? 18) / (scale * 0.28)).toFixed(2)),
        fontWeight: object.fontWeight,
        textAlign: object.textAlign
      }
    };
  }

  if (data.layerType === "shape" && object instanceof Rect) {
    return {
      ...common,
      metadata: {
        ...common.metadata,
        fill: object.fill
      }
    };
  }

  if (data.layerType === "image" && object instanceof Group) {
    const image = object.getObjects().find((entry) => entry instanceof FabricImage) as FabricImage | undefined;
    const renderedWidth = image?.getScaledWidth() ?? object.getScaledWidth();
    const renderedHeight = image?.getScaledHeight() ?? object.getScaledHeight();
    const centeredLeft = getCenteredOffset(object.getScaledWidth(), renderedWidth);
    const centeredTop = getCenteredOffset(object.getScaledHeight(), renderedHeight);
    return {
      ...common,
      metadata: {
        ...common.metadata,
        cropX: Number((((image?.left ?? centeredLeft) - centeredLeft) / scale).toFixed(2)),
        cropY: Number((((image?.top ?? centeredTop) - centeredTop) / scale).toFixed(2))
      }
    };
  }

  if (data.layerType === "group" && object instanceof Group) {
    const children = object
      .getObjects()
      .map((child) => layerFromFabricObject(child as FabricLayerObject, scale))
      .filter(Boolean) as DesignerLayer[];
    if (children.length === 0) {
      return common;
    }
    const minX = Math.min(...children.map((child) => child.x));
    const minY = Math.min(...children.map((child) => child.y));
    const maxX = Math.max(...children.map((child) => child.x + child.width));
    const maxY = Math.max(...children.map((child) => child.y + child.height));
    return {
      ...common,
      x: Number(minX.toFixed(2)),
      y: Number(minY.toFixed(2)),
      width: Number((maxX - minX).toFixed(2)),
      height: Number((maxY - minY).toFixed(2)),
      metadata: {
        ...common.metadata,
        children
      }
    };
  }

  return common;
};

const surfaceFromCanvas = (canvas: Canvas, surface: DesignerSurface, scale: number) => ({
  ...surface,
  layers: canvas
    .getObjects()
    .map((object) => layerFromFabricObject(object as FabricLayerObject, scale))
    .filter(Boolean) as DesignerLayer[]
});

const collectSelectionIds = (activeObject: FabricObject | undefined) => {
  if (!activeObject) {
    return [] as string[];
  }
  if (activeObject instanceof ActiveSelection) {
    return activeObject
      .getObjects()
      .map((object) => (object as FabricLayerObject).data?.layerId)
      .filter((value): value is string => Boolean(value));
  }
  const layerId = (activeObject as FabricLayerObject).data?.layerId;
  return layerId ? [layerId] : [];
};

export const FabricCanvasStage = forwardRef<FabricCanvasStageHandle, FabricCanvasStageProps>(
  function FabricCanvasStage(
    {
      surface,
      assetUrls,
      selectedLayerIds,
      zoom,
      maxWidth,
      maxHeight,
      cropMode,
      cropLayerId,
      gridEnabled,
      guidesVisible,
      isEditable,
      onSelectionChange,
      onSurfaceChange
    },
    ref
  ) {
    const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
    const canvasRef = useRef<Canvas | null>(null);
    const objectMapRef = useRef<Map<string, FabricLayerObject>>(new Map());
    const syncingRef = useRef(false);
    const cropDragRef = useRef<null | {
      startX: number;
      startY: number;
      imageStartLeft: number;
      imageStartTop: number;
    }>(null);
    const scale = useMemo(
      () => Math.min(maxWidth / surface.artboard.width, maxHeight / surface.artboard.height, 5.5) * zoom,
      [maxHeight, maxWidth, surface.artboard.height, surface.artboard.width, zoom]
    );

    useImperativeHandle(
      ref,
      () => ({
        bringForward: () => {
          const canvas = canvasRef.current;
          const activeObject = canvas?.getActiveObject();
          if (!canvas || !activeObject) {
            return;
          }
          canvas.bringObjectForward(activeObject);
          canvas.requestRenderAll();
          onSurfaceChange(surfaceFromCanvas(canvas, surface, scale), "Bring forward");
        },
        sendBackward: () => {
          const canvas = canvasRef.current;
          const activeObject = canvas?.getActiveObject();
          if (!canvas || !activeObject) {
            return;
          }
          canvas.sendObjectBackwards(activeObject);
          canvas.requestRenderAll();
          onSurfaceChange(surfaceFromCanvas(canvas, surface, scale), "Send backward");
        }
      }),
      [onSurfaceChange, scale, surface]
    );

    useEffect(() => {
      if (!canvasElementRef.current) {
        return;
      }
      const canvas = new Canvas(canvasElementRef.current, {
        width: surface.artboard.width * scale,
        height: surface.artboard.height * scale,
        preserveObjectStacking: true,
        selection: isEditable
      });
      (canvas as Canvas & { selectionKey?: string[] }).selectionKey = ["shiftKey"];
      canvasRef.current = canvas;

      const syncSelection = () => {
        if (syncingRef.current) {
          return;
        }
        onSelectionChange(collectSelectionIds(canvas.getActiveObject() ?? undefined));
      };

      canvas.on("selection:created", syncSelection);
      canvas.on("selection:updated", syncSelection);
      canvas.on("selection:cleared", syncSelection);
      canvas.on("object:modified", (event) => {
        if (syncingRef.current || !event.target) {
          return;
        }
        const targetType = event.transform?.action ?? "modified";
        onSurfaceChange(surfaceFromCanvas(canvas, surface, scale), HISTORY_LABELS[targetType] ?? "Edit selection");
      });
      canvas.on("mouse:down", (event) => {
        if (!cropMode || !cropLayerId) {
          return;
        }
        const target = event.target as FabricLayerObject | undefined;
        if (!target || target.data?.layerId !== cropLayerId || target.data?.layerType !== "image") {
          return;
        }
        const imageGroup = target as Group;
        const image = imageGroup.getObjects().find((entry) => entry instanceof FabricImage) as FabricImage | undefined;
        if (!image) {
          return;
        }
        const pointer = canvas.getScenePoint(event.e);
        cropDragRef.current = {
          startX: pointer.x,
          startY: pointer.y,
          imageStartLeft: image.left ?? 0,
          imageStartTop: image.top ?? 0
        };
      });
      canvas.on("mouse:move", (event) => {
        if (!cropDragRef.current || !cropMode || !cropLayerId) {
          return;
        }
        const imageGroup = objectMapRef.current.get(cropLayerId);
        if (!(imageGroup instanceof Group)) {
          return;
        }
        const image = imageGroup.getObjects().find((entry) => entry instanceof FabricImage) as FabricImage | undefined;
        if (!image) {
          return;
        }
        const pointer = canvas.getScenePoint(event.e);
        const deltaX = pointer.x - cropDragRef.current.startX;
        const deltaY = pointer.y - cropDragRef.current.startY;
        image.set({
          left: clampImageOffset(
            cropDragRef.current.imageStartLeft + deltaX,
            imageGroup.getScaledWidth(),
            image.getScaledWidth()
          ),
          top: clampImageOffset(
            cropDragRef.current.imageStartTop + deltaY,
            imageGroup.getScaledHeight(),
            image.getScaledHeight()
          )
        });
        canvas.requestRenderAll();
      });
      canvas.on("mouse:up", () => {
        if (!cropDragRef.current) {
          return;
        }
        cropDragRef.current = null;
        onSurfaceChange(surfaceFromCanvas(canvas, surface, scale), "Crop image");
      });

      return () => {
        canvas.dispose();
        canvasRef.current = null;
      };
    }, [cropLayerId, cropMode, isEditable, onSelectionChange, onSurfaceChange, scale, surface]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      let cancelled = false;
      const render = async () => {
        syncingRef.current = true;
        try {
          if (canvasElementRef.current) {
            canvasElementRef.current.dataset.renderStatus = "rendering";
            canvasElementRef.current.dataset.objectCount = "0";
            canvasElementRef.current.dataset.renderError = "";
          }
          canvas.clear();
          canvas.setDimensions({
            width: surface.artboard.width * scale,
            height: surface.artboard.height * scale
          });
          canvas.selection = isEditable;
          canvas.backgroundColor = "#ffffff";
          canvas.calcOffset();

          if (gridEnabled) {
            for (let x = GRID_STEP; x < surface.artboard.width * scale; x += GRID_STEP) {
              canvas.add(
                new Rect({
                  left: x,
                  top: 0,
                  width: 1,
                  height: surface.artboard.height * scale,
                  fill: "rgba(23,32,42,0.04)",
                  selectable: false,
                  evented: false
                })
              );
            }
            for (let y = GRID_STEP; y < surface.artboard.height * scale; y += GRID_STEP) {
              canvas.add(
                new Rect({
                  left: 0,
                  top: y,
                  width: surface.artboard.width * scale,
                  height: 1,
                  fill: "rgba(23,32,42,0.04)",
                  selectable: false,
                  evented: false
                })
              );
            }
          }

          if (guidesVisible) {
            canvas.add(
              new Rect({
                left: surface.bleedBox.x * scale,
                top: surface.bleedBox.y * scale,
                width: surface.bleedBox.width * scale,
                height: surface.bleedBox.height * scale,
                fill: "",
                stroke: "#c97f2b",
                strokeDashArray: [8, 8],
                strokeWidth: 1,
                selectable: false,
                evented: false
              }),
              new Rect({
                left: surface.safeBox.x * scale,
                top: surface.safeBox.y * scale,
                width: surface.safeBox.width * scale,
                height: surface.safeBox.height * scale,
                fill: "",
                stroke: "#4a86d3",
                strokeDashArray: [8, 8],
                strokeWidth: 1,
                selectable: false,
                evented: false
              })
            );
          }

          const layerObjects = await Promise.all(surface.layers.map((layer) => createFabricObject(layer, scale, assetUrls)));
          if (cancelled) {
            return;
          }
          const nextMap = new Map<string, FabricLayerObject>();
          for (const object of layerObjects) {
            const layerObject = object as FabricLayerObject;
            const isCropTarget =
              cropMode && cropLayerId === layerObject.data?.layerId && layerObject.data?.layerType === "image";
            layerObject.lockMovementX = !isEditable || Boolean(layerObject.data?.locked) || isCropTarget;
            layerObject.lockMovementY = !isEditable || Boolean(layerObject.data?.locked) || isCropTarget;
            layerObject.lockRotation = !isEditable || Boolean(layerObject.data?.locked) || isCropTarget;
            layerObject.hasControls = isEditable && !Boolean(layerObject.data?.locked) && !isCropTarget;
            if (isCropTarget) {
              layerObject.hoverCursor = "move";
            }
            canvas.add(object);
            if (layerObject.data?.layerId) {
              nextMap.set(layerObject.data.layerId, layerObject);
            }
          }
          objectMapRef.current = nextMap;
          if (canvasElementRef.current) {
            canvasElementRef.current.dataset.objectCount = String(nextMap.size);
          }

          const selectedObjects = canvas
            .getObjects()
            .filter((object) => selectedLayerIds.includes((object as FabricLayerObject).data?.layerId ?? ""));
          if (selectedObjects.length === 1) {
            canvas.setActiveObject(selectedObjects[0]);
          } else if (selectedObjects.length > 1) {
            canvas.setActiveObject(new ActiveSelection(selectedObjects, { canvas }));
          } else {
            canvas.discardActiveObject();
          }
          canvas.renderAll();
          const context = (canvas as Canvas & { contextContainer?: CanvasRenderingContext2D }).contextContainer;
          if (context) {
            context.save();
            context.fillStyle = "rgba(255, 0, 0, 0.35)";
            context.fillRect(12, 12, 28, 28);
            context.restore();
          }
          if (canvasElementRef.current) {
            canvasElementRef.current.dataset.renderStatus = "ready";
          }
        } catch (error) {
          console.error("Flow2Print canvas render failed", error);
          if (canvasElementRef.current) {
            canvasElementRef.current.dataset.renderStatus = "error";
            canvasElementRef.current.dataset.renderError = error instanceof Error ? error.message : String(error);
          }
        } finally {
          syncingRef.current = false;
        }
      };

      void render();

      return () => {
        cancelled = true;
      };
    }, [assetUrls, cropLayerId, cropMode, gridEnabled, guidesVisible, isEditable, scale, selectedLayerIds, surface]);

    return <canvas ref={canvasElementRef} className="fabric-stage" />;
  }
);
