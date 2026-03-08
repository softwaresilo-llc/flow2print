# Sprint 3: Designer Engine & Canvas (Realistic V1)

## Ziel
Ein belastbarer Web2Print-Designer, der die wichtigsten Gestaltungs- und Produktionsschritte sauber unterstützt:
- gestalten
- auswählen
- verschieben
- skalieren
- gruppieren
- prüfen
- speichern
- wieder laden

Sprint 3 ist erfolgreich, wenn `Flow2Print` einen ernsthaft nutzbaren Designer hat. Ziel ist nicht maximale Architektur-Perfektion, sondern ein stabiler, erweiterbarer Kern.

## Technische Leitplanken
- **Canvas Engine:** `Fabric.js`
- **Source of Truth:** `Flow2Print Document`
- **UI-Surface:** `apps/designer-web`
- **Core Logic:** `packages/editor-engine`
- **Persistenz:** API- und DB-backed, niemals Fabric-JSON als Langzeitvertrag

## Architekturregeln
- `Fabric.js` übernimmt Interaktion auf der Bühne.
- Das UI darf wissen, dass es eine Canvas-Stage gibt.
- Persistenz und API-Verträge dürfen **nicht** an Fabric-Interna gekoppelt sein.
- `editor-engine` kapselt Mapping-, Selection-, Constraint- und History-nahe Kernlogik.
- `designer-web` verantwortet Workflow, Panels, Routing und Browser-UX.
- Keine neue DOM-/CSS-Interaktionslogik neben Fabric aufbauen.

## Work Packages

### 3.1 Canvas Foundation (`packages/editor-engine`)
- [ ] **Canvas Adapter**
  - Initialisierung von Fabric.js Canvas
  - Responsive Resize
  - Zoom
  - vorbereiteter Pan-Support
- [ ] **Surface Handling**
  - Umschaltung zwischen Surfaces ohne Page Reload
  - pro Surface konsistenter Canvas-Zustand
- [ ] **Stage Runtime**
  - eine einzige Interaktionsschicht
  - keine gemischten Legacy-Wege für Auswahl, Drag oder Resize

### 3.2 Document Mapping (`packages/editor-engine`)
- [ ] **Document -> Fabric**
  - `loadFromDocument(surface)`
  - Erzeugung von Fabric-Objekten aus dem `Flow2Print Document`
- [ ] **Fabric -> Document**
  - `surfaceFromCanvas()`
  - Rückführung in das eigene Dokumentmodell
- [ ] **Unterstützte Layer-Typen**
  - Text
  - Image
  - Shape
  - Group
  - QR
  - Barcode
- [ ] **Kein Persistenzvertrag über Fabric JSON**
  - Fabric bleibt Runtime, nicht Storage-Format

### 3.3 Selection & Editing (`packages/editor-engine` + `apps/designer-web`)
- [ ] **Single Selection**
  - Auswahl eines Elements auf der Bühne
  - sichtbare Handles und direkte Objektinteraktion
- [ ] **Multi Selection**
  - Mehrfachauswahl
  - kontextuelle Aktionen
- [ ] **Grouping**
  - Group
  - Ungroup
- [ ] **Arrange**
  - Bring forward
  - Send backward
  - Align
  - Distribute

### 3.4 Image Workflow (`apps/designer-web`)
- [ ] **Place / Replace**
  - Bild hinzufügen
  - Bild ersetzen
- [ ] **Fit Modes**
  - Cover
  - Contain
  - Stretch
- [ ] **Crop**
  - echter Bildzuschnitt im Rahmen
  - kein bloßes Zahlenfeld als Hauptinteraktion
- [ ] **Mask Basics**
  - einfache Maskierung für typische Print-Flows

### 3.5 Constraints (`packages/editor-engine`)
- [ ] **Locked Layers**
  - gesperrte Layer sind nicht frei manipulierbar
- [ ] **Print Guides**
  - Safe Area
  - Bleed
  - visuell auf der Bühne
- [ ] **Move / Scale Constraints**
  - Kernregeln für sichere Platzierung
  - keine unkontrollierte Bewegung außerhalb erlaubter Bereiche
- [ ] **Keine überkomplexe Regelmaschine**
  - Sprint 3 liefert einen sauberen Kern, nicht das endgültige Enterprise-Constraint-System

### 3.6 History (`packages/editor-engine`)
- [ ] **Undo / Redo**
  - lokal
  - stabil
  - vorhersehbar
- [ ] **Operation Boundaries**
  - sinnvolle History-Schritte statt chaotischer Mikrostates
- [ ] **Keine Über-Architektur**
  - ein schlankes, sauberes History-Modell ist wichtiger als ein überladenes Command-Framework

### 3.7 Designer UI (`apps/designer-web`)
- [ ] **Workspace Layout**
  - Navigator / Layers / Assets links
  - Bühne in der Mitte
  - Inspector / Review / Finish rechts
- [ ] **Surface Navigation**
  - verständlich
  - ohne Reload
- [ ] **Interactive Tools**
  - Text
  - Image
  - Shape
- [ ] **Layer Panel**
  - Reordering
  - Visibility
  - Lock
  - Rename
- [ ] **State Clarity**
  - Edit
  - Review
  - Finish
  - read-only/finalized klar trennen

### 3.8 Project Integration (`apps/designer-web` + API)
- [ ] **Autosave**
  - debounced
  - stabil
  - DB-backed
- [ ] **Reload Recovery**
  - letzter Draft ist nach Reload wiederherstellbar
- [ ] **Finalize**
  - finaler Zustand wird sauber abgeschlossen
  - keine irreführende Weiterbearbeitung im Produktionszustand
- [ ] **Versioning**
  - `finalize` ist Pflicht
  - explizite manuelle Snapshots sind sinnvoll, aber kein Sprint-Blocker
- [ ] **Conflict Handling**
  - einfache, nachvollziehbare Strategie
  - keine Multiuser-Komplexität in Sprint 3

## Nicht Blocker für Sprint 3
- perfekte Mobile-Gesten
- tiefes Multiuser-Konfliktmanagement
- vollständiges Enterprise-Constraint-System
- vollwertige Versions-/Branching-Modelle
- maximale Abstraktionsreinheit im Engine-Paket

## Definition of Done (DoD)
- [ ] Benutzer kann Text, Bild und Shape sinnvoll bearbeiten
- [ ] Multi-Select sowie Group/Ungroup funktionieren
- [ ] Bild-Crop und Fit funktionieren in einem brauchbaren Nutzerfluss
- [ ] Locked Layers respektieren Bearbeitungssperren
- [ ] Surface-Wechsel verliert keinen Zustand
- [ ] Reload stellt den letzten Draft aus Persistenz wieder her
- [ ] Finalize erzeugt einen reproduzierbaren finalen Zustand
- [ ] Der Hauptflow ist im laufenden Browser geprüft, nicht nur gebaut

## Hinweise zur Bewertung
- Sprint 3 ist **nicht** fertig, nur weil Fabric integriert ist.
- Sprint 3 ist fertig, wenn der Designer als Werkzeug ernsthaft benutzbar ist.
- Architektur soll den nächsten Ausbau erleichtern, aber den Sprint nicht durch Über-Engineering blockieren.
