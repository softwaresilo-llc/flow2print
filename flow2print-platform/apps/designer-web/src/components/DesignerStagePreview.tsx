import type { ChangeEvent, CSSProperties, KeyboardEvent, MouseEvent } from "react";

import type { Flow2PrintDocument } from "@flow2print/design-document";

type DesignerLayer = Flow2PrintDocument["surfaces"][number]["layers"][number];
type DesignerSurface = Flow2PrintDocument["surfaces"][number];

interface DesignerStagePreviewProps {
  surface: DesignerSurface;
  scale: number;
  selectedLayerIds: string[];
  assetUrls: Record<string, string>;
  onSelectLayerIds: (ids: string[]) => void;
  onOpenLayerContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    layer: DesignerLayer
  ) => void;
  editingTextLayerId: string | null;
  editingTextValue: string;
  onBeginTextEdit: (layer: DesignerLayer) => void;
  onEditTextValueChange: (value: string) => void;
  onCommitTextEdit: () => void;
  onCancelTextEdit: () => void;
}

const toPx = (value: number, scale: number) => value * scale;

const getLayerStyle = (layer: DesignerLayer, scale: number): CSSProperties => ({
  left: toPx(layer.x, scale),
  top: toPx(layer.y, scale),
  width: toPx(layer.width, scale),
  height: toPx(layer.height, scale),
  opacity: layer.opacity,
  transform: `rotate(${layer.rotation}deg)`,
  pointerEvents: layer.visible ? "auto" : "none"
});

const getImageObjectPosition = (layer: DesignerLayer) => {
  const cropX = Number(layer.metadata.cropX ?? 0);
  const cropY = Number(layer.metadata.cropY ?? 0);
  const fitMode = String(layer.metadata.fitMode ?? "cover");
  const x = 50 - cropX * 1.6;
  const y = 50 - cropY * 1.6;
  return {
    objectFit: fitMode === "contain" ? "contain" : fitMode === "stretch" ? "fill" : "cover",
    objectPosition: `${x}% ${y}%`
  } as const;
};

const renderShapeContent = (layer: DesignerLayer) => {
  const variant = String(layer.metadata.variant ?? "");
  if (variant === "divider") {
    return (
      <div className="stage-preview__divider">
        <span
          className="stage-preview__divider-line"
          style={{
            background: String(layer.metadata.fill ?? "#9fb0c8"),
            height: `min(100%, ${Math.max(2, layer.height)}px)`
          }}
        />
      </div>
    );
  }
  if (variant === "logo-placeholder") {
    return (
      <div className="stage-preview__logo-placeholder">
        <span className="material-symbols-outlined" aria-hidden="true">
          deployed_code
        </span>
      </div>
    );
  }
  if (variant === "accent-panel") {
    return <div className="stage-preview__accent-panel" />;
  }
  return (
    <div
      className="stage-preview__shape-fill"
      style={{ background: String(layer.metadata.fill ?? "#dbe8ff") }}
    />
  );
};

