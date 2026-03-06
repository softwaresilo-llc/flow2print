# Sprint 6: Commerce Connector & Magento (Refined)

## Ziel
Integration der Plattform als "Design Engine" hinter Magento 2. Nahtloser UX-Flow ohne Iframe.

## Technische Vorgaben
- **Connector Type:** Redirect (Launch Session).
- **Security:** HMAC-Signaturen für Callbacks & Webhooks.
- **Pricing:** Signal-basiert (Fläche, Farben, Zonen), Berechnung in Magento.

## Work Packages

### 6.1 Commerce Connector (`apps/commerce-connector-service`)
- [ ] **Launch Session API:**
    - `POST /launch-sessions` (Validierung von API-Credentials).
    - Session-Context (Produkt-ID, User-ID, Rücksprung-URL).
    - `launchToken` Generierung (Short-lived, signiert).
- [ ] **Pricing Signal Engine:**
    - Berechnung: `surfaceCount`, `colorMode`, `usedSpotColors`, `printAreaCm2`.
    - Mapping auf Magento-Options-Format.
- [ ] **Callback Dispatcher:**
    - Retry-Logic für Webhooks an Magento.
    - Status-Updates (Rendering done, Preflight failed).

### 6.2 Magento 2 Extension (`flow2print-magento2-connector` Repo)
- [ ] **Data Structure (MySQL):**
    - `flow2print_project_link` (Quote Item -> Project ID).
    - `flow2print_launch_session` (Temp Storage).
- [ ] **Frontend Integration:**
    - "Customize" Button auf PDP (Startet Session).
    - "Edit Design" im Cart (Resume Session).
    - Thumbnail-Anzeige im Cart/Checkout.
- [ ] **Admin Configuration:**
    - API URL, Client ID, Secret Key.
    - Default Product Mapping.

### 6.3 Reorder & Archive
- [ ] **Reorder Flow:**
    - Klonen eines archivierten Projekts -> Neue Session.
    - Verhindern von Änderungen an alten Bestellungen.
- [ ] **GDPR Retention:**
    - Cronjob zum Löschen alter Sessions und unbestellter Drafts.

## Definition of Done (DoD)
- [ ] Klick auf "Customize" in Magento öffnet den Designer mit korrektem Produkt.
- [ ] Klick auf "Finish" im Designer leitet zurück in den Warenkorb.
- [ ] Das generierte Vorschaubild ist im Warenkorb sichtbar.
- [ ] Eine Bestellung in Magento enthält den Link zum Produktions-PDF.
