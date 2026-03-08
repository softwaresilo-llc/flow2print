interface DesignerToolRailProps {
  isEditableProject: boolean;
  saving: boolean;
  activeUtilityPanel: "add" | "layers" | "assets" | "history";
  onOpenUtilityPanel: (panel: "add" | "layers" | "assets" | "history") => void;
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
  onOpenUtilityPanel,
  onOpenMenu
}: DesignerToolRailProps) => (
  <aside className="tool-rail" aria-label="Design tools">
    <div className="tool-rail__group">
      <ToolRailButton
        label={saving ? "Busy" : "Add"}
        title="Open add elements"
        active={activeUtilityPanel === "add"}
        disabled={!isEditableProject && activeUtilityPanel !== "add"}
        onClick={() => onOpenUtilityPanel("add")}
      />
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
    </div>
    <div className="tool-rail__group">
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
