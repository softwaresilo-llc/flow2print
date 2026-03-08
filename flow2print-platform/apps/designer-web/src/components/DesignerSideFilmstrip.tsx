import type { Flow2PrintDocument } from "@flow2print/design-document";

type DesignerSurface = Flow2PrintDocument["surfaces"][number];

interface DesignerSideFilmstripProps {
  surfaces: DesignerSurface[];
  selectedSurfaceIndex: number;
  isEditableProject: boolean;
  onSelectSurface: (index: number) => void;
  onAddSurface: () => void;
  onDuplicateSurface: () => void;
  onRemoveSurface: () => void;
}

export const DesignerSideFilmstrip = ({
  surfaces,
  selectedSurfaceIndex,
  isEditableProject,
  onSelectSurface,
  onAddSurface,
  onDuplicateSurface,
  onRemoveSurface
}: DesignerSideFilmstripProps) => (
  <section className="filmstrip" aria-label="Project sides">
    <div className="filmstrip__list">
      {surfaces.map((surface, index) => (
        <button
          key={surface.surfaceId}
          type="button"
          className={`filmstrip__card ${index === selectedSurfaceIndex ? "filmstrip__card--active" : ""}`}
          onClick={() => onSelectSurface(index)}
        >
          <span className="filmstrip__index">{index + 1}</span>
          <strong>{surface.label}</strong>
          <span>{surface.layers.length} items</span>
        </button>
      ))}
    </div>
    {isEditableProject ? (
      <div className="filmstrip__actions">
        <button type="button" className="button--ghost" onClick={onAddSurface}>
          Add side
        </button>
        <button type="button" className="button--ghost" onClick={onDuplicateSurface} disabled={surfaces.length === 0}>
          Duplicate
        </button>
        <button type="button" className="button--ghost" onClick={onRemoveSurface} disabled={surfaces.length <= 1}>
          Remove
        </button>
      </div>
    ) : null}
  </section>
);
