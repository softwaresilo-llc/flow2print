# Sprint 4: Asset Pipeline & Normalization (Realistic V1)

## Ziel
Ein belastbarer Asset-Flow für Web2Print:
- sicher hochladen
- serverseitig validieren
- Originaldatei erhalten
- schnelle Web-Derivate erzeugen
- Druckqualität im Designer sichtbar machen

Sprint 4 ist erfolgreich, wenn Bilder und Fonts nicht mehr nur „irgendwie hochgeladen“ werden, sondern als echte produktionsnahe Ressourcen behandelt werden.

## Technische Leitplanken
- **Storage:** `MinIO` oder kompatibler `S3`-Storage
- **Processing:** `Sharp` für V1
- **Optional später:** `libvips`-optimierte Sonderpfade für sehr große Assets
- **Master-Datei:** Originaldatei bleibt erhalten
- **Derivate:** `thumb`, `web`, `normalized`
- **Designer Preview:** Web-optimierte Assets, niemals die einzige Druckquelle

## Architekturregeln
- Das Original bleibt die Referenz für Qualität und Nachvollziehbarkeit.
- Upload-Validierung ist serverseitig Pflicht.
- Client-seitige Optimierung darf nur Komfort sein, nie die einzige Qualitätsbasis.
- Asset-Metadaten müssen für Drucklogik nutzbar sein:
  - Größe
  - Auflösung
  - Farbprofil / Color Space
  - Dateityp
- Der Designer darf Qualitätsprobleme sichtbar machen, aber nicht still „wegoptimieren“.
- Fonts werden kontrolliert registriert, nicht beliebig chaotisch eingebunden.

## Work Packages

### 4.1 Asset Storage & Upload (`apps/asset-service`)
- [ ] **Upload Intent**
  - `POST /assets/upload-intent`
  - Rückgabe eines Presigned Upload-Ziels
  - Dateiname, MIME-Absicht, Größe und Asset-Typ werden vorher registriert
- [ ] **Confirm Upload**
  - `POST /assets/confirm-upload`
  - Server bestätigt Upload und stößt Verarbeitung an
- [ ] **Server-side Limits**
  - maximale Dateigröße
  - maximale Kantenlänge
  - maximale Pixelanzahl / entpackte Bildfläche
  - Schutz gegen DoS und kaputte Input-Dateien

### 4.2 Validation & Ingest (`apps/asset-service`)
- [ ] **Dateityp-Prüfung**
  - Magic Bytes statt bloßer Dateiendung
  - getarnte Binärdateien werden abgelehnt
- [ ] **Metadata Extraction**
  - `width`
  - `height`
  - `dpi`
  - `colorSpace`
  - ICC-Referenz sofern vorhanden
  - Dateigröße und MIME-Typ
- [ ] **Asset Classification**
  - customer image
  - template asset
  - technical asset
  - font asset
- [ ] **Normalized Record**
  - Asset landet erst als „ready“, wenn Validierung und Metadaten vollständig sind

### 4.3 Variant Generation (`apps/asset-service`)
- [ ] **Original Preservation**
  - Originaldatei bleibt im Storage erhalten
- [ ] **Thumb Variant**
  - z. B. `200x200`
  - für Listen, Karten, schnelle Libraries
- [ ] **Web Variant**
  - z. B. max `1500px` lange Kante
  - `WebP` für schnelle Vorschau
- [ ] **Normalized Variant**
  - bereinigte Version für interne Weiterverarbeitung
  - Exif bereinigt
  - Color Space / ICC nachvollziehbar erhalten
- [ ] **Keine Master-Zwangskonvertierung**
  - nicht jedes Bild blind nach PNG/TIFF umwandeln
  - Original ist Master, Derivate dienen Anzeige und Verarbeitung

### 4.4 Processing Flow (`apps/asset-service` + Worker)
- [ ] **Async Processing**
  - Upload und Verarbeitung sauber entkoppeln
  - Worker-basierter Flow ist sinnvoll
- [ ] **Queue / Event Hook**
  - Vorbereitung für `RabbitMQ`
  - V1 darf zunächst mit einem einfachen asynchronen Jobmodell starten
