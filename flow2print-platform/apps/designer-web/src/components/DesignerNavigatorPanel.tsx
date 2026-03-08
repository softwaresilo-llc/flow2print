import type { ReactNode } from "react";

interface DesignerNavigatorPanelProps {
  summary: string;
  leftPanel: "layers" | "assets" | "history";
  onPanelChange: (panel: "layers" | "assets" | "history") => void;
  layersContent: ReactNode;
  assetsContent: ReactNode;
  historyContent: ReactNode;
}

export const DesignerNavigatorPanel = ({
  summary,
  leftPanel,
  onPanelChange,
  layersContent,
  assetsContent,
  historyContent
}: DesignerNavigatorPanelProps) => (
  <article className="panel panel--tight panel--navigator panel--utility">
    <div className="navigator-topbar">
      <strong>Library</strong>
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
        className={`panel-tab ${leftPanel === "history" ? "panel-tab--active" : ""}`}
        onClick={() => onPanelChange("history")}
      >
        History
      </button>
    </div>
    {leftPanel === "layers" ? layersContent : null}
    {leftPanel === "assets" ? assetsContent : null}
    {leftPanel === "history" ? historyContent : null}
  </article>
);
