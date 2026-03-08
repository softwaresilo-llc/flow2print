import type { ReactNode } from "react";

interface DesignerInspectorPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const DesignerInspectorPanel = ({
  title,
  description,
  children
}: DesignerInspectorPanelProps) => (
  <article className="panel panel--tight">
    <div className="section-heading section-heading--compact">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
    {children}
  </article>
);
