interface DesignerToolRailProps {
  isEditableProject: boolean;
  saving: boolean;
  activeUtilityPanel: "layers" | "assets" | "history";
  onOpenUtilityPanel: (panel: "layers" | "assets" | "history") => void;
  onAddText: () => void;
  onAddImage: () => void;
  onAddShape: () => void;
  onAddDivider: () => void;
  onOpenMenu: () => void;
}

const ToolRailButton = ({
  icon,
  label,
  title,
  active = false,
  disabled = false,
  onClick
}: {
  icon: string;
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
    <span className="tool-rail__icon material-symbols-outlined" aria-hidden="true">
      {icon}
    </span>
    <span className="tool-rail__label">{label}</span>
  </button>
);

export const DesignerToolRail = ({
  isEditableProject,
  saving,
  activeUtilityPanel,
  onOpenUtilityPanel,
  onAddText,
  onAddImage,
  onAddShape,
  onAddDivider,
  onOpenMenu
}: DesignerToolRailProps) => (
  <aside className="tool-rail" aria-label="Design tools">
    <div className="tool-rail__group">
      <ToolRailButton
        icon="title"
        label="Text"
        title="Add text"
        disabled={!isEditableProject}
        onClick={onAddText}
      />
      <ToolRailButton
        icon="image"
        label="Image"
        title={saving ? "Uploading image" : "Upload image"}
        disabled={!isEditableProject || saving}
        onClick={onAddImage}
      />
      <ToolRailButton
        icon="pentagon"
        label="Shape"
        title="Add shape"
        disabled={!isEditableProject}
        onClick={onAddShape}
      />
      <ToolRailButton
        icon="horizontal_rule"
        label="Line"
        title="Add line / divider"
        disabled={!isEditableProject}
        onClick={onAddDivider}
      />
    </div>
    <div className="tool-rail__separator" />
    <div className="tool-rail__group">
      <ToolRailButton
        icon="layers"
        label="Layers"
        title="Open layers"
        active={activeUtilityPanel === "layers"}
        onClick={() => onOpenUtilityPanel("layers")}
      />
      <ToolRailButton
        icon="folder_open"
        label="Assets"
        title="Open assets"
        active={activeUtilityPanel === "assets"}
        onClick={() => onOpenUtilityPanel("assets")}
      />
    </div>
    <div className="tool-rail__group">
      <ToolRailButton
        icon="history"
        label="History"
        title="Open history"
        active={activeUtilityPanel === "history"}
        onClick={() => onOpenUtilityPanel("history")}
      />
    </div>
    <div className="tool-rail__spacer" />
    <ToolRailButton icon="apps" label="More" title="More actions" onClick={onOpenMenu} />
  </aside>
);
