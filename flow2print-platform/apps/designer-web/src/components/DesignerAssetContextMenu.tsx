import { useLayoutEffect, useRef, useState } from "react";

interface DesignerAssetContextMenuProps {
  x: number;
  y: number;
  assetName: string;
  linked: boolean;
  onPlace: () => void;
  onDelete: () => void;
}

export const DesignerAssetContextMenu = ({
  x,
  y,
  assetName,
  linked,
  onPlace,
  onDelete
}: DesignerAssetContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y });

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
  }, [assetName, linked, x, y]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.left, top: position.top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="context-menu__header">
        <strong>{assetName}</strong>
        <span>{linked ? "used in layout" : "library asset"}</span>
      </div>
      <button type="button" onClick={onPlace}>
        Place on canvas
      </button>
      <button type="button" className="context-menu__danger" onClick={onDelete}>
        Delete from library
      </button>
    </div>
  );
};
