import { sampleFixtures } from "@flow2print/testing";
import { ShellCard } from "@flow2print/ui-kit";

export function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
        padding: "2rem",
        fontFamily: "ui-sans-serif, system-ui, sans-serif"
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
        <ShellCard title="Flow2Print Portal" description="Admin, customer, and operations shell for the standalone platform.">
          <p>Tenant: {sampleFixtures.organizationId}</p>
          <p>Demo project: {sampleFixtures.projectId}</p>
        </ShellCard>
        <ShellCard title="Initial route groups" description="The scaffold is ready for project, blueprint, template, output, and integration screens.">
          <ul>
            <li>/projects</li>
            <li>/blueprints</li>
            <li>/templates</li>
            <li>/outputs</li>
            <li>/integrations</li>
          </ul>
        </ShellCard>
      </div>
    </main>
  );
}

