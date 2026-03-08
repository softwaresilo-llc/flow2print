import { AppShell } from "@flow2print/ui-kit";

interface StarterProduct {
  label: string;
  productRef: string;
  note: string;
}

interface TemplateOption {
  id: string;
  displayName: string;
  description: string;
}

interface RecentProject {
  id: string;
  title: string;
  externalProductRef: string;
  statusBadge: string;
  preflightBadge: { className: string; label: string };
}

interface DesignerLauncherProps {
  starterProducts: readonly StarterProduct[];
  selectedStarterProductRef: string;
  selectedTemplateId: string | null;
  compatibleTemplates: readonly TemplateOption[];
  recentProjects: readonly RecentProject[];
  saving: boolean;
  onSelectStarterProduct: (productRef: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onCreateBlankProject: (productRef: string) => void;
  onCreateTemplateProject: (productRef: string, templateId: string) => void;
  onOpenProject: (projectId: string) => void;
}

export const DesignerLauncher = ({
  starterProducts,
  selectedStarterProductRef,
  selectedTemplateId,
  compatibleTemplates,
  recentProjects,
  saving,
  onSelectStarterProduct,
  onSelectTemplate,
  onCreateBlankProject,
  onCreateTemplateProject,
  onOpenProject
}: DesignerLauncherProps) => {
  const selectedStarterLabel =
    starterProducts.find((starter) => starter.productRef === selectedStarterProductRef)?.label ?? "this product";

  return (
    <AppShell
      eyebrow="Designer"
      title="Open a project"
      subtitle="Start a new design or continue an existing one."
    >
      <div className="designer-launchpad">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>Start a new design</h3>
              <p>Select a product and start blank or from a template.</p>
            </div>
          </div>
          <div className="product-grid">
            {starterProducts.map((starter) => (
              <article
                className={`product-card ${selectedStarterProductRef === starter.productRef ? "product-card--active" : ""}`}
                key={starter.productRef}
              >
                <div>
                  <h3>{starter.label}</h3>
                  <p>{starter.note}</p>
                </div>
                <div className="product-actions">
                  <button type="button" className="button--ghost" onClick={() => onSelectStarterProduct(starter.productRef)}>
                    {selectedStarterProductRef === starter.productRef ? "Selected" : "Choose product"}
                  </button>
                  <button type="button" onClick={() => onCreateBlankProject(starter.productRef)} disabled={saving}>
                    {saving ? "Opening..." : "Start blank"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="template-picker">
            <div className="section-heading">
              <div>
                <h3>Available templates</h3>
                <p>Starting points for {selectedStarterLabel}.</p>
              </div>
              <span className="badge badge--neutral">{compatibleTemplates.length}</span>
            </div>
            {compatibleTemplates.length === 0 ? <div className="empty-state">No templates are available for this product yet.</div> : null}
            <div className="template-grid">
              {compatibleTemplates.map((template) => (
                <article className={`template-card ${selectedTemplateId === template.id ? "template-card--active" : ""}`} key={template.id}>
                  <div>
                    <h3>{template.displayName}</h3>
                    <p>{template.description}</p>
                  </div>
                  <div className="product-actions">
                    <button type="button" className="button--ghost" onClick={() => onSelectTemplate(template.id)}>
                      {selectedTemplateId === template.id ? "Selected" : "Preview start"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateTemplateProject(selectedStarterProductRef, template.id)}
                      disabled={saving}
                    >
                      {saving ? "Opening..." : "Start with template"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
              <div>
                <h3>Recent projects</h3>
                <p>Continue your recent work.</p>
              </div>
            <span className="badge badge--neutral">{recentProjects.length}</span>
          </div>
          {recentProjects.length === 0 ? <div className="empty-state">No projects yet. Start one above.</div> : null}
          <div className="project-grid">
            {recentProjects.map((item) => (
              <article className="project-card" key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.externalProductRef}</p>
                </div>
                <div className="badge-row">
                  <span className="badge badge--neutral">{item.statusBadge}</span>
                  <span className={item.preflightBadge.className}>{item.preflightBadge.label}</span>
                </div>
                <div className="project-actions">
                  <button type="button" onClick={() => onOpenProject(item.id)}>
                    Open project
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
};
