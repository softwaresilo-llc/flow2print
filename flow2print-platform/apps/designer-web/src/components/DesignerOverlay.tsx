import type { ReactNode } from "react";

interface DesignerOverlayProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

export const DesignerOverlay = ({ title, description, onClose, children }: DesignerOverlayProps) => (
  <div className="workspace-overlay" role="dialog" aria-modal="true">
    <div className="workspace-overlay__backdrop" onClick={onClose} />
    <div className="workspace-overlay__panel">
      <div className="section-heading">
        <div>
          {title ? <h3>{title}</h3> : null}
          {description ? <p>{description}</p> : null}
        </div>
        <button type="button" className="button--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);
