interface LayerContextMenuProps {
  x: number;
  y: number;
  layerName: string;
  layerType: string;
  visible: boolean;
  locked: boolean;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onCenter: () => void;
  onDelete: () => void;
}

export const LayerContextMenu = ({
  x,
  y,
  layerName,
  layerType,
  visible,
  locked,
  onDuplicate,
  onToggleVisible,
  onToggleLocked,
  onBringForward,
  onSendBackward,
  onCenter,
  onDelete
}: LayerContextMenuProps) => (
  <div
    className="context-menu"
    style={{
      left: Math.min(x, window.innerWidth - 220),
      top: Math.min(y, window.innerHeight - 260)
    }}
    onPointerDown={(event) => event.stopPropagation()}
  >
    <div className="context-menu__header">
      <strong>{layerName}</strong>
      <span>{layerType}</span>
    </div>
    <button type="button" onClick={onDuplicate}>
      Duplicate
    </button>
    <button type="button" onClick={onToggleVisible}>
      {visible ? "Hide item" : "Show item"}
    </button>
    <button type="button" onClick={onToggleLocked}>
      {locked ? "Unlock item" : "Lock item"}
    </button>
    <button type="button" onClick={onBringForward}>
      Bring forward
    </button>
    <button type="button" onClick={onSendBackward}>
      Send backward
    </button>
    <button type="button" onClick={onCenter}>
      Center in safe area
    </button>
    <button type="button" className="context-menu__danger" onClick={onDelete}>
      Delete
    </button>
  </div>
);
