import { useLayoutEffect, useRef, useState, type RefObject } from "react";

interface LayerContextMenuProps {
  x: number;
  y: number;
  layerName: string;
  layerType: string;
  visible: boolean;
  locked: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onCenter: () => void;
  onDelete: () => void;
  onUngroup?: () => void;
  onGroupSelection?: () => void;
  canGroupSelection?: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
}

export const LayerContextMenu = ({
  x,
  y,
  layerName,
  layerType,
  visible,
  locked,
  onRename,
  onDuplicate,
  onToggleVisible,
  onToggleLocked,
  onBringForward,
  onSendBackward,
  onCenter,
  onDelete,
  onUngroup,
  onGroupSelection,
  canGroupSelection = false,
  menuRef: externalMenuRef
}: LayerContextMenuProps) => {
  const internalMenuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const menuRef = externalMenuRef ?? internalMenuRef;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const fitsBelow = y + rect.height + margin <= window.innerHeight;
    const nextLeft = Math.min(Math.max(margin, x), maxLeft);
    const nextTop = fitsBelow
      ? Math.max(margin, y)
      : Math.max(margin, y - rect.height - 10);

    setPosition({ left: nextLeft, top: nextTop });
  }, [x, y, layerName, layerType, visible, locked]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: position.left,
        top: position.top
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="context-menu__header">
        <strong>{layerName}</strong>
        <span>{layerType}</span>
      </div>
      <button type="button" onClick={onRename}>
        Rename
      </button>
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
      {canGroupSelection && onGroupSelection ? (
        <button type="button" onClick={onGroupSelection}>
          Group selected items
        </button>
      ) : null}
      {layerType === "group" && onUngroup ? (
        <button type="button" onClick={onUngroup}>
          Ungroup
        </button>
      ) : null}
      <button type="button" className="context-menu__danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
};
