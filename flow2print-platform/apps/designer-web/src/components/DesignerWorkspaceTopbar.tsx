import type { ReactNode } from "react";

interface DesignerWorkspaceTopbarProps {
  projectTitle: ReactNode;
  statusLine: ReactNode;
  mode: "edit" | "review" | "finish";
  onModeChange: (mode: "edit" | "review" | "finish") => void;
  tools: ReactNode;
  actions: ReactNode;
  editLabel?: string;
}

export const DesignerWorkspaceTopbar = ({
  projectTitle,
  statusLine,
  mode,
  onModeChange,
  tools,
  actions,
  editLabel = "Design"
}: DesignerWorkspaceTopbarProps) => (
  <header className="workspace-topbar workspace-topbar--editor">
    <div className="workspace-topbar__start">
      <div className="workspace-title">
        <h1>{projectTitle}</h1>
      </div>
    </div>
    <div className="workspace-topbar__center">
      <div className="workspace-mode-switch" role="tablist" aria-label="Designer workflow">
        <button
          type="button"
          className={`workspace-mode ${mode === "edit" ? "workspace-mode--active" : ""}`}
          onClick={() => onModeChange("edit")}
        >
          {editLabel}
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
    </div>
    <div className="workspace-topbar__end">
      <div className="workspace-statusline">{statusLine}</div>
      <div className="workspace-tools">{tools}</div>
      <div className="workspace-actions workspace-actions--editor">{actions}</div>
    </div>
  </header>
);
