interface DesignerMoreElement {
  id: string;
  label: string;
  description: string;
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
}

interface DesignerMoreElementsPanelProps {
  elements: DesignerMoreElement[];
}

export const DesignerMoreElementsPanel = ({ elements }: DesignerMoreElementsPanelProps) => (
  <div className="more-elements-panel">
    <div className="more-elements-panel__grid">
      {elements.map((element) => (
        <button
          key={element.id}
          type="button"
          className="more-elements-card"
          onClick={element.onSelect}
          disabled={element.disabled}
        >
          <span className="more-elements-card__icon material-symbols-outlined" aria-hidden="true">
            {element.icon}
          </span>
          <span className="more-elements-card__copy">
            <strong>{element.label}</strong>
            <span>{element.description}</span>
          </span>
        </button>
      ))}
    </div>
  </div>
);
