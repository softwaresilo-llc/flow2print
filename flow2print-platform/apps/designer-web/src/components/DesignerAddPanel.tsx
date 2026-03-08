import type { Flow2PrintDocument } from "@flow2print/design-document";

interface AssetOption {
  id: string;
  filename: string;
  mimeType: string;
}

interface TemplateOption {
  id: string;
  displayName: string;
  description: string;
}

interface DesignerAddPanelProps {
  isEditableProject: boolean;
  saving: boolean;
  templates: TemplateOption[];
  assets: AssetOption[];
  onAddText: () => void;
  onAddShape: () => void;
  onAddQr: () => void;
  onAddBarcode: () => void;
  onUploadImage: () => void;
  onUseSampleImage: () => void;
  onUseTemplate: (templateId: string) => void;
  onPlaceAsset: (assetId: string) => void;
}

const AddActionButton = ({
  title,
  description,
  onClick,
  disabled = false
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button type="button" className="add-panel__action" onClick={onClick} disabled={disabled}>
    <strong>{title}</strong>
    <span>{description}</span>
  </button>
);

export const DesignerAddPanel = ({
  isEditableProject,
  saving,
  templates,
  assets,
  onAddText,
  onAddShape,
  onAddQr,
  onAddBarcode,
  onUploadImage,
  onUseSampleImage,
  onUseTemplate,
  onPlaceAsset
}: DesignerAddPanelProps) => (
  <article className="panel panel--tight panel--navigator panel--sidebar">
    <div className="navigator-topbar">
      <div>
        <strong>Add elements</strong>
        <p>Insert the next item without leaving the page.</p>
      </div>
      <span className="badge badge--neutral">Canvas</span>
    </div>

    <div className="add-panel__section">
      <div className="list-section-header">
        <div>
          <strong>Quick start</strong>
          <span>Most-used items for this side.</span>
        </div>
      </div>
      <div className="add-panel__grid">
        <AddActionButton
          title="Text"
          description="Headline, body, contact text"
          onClick={onAddText}
          disabled={!isEditableProject}
        />
        <AddActionButton
          title={saving ? "Uploading..." : "Upload image"}
          description="Place a new image from this device"
          onClick={onUploadImage}
          disabled={!isEditableProject || saving}
        />
        <AddActionButton
          title="Shape"
          description="Rectangle, badge, background"
          onClick={onAddShape}
          disabled={!isEditableProject}
        />
        <AddActionButton
          title="Sample image"
          description="Insert a demo image placeholder"
          onClick={onUseSampleImage}
          disabled={!isEditableProject || saving}
        />
      </div>
    </div>

    <div className="add-panel__section">
      <div className="list-section-header">
        <div>
          <strong>Codes</strong>
          <span>Machine-readable elements.</span>
        </div>
      </div>
      <div className="add-panel__grid">
        <AddActionButton
          title="QR code"
          description="Link to a landing page or profile"
          onClick={onAddQr}
          disabled={!isEditableProject}
        />
        <AddActionButton
          title="Barcode"
          description="EAN or tracking-style code"
          onClick={onAddBarcode}
          disabled={!isEditableProject}
        />
      </div>
    </div>

    <div className="add-panel__section">
      <div className="list-section-header">
        <div>
          <strong>Templates</strong>
          <span>Reuse a layout for this product.</span>
        </div>
      </div>
      <div className="add-panel__list">
        {templates.length === 0 ? <div className="empty-state">No templates available for this product.</div> : null}
        {templates.slice(0, 4).map((template) => (
          <div className="add-panel__list-item" key={template.id}>
            <div>
              <strong>{template.displayName}</strong>
              <span>{template.description}</span>
            </div>
            <button type="button" className="button--ghost" onClick={() => onUseTemplate(template.id)} disabled={!isEditableProject}>
              Use
            </button>
          </div>
        ))}
      </div>
    </div>

    <div className="add-panel__section">
      <div className="list-section-header">
        <div>
          <strong>Recent images</strong>
          <span>Reuse uploaded files.</span>
        </div>
      </div>
      <div className="add-panel__list">
        {assets.length === 0 ? <div className="empty-state">No image assets available yet.</div> : null}
        {assets.slice(0, 5).map((asset) => (
          <div className="add-panel__list-item" key={asset.id}>
            <div>
              <strong>{asset.filename}</strong>
              <span>{asset.mimeType}</span>
            </div>
            <button type="button" className="button--ghost" onClick={() => onPlaceAsset(asset.id)} disabled={!isEditableProject}>
              Place
            </button>
          </div>
        ))}
      </div>
    </div>
  </article>
);