const renderTextContent = (layer: DesignerLayer, scale: number) => {
  const text = String(layer.metadata.text ?? layer.name);
  const variant = String(layer.metadata.variant ?? "");
  if (variant === "contact-info") {
    const [email, phone] = text.split("\n");
    return (
      <div className="stage-preview__contact">
        <div>
          <span className="material-symbols-outlined" aria-hidden="true">
            mail
          </span>
          <span>{email}</span>
        </div>
        <div>
          <span className="material-symbols-outlined" aria-hidden="true">
            call
          </span>
          <span>{phone}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className="stage-preview__text"
      style={{
        color: String(layer.metadata.color ?? "#1b2430"),
        fontSize: Math.max(11, Number(layer.metadata.fontSize ?? 16) * scale * 0.22),
        fontWeight: String(layer.metadata.fontWeight ?? "600"),
        textAlign: String(layer.metadata.textAlign ?? "left") as CSSProperties["textAlign"],
        letterSpacing: Number(layer.metadata.letterSpacing ?? 0),
        textTransform: String(layer.metadata.textTransform ?? "uppercase") as CSSProperties["textTransform"]
      }}
    >
      {text.split("\n").map((line, index) => (
        <span key={`${layer.id}-${index}`}>{line}</span>
      ))}
    </div>
  );
};

const renderQrOrBarcodeContent = (layer: DesignerLayer) => {
  if (layer.type === "barcode") {
    return (
      <div className="stage-preview__barcode">
        <span>{String(layer.metadata.value ?? layer.name)}</span>
      </div>
    );
  }
  return (
    <div className="stage-preview__qr">
      <span>{String(layer.metadata.value ?? layer.name)}</span>
    </div>
  );
};

const renderLayerContent = (
  layer: DesignerLayer,
  scale: number,
  assetUrls: Record<string, string>,
  onSelectLayerIds: (ids: string[]) => void,
  onOpenLayerContextMenu: (event: MouseEvent<HTMLDivElement>, layer: DesignerLayer) => void,
  selectedLayerIds: string[],
  editingTextLayerId: string | null,
  editingTextValue: string,
  onBeginTextEdit: (layer: DesignerLayer) => void,
  onEditTextValueChange: (value: string) => void,
  onCommitTextEdit: () => void,
  onCancelTextEdit: () => void
) => {
  const sharedClassName = [
    "stage-preview__layer",
    `stage-preview__layer--${layer.type}`,
    selectedLayerIds.includes(layer.id) ? "stage-preview__layer--selected" : "",
    layer.locked ? "stage-preview__layer--locked" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const handleSelect = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.shiftKey) {
      const next = selectedLayerIds.includes(layer.id)
        ? selectedLayerIds.filter((entry) => entry !== layer.id)
        : [...selectedLayerIds, layer.id];
      onSelectLayerIds(next);
      return;
    }
    onSelectLayerIds([layer.id]);
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    onOpenLayerContextMenu(event, layer);
  };

  const handleBeginInlineTextEdit = (event: MouseEvent<HTMLDivElement>) => {
    if (layer.type !== "text") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onBeginTextEdit(layer);
  };

  const handleTextEditKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onCommitTextEdit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelTextEdit();
    }
  };

  const style = getLayerStyle(layer, scale);

  if (layer.type === "image") {
    const assetId = String(layer.metadata.assetId ?? "");
    const imageUrl = assetUrls[assetId];
    const imageStyle = getImageObjectPosition(layer);
    return (
      <div
        key={layer.id}
        className={sharedClassName}
        style={style}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
      >
        <div className="stage-preview__layer-inner">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={layer.name}
              className="stage-preview__image"
              style={imageStyle}
              draggable={false}
            />
          ) : (
            <div className="stage-preview__image-missing">
              <span className="material-symbols-outlined" aria-hidden="true">
                image
              </span>
              <span>{layer.name}</span>
            </div>
          )}
        </div>
        {selectedLayerIds.includes(layer.id) ? (
          <>
            <span className="stage-preview__handle stage-preview__handle--tl" />
            <span className="stage-preview__handle stage-preview__handle--tr" />
            <span className="stage-preview__handle stage-preview__handle--bl" />
            <span className="stage-preview__handle stage-preview__handle--br" />
            <span className="stage-preview__handle stage-preview__handle--mr" />
          </>
        ) : null}
      </div>
    );
  }

  if (layer.type === "group") {
    const children = Array.isArray(layer.metadata.children) ? (layer.metadata.children as DesignerLayer[]) : [];
    return (
      <div
        key={layer.id}
        className={sharedClassName}
        style={style}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
      >
        <div className="stage-preview__layer-inner">
          {children.map((child) =>
            renderLayerContent(
              { ...child, x: child.x - layer.x, y: child.y - layer.y },
              scale,
              assetUrls,
              onSelectLayerIds,
              onOpenLayerContextMenu,
              selectedLayerIds,
              editingTextLayerId,
              editingTextValue,
              onBeginTextEdit,
              onEditTextValueChange,
              onCommitTextEdit,
              onCancelTextEdit
            )
          )}
        </div>
        {selectedLayerIds.includes(layer.id) ? (
          <>
            <span className="stage-preview__handle stage-preview__handle--tl" />
            <span className="stage-preview__handle stage-preview__handle--tr" />
            <span className="stage-preview__handle stage-preview__handle--bl" />
            <span className="stage-preview__handle stage-preview__handle--br" />
            <span className="stage-preview__handle stage-preview__handle--mr" />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      key={layer.id}
      className={sharedClassName}
      style={style}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onDoubleClick={layer.type === "text" ? handleBeginInlineTextEdit : undefined}
    >
      <div className="stage-preview__layer-inner">
        {layer.type === "text" ? (
          editingTextLayerId === layer.id ? (
            <textarea
              className="stage-preview__text-editor"
              value={editingTextValue}
              autoFocus
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onEditTextValueChange(event.target.value)}
              onBlur={onCommitTextEdit}
              onKeyDown={handleTextEditKeyDown}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div onDoubleClick={handleBeginInlineTextEdit}>{renderTextContent(layer, scale)}</div>
          )
        ) : null}
        {layer.type === "shape" ? renderShapeContent(layer) : null}
        {layer.type === "qr" || layer.type === "barcode" ? renderQrOrBarcodeContent(layer) : null}
      </div>
      {selectedLayerIds.includes(layer.id) ? (
        <>
          <span className="stage-preview__handle stage-preview__handle--tl" />
          <span className="stage-preview__handle stage-preview__handle--tr" />
          <span className="stage-preview__handle stage-preview__handle--bl" />
          <span className="stage-preview__handle stage-preview__handle--br" />
          <span className="stage-preview__handle stage-preview__handle--mr" />
        </>
      ) : null}
    </div>
  );
};

export const DesignerStagePreview = ({
  surface,
  scale,
  selectedLayerIds,
  assetUrls,
  onSelectLayerIds,
  onOpenLayerContextMenu,
  editingTextLayerId,
  editingTextValue,
  onBeginTextEdit,
  onEditTextValueChange,
  onCommitTextEdit,
  onCancelTextEdit
}: DesignerStagePreviewProps) => (
  <div className="stage-preview" aria-hidden="false">
    {surface.layers
      .filter((layer) => layer.visible)
      .map((layer) =>
        renderLayerContent(
          layer,
          scale,
          assetUrls,
          onSelectLayerIds,
          onOpenLayerContextMenu,
          selectedLayerIds,
          editingTextLayerId,
          editingTextValue,
          onBeginTextEdit,
          onEditTextValueChange,
          onCommitTextEdit,
          onCancelTextEdit
        )
      )}
  </div>
);
