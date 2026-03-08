import type { Flow2PrintDocument } from "@flow2print/design-document";

type DesignerLayer = Flow2PrintDocument["surfaces"][number]["layers"][number];

interface DesignerEditPanelProps {
  selectedLayer: DesignerLayer | null;
  isEditableProject: boolean;
  layerAssetFilename: string | null;
  saving: boolean;
  onUpdateSelectedLayer: (updater: (layer: DesignerLayer) => DesignerLayer) => void;
  onUpdateLayerNumericField: (
    field: "x" | "y" | "width" | "height" | "rotation" | "opacity",
    value: string
  ) => void;
  onUpdateSelectedImageCrop: (field: "cropX" | "cropY", value: number) => void;
  onOpenReplaceImage: () => void;
  onOpenLayerActions: (element: HTMLElement) => void;
}

export const DesignerEditPanel = ({
  selectedLayer,
  isEditableProject,
  layerAssetFilename,
  saving,
  onUpdateSelectedLayer,
  onUpdateLayerNumericField,
  onUpdateSelectedImageCrop,
  onOpenReplaceImage,
  onOpenLayerActions
}: DesignerEditPanelProps) => {
  if (!selectedLayer) {
    return (
      <div className="inspector-empty">
        <h4>Select an item</h4>
        <p>Click text, an image, or a shape on the page to edit it here.</p>
      </div>
    );
  }

  if (!isEditableProject) {
    return (
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
            <p>This version is locked because files already exist.</p>
          </div>
        </div>
        <div className="inspector-section">
          <div className="inspector-section__header">
            <h4>Content</h4>
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
                <span>{layerAssetFilename ?? "none"}</span>
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
            <h4>Position</h4>
          </div>
          <div className="kv-list">
            <div className="kv-item">
              <strong>X</strong>
              <span>{selectedLayer.x}</span>
            </div>
            <div className="kv-item">
              <strong>Y</strong>
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
              <strong>Rotate</strong>
              <span>{selectedLayer.rotation}</span>
            </div>
            <div className="kv-item">
              <strong>Opacity</strong>
              <span>{Math.round(selectedLayer.opacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-form">
      <div className="inspector-summary inspector-summary--row">
        <div className="inspector-summary__identity">
          <span className="material-symbols-outlined" aria-hidden="true">
            {selectedLayer.type === "text"
              ? "text_fields"
              : selectedLayer.type === "image"
                ? "image"
                : selectedLayer.type === "shape"
                  ? "pentagon"
                  : selectedLayer.type === "qr"
                    ? "qr_code_2"
                    : selectedLayer.type === "barcode"
                      ? "barcode"
                      : "widgets"}
          </span>
          <div>
            <p className="workspace-label">Selected item</p>
            <h4>{selectedLayer.name}</h4>
          </div>
        </div>
        <div className="badge-row">
          <span className="badge badge--neutral">{selectedLayer.type}</span>
          {!selectedLayer.visible ? <span className="badge badge--warning">hidden</span> : null}
          {selectedLayer.locked ? <span className="badge badge--neutral">locked</span> : null}
          <button
            type="button"
            className="button--ghost inspector-summary__menu"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenLayerActions(event.currentTarget);
            }}
          >
            Actions
          </button>
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
          <h4>Field name</h4>
        </div>
        <label>
          <span>Layer label</span>
          <input
            value={selectedLayer.name}
            onChange={(event) =>
              onUpdateSelectedLayer((layer) => ({
                ...layer,
                name: event.target.value
              }))
            }
            disabled={selectedLayer.locked}
          />
        </label>
        {selectedLayer.type === "text" ? (
          <>
            <label>
              <span>Content</span>
              <textarea
                value={String(selectedLayer.metadata.text ?? "")}
                onChange={(event) =>
                  onUpdateSelectedLayer((layer) => ({
                    ...layer,
                    metadata: {
                      ...layer.metadata,
                      text: event.target.value
                    }
                  }))
                }
                disabled={selectedLayer.locked}
              />
            </label>
            <div className="inspector-grid">
              <label>
                <span>Font size</span>
                <input
                  type="number"
                  value={Number(selectedLayer.metadata.fontSize ?? 18)}
                  onChange={(event) =>
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        fontSize: Math.min(Math.max(Number(event.target.value) || 18, 10), 96)
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
                />
              </label>
              <label>
                <span>Weight</span>
                <select
                  value={String(selectedLayer.metadata.fontWeight ?? "600")}
                  onChange={(event) =>
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        fontWeight: event.target.value
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
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
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        color: event.target.value
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
                />
              </label>
              <label>
                <span>Alignment</span>
                <select
                  value={String(selectedLayer.metadata.textAlign ?? "left")}
                  onChange={(event) =>
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        textAlign: event.target.value
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
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
                onUpdateSelectedLayer((layer) => ({
                  ...layer,
                  metadata: {
                    ...layer.metadata,
                    fill: event.target.value
                  }
                }))
              }
              disabled={selectedLayer.locked}
            />
          </label>
        ) : null}
        {selectedLayer.type === "qr" || selectedLayer.type === "barcode" ? (
          <label>
            <span>{selectedLayer.type === "qr" ? "Link or value" : "Code value"}</span>
            <input
              value={String(selectedLayer.metadata.value ?? "")}
              onChange={(event) =>
                onUpdateSelectedLayer((layer) => ({
                  ...layer,
                  metadata: {
                    ...layer.metadata,
                    value: event.target.value
                  }
                }))
              }
              disabled={selectedLayer.locked}
            />
          </label>
        ) : null}
        {selectedLayer.type === "image" ? (
          <>
            <div className="kv-list">
              <div className="kv-item">
                <strong>Source file</strong>
                <span>{layerAssetFilename ?? "none"}</span>
              </div>
            </div>
            <div className="inspector-grid">
              <label>
                <span>Fit</span>
                <select
                  value={String(selectedLayer.metadata.fitMode ?? "cover")}
                  onChange={(event) =>
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        fitMode: event.target.value
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
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
                    onUpdateSelectedLayer((layer) => ({
                      ...layer,
                      metadata: {
                        ...layer.metadata,
                        maskShape: event.target.value
                      }
                    }))
                  }
                  disabled={selectedLayer.locked}
                >
                  <option value="rect">Rectangle</option>
                  <option value="rounded">Rounded</option>
                  <option value="circle">Circle</option>
                </select>
              </label>
            </div>
            <div className="read-only-note">
              Use <strong>Crop image</strong> above the canvas to move the picture inside its frame.
            </div>
            <div className="stack-actions">
              <button
                type="button"
                className="button--ghost"
                onClick={onOpenReplaceImage}
                disabled={selectedLayer.locked || saving}
              >
                Replace image
              </button>
              <button
                type="button"
                className="button--ghost"
                onClick={() =>
                  onUpdateSelectedLayer((layer) => ({
                    ...layer,
                    metadata: {
                      ...layer.metadata,
                      cropX: 0,
                      cropY: 0
                    }
                  }))
                }
                disabled={selectedLayer.locked}
              >
                Reset crop
              </button>
            </div>
          </>
        ) : null}
      </div>
      <div className="inspector-section">
        <div className="inspector-section__header">
          <h4>Position &amp; size</h4>
        </div>
        <div className="inspector-grid">
          <label>
            <span>X</span>
            <input type="number" value={selectedLayer.x} onChange={(event) => onUpdateLayerNumericField("x", event.target.value)} disabled={selectedLayer.locked} />
          </label>
          <label>
            <span>Y</span>
            <input type="number" value={selectedLayer.y} onChange={(event) => onUpdateLayerNumericField("y", event.target.value)} disabled={selectedLayer.locked} />
          </label>
          <label>
            <span>Width</span>
            <input type="number" value={selectedLayer.width} onChange={(event) => onUpdateLayerNumericField("width", event.target.value)} disabled={selectedLayer.locked} />
          </label>
          <label>
            <span>Height</span>
            <input type="number" value={selectedLayer.height} onChange={(event) => onUpdateLayerNumericField("height", event.target.value)} disabled={selectedLayer.locked} />
          </label>
          <label>
            <span>Rotate</span>
            <input type="number" value={selectedLayer.rotation} onChange={(event) => onUpdateLayerNumericField("rotation", event.target.value)} disabled={selectedLayer.locked} />
          </label>
          <label>
            <span>Opacity %</span>
            <input
              type="number"
              value={Math.round(selectedLayer.opacity * 100)}
              onChange={(event) => onUpdateLayerNumericField("opacity", String(Number(event.target.value) / 100))}
              disabled={selectedLayer.locked}
            />
          </label>
        </div>
        <div className="badge-row">
          <span className="badge badge--neutral">{selectedLayer.visible ? "Visible" : "Hidden"}</span>
          <span className="badge badge--neutral">{selectedLayer.locked ? "Locked" : "Editable"}</span>
        </div>
      </div>
    </div>
  );
};