- [ ] **Statusmodell**
  - `pending`
  - `processing`
  - `ready`
  - `failed`
- [ ] **Fehlertransparenz**
  - Nutzer und Admin sehen, warum ein Asset abgelehnt oder fehlgeschlagen ist

### 4.5 Asset Library UI (`apps/designer-web`)
- [ ] **Upload Flow**
  - Datei auswählen
  - Upload-Fortschritt
  - nachvollziehbarer Verarbeitungsstatus
- [ ] **Asset Library**
  - Grid oder Liste mit Preview
  - verständliche Statusanzeige
  - nutzbare Standardaktionen
- [ ] **Use / Replace**
  - Bild auf die Bühne setzen
  - Bild ersetzen, ohne Position und Größe zu verlieren
- [ ] **Keine Fake-Assets**
  - Library lädt echte API-/DB-Daten
  - keine Frontend-Screen-Fixtures

### 4.6 Quality Feedback im Designer (`apps/designer-web`)
- [ ] **Quality Meter**
  - Qualität bezogen auf tatsächliche Platzierungsgröße
  - nicht nur Original-DPI anzeigen
- [ ] **Warnstufen**
  - `good`
  - `warning`
  - `blocking` nur wenn konfiguriert oder wirklich nötig
- [ ] **Low Resolution Warning**
  - sichtbar im Bildkontext
  - nachvollziehbar formuliert
- [ ] **Kein stilles Downsampling als Lösung**
  - Warnen statt magisch verstecken

### 4.7 Font Management (`apps/asset-service`)
- [ ] **Font Upload**
  - `TTF` / `OTF`
  - Parsing mit `fontkit`
- [ ] **Font Metadata**
  - Familienname
  - Stil
  - Gewicht
  - interne Referenz
- [ ] **Web Preview Variant**
  - `WOFF2` für Browser-Vorschau
- [ ] **Font Registry**
  - `fontFamilyRef` -> Storage Key / Dateireferenz
  - nur freigegebene Fonts im Designer
- [ ] **Kontrollierter Font-Pfad**
  - keine unbeschränkten Endnutzer-Fonts im öffentlichen V1-Flow

### 4.8 Admin / Backoffice Asset Ops (`admin workspace`)
- [ ] **Asset Listen**
  - was existiert
  - welcher Status gilt
  - welche Metadaten wurden erkannt
- [ ] **Asset Details**
  - Original
  - Varianten
  - technische Metadaten
  - Verarbeitungsstatus
- [ ] **Fehlerfälle sichtbar**
  - z. B. invalid MIME
  - oversized
  - processing failed
- [ ] **Font Registry Screens**
  - Upload
  - Freigabe
  - Zuordnung / Verwaltung

## Nicht Blocker für Sprint 4
- vollautomatische Bildoptimierung im Browser
- komplexe DAM-Funktionalität
- AI-Tagging oder semantische Suche
- sofortige libvips-Spezialpfade für Extremfälle
- offene Google-Fonts-Synchronisierung ohne Governance

## Definition of Done (DoD)
- [ ] Upload einer großen, drucknahen Bilddatei erzeugt ein schnelles Preview-Derivat im Designer
- [ ] Eine getarnte Binärdatei wird serverseitig abgelehnt
- [ ] Das Original bleibt als Master erhalten
- [ ] Der Designer zeigt eine verständliche Qualitätswarnung, wenn ein Bild zu stark vergrößert wird
- [ ] `Replace Image` behält Position und Größe auf der Bühne bei
- [ ] Fonts können registriert und im Designer korrekt dargestellt werden
- [ ] Der Upload-/Verarbeitungsfluss wurde im laufenden Browser geprüft, nicht nur per Build

## Hinweise zur Bewertung
- Sprint 4 ist **nicht** fertig, nur weil Dateien hochgeladen werden können.
- Sprint 4 ist fertig, wenn Assets für Web2Print technisch und UX-seitig sinnvoll nutzbar sind.
- Der Fokus liegt auf Verlässlichkeit, Nachvollziehbarkeit und Druckrelevanz, nicht auf einem maximalen Media-Management-System.
