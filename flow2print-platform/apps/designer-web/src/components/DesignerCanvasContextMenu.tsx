import { useLayoutEffect, useRef, useState, type RefObject } from "react";

interface DesignerCanvasContextMenuAction {
  id: string;
  label: string;
  icon: string;
  onSelect: () => void;
}

interface DesignerCanvasContextMenuProps {
  x: number;
  y: number;
  actions: DesignerCanvasContextMenuAction[];
  menuRef?: RefObject<HTMLDivElement | null>;
}

export const DesignerCanvasContextMenu = ({
  x,
  y,
  actions,
  menuRef: externalMenuRef
}: DesignerCanvasContextMenuProps) => {
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
    const nextTop = fitsBelow ? Math.max(margin, y) : Math.max(margin, y - rect.height - 10);

    setPosition({ left: nextLeft, top: nextTop });
  }, [actions, x, y]);

  return (
    <div
      ref={menuRef}
      className="context-menu context-menu--canvas"
      style={{ left: position.left, top: position.top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="context-menu__header">
        <strong>Canvas</strong>
        <span>Quick actions</span>
      </div>
      {actions.map((action) => (
        <button key={action.id} type="button" onClick={action.onSelect}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {action.icon}
          </span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};
