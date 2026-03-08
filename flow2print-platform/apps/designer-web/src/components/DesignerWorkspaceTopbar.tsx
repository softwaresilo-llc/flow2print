import type { ReactNode } from "react";

interface DesignerWorkspaceTopbarProps {
  projectTitle: string;
  badges: ReactNode;
  mode: "edit" | "review" | "finish";
  onModeChange: (mode: "edit" | "review" | "finish") => void;
  actions: ReactNode;
}

export const DesignerWorkspaceTopbar = ({
  projectTitle,
  badges,
  mode,
  onModeChange,
  actions
}: DesignerWorkspaceTopbarProps) => (
  <header className="workspace-topbar workspace-topbar--editor">
    <div className="workspace-title">
      <h1>{projectTitle}</h1>
      <div className="badge-row">{badges}</div>
    </div>
    <div className="workspace-mode-switch" role="tablist" aria-label="Designer workflow">
      <button
        type="button"
        className={`workspace-mode ${mode === "edit" ? "workspace-mode--active" : ""}`}
        onClick={() => onModeChange("edit")}
      >
        Design
      </button>
      <button
        type="button"
        className={`workspace-mode ${mode === "review" ? "workspace-mode--active" : ""}`}
        onClick={() => onModeChange("review")}
      >
        Check
      </button>
      <button
        type="button"
        className={`workspace-mode ${mode === "finish" ? "workspace-mode--active" : ""}`}
        onClick={() => onModeChange("finish")}
      >
        Files
      </button>
    </div>
    <div className="workspace-actions workspace-actions--editor">{actions}</div>
  </header>
);
