import { sampleDocument } from "@flow2print/design-document";
import { ShellCard } from "@flow2print/ui-kit";

export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
        padding: "2rem",
        fontFamily: "ui-sans-serif, system-ui, sans-serif"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 24 }}>
        <ShellCard title="Flow2Print Designer" description="Standalone designer shell scaffolded from the platform plan.">
          <p>Project: {sampleDocument.projectId}</p>
          <p>Blueprint: {sampleDocument.blueprintVersionId}</p>
          <p>Surface count: {sampleDocument.surfaces.length}</p>
        </ShellCard>
        <ShellCard title="Design document preview" description="The shared Flow2Print document schema is already wired into the UI shell.">
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: 12,
              padding: 16,
              overflowX: "auto"
            }}
          >
            {JSON.stringify(sampleDocument, null, 2)}
          </pre>
        </ShellCard>
      </div>
    </main>
  );
}

