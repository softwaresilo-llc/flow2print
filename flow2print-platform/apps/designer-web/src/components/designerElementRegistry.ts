export interface DesignerElementDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "smart" | "layout";
}

export const designerElementRegistry: DesignerElementDefinition[] = [
  {
    id: "qr",
    label: "QR Code",
    description: "Add a scannable block for links, menus, or product journeys.",
    icon: "qr_code_2",
    category: "smart"
  },
  {
    id: "barcode",
    label: "Bar Code",
    description: "Insert a barcode for labels, tickets, or retail packaging.",
    icon: "barcode",
    category: "smart"
  },
  {
    id: "table",
    label: "Tabelle",
    description: "Place a structured table block for specs, menus, or pricing.",
    icon: "table_rows",
    category: "layout"
  }
];
