interface DesignerToolRailProps {
  isEditableProject: boolean;
  saving: boolean;
  activeUtilityPanel: "layers" | "assets" | "history";
  onAddText: () => void;
  onAddImage: () => void;
  onAddShape: () => void;
  onOpenUtilityPanel: (panel: "layers" | "assets" | "history") => void;
  onOpenMenu: () => void;
}

const ToolRailButton = ({
  label,
  title,
  active = false,
  disabled = false,
  onClick
}: {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`tool-rail__button ${active ? "tool-rail__button--active" : ""}`}
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="tool-rail__label">{label}</span>
  </button>
);

export const DesignerToolRail = ({
  isEditableProject,
  saving,
  activeUtilityPanel,
  onAddText,
  onAddImage,
  onAddShape,
  onOpenUtilityPanel,
  onOpenMenu
}: DesignerToolRailProps) => (
  <aside className="tool-rail" aria-label="Design tools">
    <div className="tool-rail__group">
      <ToolRailButton label="Text" title="Add text" disabled={!isEditableProject} onClick={onAddText} />
      <ToolRailButton
        label={saving ? "..." : "Image"}
        title="Add image"
        disabled={!isEditableProject || saving}
        onClick={onAddImage}
      />
      <ToolRailButton label="Shape" title="Add shape" disabled={!isEditableProject} onClick={onAddShape} />
    </div>
    <div className="tool-rail__separator" />
    <div className="tool-rail__group">
      <ToolRailButton
        label="Layers"
        title="Open layers"
        active={activeUtilityPanel === "layers"}
        onClick={() => onOpenUtilityPanel("layers")}
      />
      <ToolRailButton
        label="Assets"
        title="Open assets"
        active={activeUtilityPanel === "assets"}
        onClick={() => onOpenUtilityPanel("assets")}
      />
      <ToolRailButton
        label="History"
        title="Open history"
        active={activeUtilityPanel === "history"}
        onClick={() => onOpenUtilityPanel("history")}
      />
    </div>
    <div className="tool-rail__spacer" />
    <ToolRailButton label="More" title="More actions" onClick={onOpenMenu} />
  </aside>
);
