import type { ReactNode } from "react";

interface DesignerNavigatorPanelProps {
  summary: string;
  leftPanel: "layers" | "assets" | "session";
  onPanelChange: (panel: "layers" | "assets" | "session") => void;
  layersContent: ReactNode;
  assetsContent: ReactNode;
  sessionContent: ReactNode;
}

export const DesignerNavigatorPanel = ({
  summary,
  leftPanel,
  onPanelChange,
  layersContent,
  assetsContent,
  sessionContent
}: DesignerNavigatorPanelProps) => (
  <article className="panel panel--tight panel--navigator">
    <div className="navigator-topbar">
      <strong>Workspace</strong>
      <span className="badge badge--neutral">{summary}</span>
    </div>
    <div className="panel-tabs panel-tabs--navigator">
      <button
        type="button"
        className={`panel-tab ${leftPanel === "layers" ? "panel-tab--active" : ""}`}
        onClick={() => onPanelChange("layers")}
      >
        Layers
      </button>
      <button
        type="button"
        className={`panel-tab ${leftPanel === "assets" ? "panel-tab--active" : ""}`}
        onClick={() => onPanelChange("assets")}
      >
        Assets
      </button>
      <button
        type="button"
        className={`panel-tab ${leftPanel === "session" ? "panel-tab--active" : ""}`}
        onClick={() => onPanelChange("session")}
      >
        History
      </button>
    </div>
    {leftPanel === "layers" ? layersContent : null}
    {leftPanel === "assets" ? assetsContent : null}
    {leftPanel === "session" ? sessionContent : null}
  </article>
);
