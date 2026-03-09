interface DesignerMoreElement {
  id: string;
  label: string;
  description: string;
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
  category?: string;
}

interface DesignerMoreElementsPanelProps {
  elements: DesignerMoreElement[];
}

const sectionTitles: Record<string, string> = {
  smart: "Smart",
  layout: "Layout"
};

export const DesignerMoreElementsPanel = ({ elements }: DesignerMoreElementsPanelProps) => {
  const groupedElements = elements.reduce<Record<string, DesignerMoreElement[]>>((groups, element) => {
    const key = element.category ?? "layout";
    groups[key] ??= [];
    groups[key].push(element);
    return groups;
  }, {});

  return (
    <div className="more-elements-panel">
      {Object.entries(groupedElements).map(([key, sectionElements]) => (
        <section key={key} className="more-elements-panel__section">
          <div className="more-elements-panel__section-header">
            <strong>{sectionTitles[key] ?? key}</strong>
          </div>
          <div className="more-elements-panel__grid">
            {sectionElements.map((element) => (
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
        </section>
      ))}
    </div>
  );
};
