import type { ReactNode } from "react";

interface DesignerPreviewPanelProps {
  selectedLayerName: string | null;
  selectedLayerType: string | null;
  surfaceLabel: string;
  surfaceCount: number;
  itemCount: number;
  artifactCount: number;
  templateName: string | null;
  statusBadge: ReactNode;
}

export const DesignerPreviewPanel = ({
  selectedLayerName,
  selectedLayerType,
  surfaceLabel,
  surfaceCount,
  itemCount,
  artifactCount,
  templateName,
  statusBadge
}: DesignerPreviewPanelProps) => (
  <div className="preview-panel">
    <div className="preview-panel__hero">
      <strong>Preview mode</strong>
      <p>This version is locked. Review the layout and open the generated files when you are ready.</p>
    </div>

    <div className="preview-panel__section">
      <div className="section-heading section-heading--compact">
        <div>
          <h4>Current side</h4>
          <p>What is currently visible on the canvas.</p>
        </div>
      </div>
      <div className="kv-list">
        <div className="kv-item">
          <strong>Side</strong>
          <span>{surfaceLabel}</span>
        </div>
        <div className="kv-item">
          <strong>Items on side</strong>
          <span>{itemCount}</span>
        </div>
        <div className="kv-item">
          <strong>Selected item</strong>
          <span>{selectedLayerName ? `${selectedLayerName}${selectedLayerType ? ` (${selectedLayerType})` : ""}` : "Nothing selected"}</span>
        </div>
      </div>
    </div>

    <div className="preview-panel__section">
      <div className="section-heading section-heading--compact">
        <div>
          <h4>Project</h4>
          <p>Quick context for this finalized design.</p>
        </div>
      </div>
      <div className="kv-list">
        <div className="kv-item">
          <strong>Status</strong>
          <span>{statusBadge}</span>
        </div>
        <div className="kv-item">
          <strong>Sides</strong>
          <span>{surfaceCount}</span>
        </div>
        <div className="kv-item">
          <strong>Generated files</strong>
          <span>{artifactCount}</span>
        </div>
        <div className="kv-item">
          <strong>Template</strong>
          <span>{templateName ?? "Custom layout"}</span>
        </div>
      </div>
    </div>
  </div>
);
