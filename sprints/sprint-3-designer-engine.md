# Sprint 3: Designer Engine & Canvas (Refined)

## Ziel
Umsetzung des visuellen Editors. Der Benutzer kann Designs erstellen, manipulieren und speichern. Dies ist das Herzstück der UX.

## Technische Vorgaben
- **Engine:** Fabric.js 6.x (Beta) oder stable 5.x (abhängig von Feature-Support).
- **State Management:** Zustand (Client) + TanStack Query (Server Sync).
- **Architecture:** `editor-engine` kapselt Fabric.js komplett. Das UI kennt nur das `DesignDocument`.

## Work Packages

### 3.1 Editor Engine Core (`packages/editor-engine`)
- [ ] **Canvas Adapter:**
    - Initialisierung von Fabric.js Canvas.
    - Resize-Handling (Responsive).
    - Zoom/Pan Controls (Touch & Mouse).
- [ ] **Object Mapping (Document <-> Fabric):**
    - `loadFromDocument(doc)`: Erzeugt Fabric-Objekte aus JSON.
    - `toDocument()`: Erzeugt valides JSON aus Fabric-Objekten.
    - Unterstützung für Text, Image, SVG, Group.
- [ ] **Constraint System (ADR 0002):**
    - Interceptor für `object:moving`, `object:scaling`.
    - Validierung gegen `bleedBox`, `safeBox`.
    - Sperrung von Layern (Lock Movement, Lock Style).
- [ ] **History Service:**
    - Undo/Redo Stack (lokal).
    - `Command` Pattern für alle Operationen (Add, Remove, Modify).

### 3.2 Designer UI (`apps/designer-web`)
- [ ] **App Layout:**
    - Sidebar (Tools), Topbar (Actions), Canvas (Center), Properties (Right).
- [ ] **Surface Navigation:**
    - Tabs für Front/Back/Sleeve.
    - Umschaltung lädt neuen Canvas-Status (ohne Page Reload).
- [ ] **Interactive Tools:**
    - Text-Tool (Add Text, Edit Font/Color).
    - Image-Tool (Place Image, Crop, Scale).
    - Shape-Tool (Rect, Circle).
- [ ] **Layer Panel:**
    - Drag & Drop Reordering.
    - Visibility/Lock Toggles.
    - Renaming Layers.

### 3.3 Project Service Integration (`apps/project-service`)
- [ ] **Autosave Logic:**
    - Debounced `PATCH /projects/:id/autosave`.
    - Optimistic UI Updates.
- [ ] **Versioning:**
    - `POST /projects/:id/versions` (Manueller Snapshot).
    - `POST /projects/:id/finalize` (Sperren für Produktion).
- [ ] **Conflict Handling:**
    - "Last Write Wins" oder einfache Version-Check-Warnung.

## Definition of Done (DoD)
- [ ] Undo/Redo funktioniert über mindestens 50 Schritte.
- [ ] Ein Text kann nicht aus dem Artboard geschoben werden (Constraint).
- [ ] Seitenwechsel (Front -> Back) speichert den Status der Front-Seite korrekt.
- [ ] Nach Reload (`F5`) ist der letzte Stand wiederhergestellt.
