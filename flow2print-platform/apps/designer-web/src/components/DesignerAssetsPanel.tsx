interface DesignerAssetsPanelAsset {
  id: string;
  filename: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
  previewUrl: string | null;
  linked: boolean;
}

interface DesignerAssetsPanelProps {
  assets: DesignerAssetsPanelAsset[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onUpload: () => void;
  onUseAsset: (assetId: string) => void;
  isEditableProject: boolean;
}

const formatAssetMeta = (asset: DesignerAssetsPanelAsset) => {
  const size = asset.widthPx && asset.heightPx ? `${asset.widthPx}×${asset.heightPx}` : "Image";
  const mime = asset.mimeType.replace("image/", "").toUpperCase();
  return `${mime} • ${size}`;
};

export const DesignerAssetsPanel = ({
  assets,
  searchQuery,
  onSearchQueryChange,
  onUpload,
  onUseAsset,
  isEditableProject
}: DesignerAssetsPanelProps) => {
  const recentAssets = assets.slice(0, 2);

  return (
    <article className="panel panel--tight panel--navigator panel--sidebar panel--utility stitch-assets-panel">
      <div className="navigator-topbar stitch-assets-panel__topbar">
        <div>
          <strong>Assets</strong>
        </div>
        <button type="button" className="icon-button" aria-label="More asset actions" title="More asset actions">
          <span className="material-symbols-outlined" aria-hidden="true">
            more_horiz
          </span>
        </button>
      </div>

      <div className="stitch-assets-panel__search">
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>

      <div className="stitch-assets-panel__tabs" role="tablist" aria-label="Asset categories">
        <button type="button" className="stitch-assets-panel__tab stitch-assets-panel__tab--active" aria-selected="true">
          Images
        </button>
        <button type="button" className="stitch-assets-panel__tab" aria-selected="false" disabled>
          Icons
        </button>
        <button type="button" className="stitch-assets-panel__tab" aria-selected="false" disabled>
          3D
        </button>
      </div>

      <div className="navigator-panel__body stitch-assets-panel__body">
        {assets.length === 0 ? (
          <div className="empty-state stitch-assets-panel__empty">
            Upload your first image to start building this design.
          </div>
        ) : (
          <>
            <div className="stitch-assets-grid">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="stitch-assets-grid__tile"
                  onClick={() => onUseAsset(asset.id)}
                  disabled={!isEditableProject}
                  aria-label={`Place ${asset.filename}`}
                  title={asset.filename}
                >
                  <span className="stitch-assets-grid__image">
                    {asset.previewUrl ? (
                      <img src={asset.previewUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="material-symbols-outlined" aria-hidden="true">
                        image
                      </span>
                    )}
                  </span>
                  <span className="stitch-assets-grid__overlay">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      add
                    </span>
                  </span>
                  {asset.linked ? <span className="stitch-assets-grid__badge">Used</span> : null}
                </button>
              ))}
            </div>

            <div className="stitch-assets-panel__recent">
              <h4>Recent uploads</h4>
              <div className="stitch-assets-recent">
                {recentAssets.map((asset) => (
                  <button
                    key={`recent-${asset.id}`}
                    type="button"
                    className="stitch-assets-recent__item"
                    onClick={() => onUseAsset(asset.id)}
                    disabled={!isEditableProject}
                  >
                    <span className="stitch-assets-recent__thumb">
                      {asset.previewUrl ? <img src={asset.previewUrl} alt="" loading="lazy" /> : null}
                    </span>
                    <span className="stitch-assets-recent__content">
                      <strong>{asset.filename}</strong>
                      <span>{formatAssetMeta(asset)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="navigator-panel__footer stitch-assets-panel__footer">
        <button type="button" className="stitch-assets-panel__upload" onClick={onUpload} disabled={!isEditableProject}>
          <span className="material-symbols-outlined" aria-hidden="true">
            upload
          </span>
          <span>Upload New</span>
        </button>
      </div>
    </article>
  );
};
