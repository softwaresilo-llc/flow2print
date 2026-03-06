
  # Flow2Print Masterplan

  ## 1. Zielbild in einem Satz

  - Flow2Print wird ein eigenständiges, selbst hostbares Open-Source-Web2Print-System.
  - Magento 2 wird nur als Commerce- und Checkout-System angebunden.
  - Der Magento 2-Connector bleibt bewusst schlank.
  - Die Web2Print-Fachlogik lebt nicht in Magento.
  - Die Design- und Produktionslogik lebt nicht im Connector.
  - Die Design- und Produktionslogik lebt in Flow2Print.
  - Das System wird von Anfang an so geschnitten, dass Flat Print, Apparel und Packaging auf demselben Kernmodell aufbauen.
  - Das System wird nicht als Canva-Klon geplant.
  - Das System wird nicht als reiner PDF-Generator geplant.
  - Das System wird als Plattform für Produktkontext, Template-Regeln, Projekt-Versionen, Preflight, Outputs und Commerce-Referenzen geplant.

  ## 2. Warum der vorige Plan nicht gereicht hat

  - Der vorige Plan war architektonisch richtig grob geschnitten.
  - Der vorige Plan war aber nicht tief genug auf Technologien, Seed-Analyse, Repo-Struktur, Vertragsgrenzen, Datenmodell, APIs, Rendering, Preflight, Connector-Details und Betrieb.
  - Genau diese Lücken schließe ich hier.
  - Dieser Plan ist absichtlich deutlich technischer.
  - Dieser Plan ersetzt den vorigen Entwurf vollständig.
  - Dieser Plan ist als decision-complete ausgelegt.
  - Dieser Plan ist so formuliert, dass ein anderer Engineer oder Agent direkt mit dem Bootstrap beginnen kann.

  ## 3. Harte Entscheidungen, die in diesem Plan fest verdrahtet sind

  - Flow2Print wird als separates Produkt gebaut.
  - Magento 2 bekommt ein separates Connector-Repo.
  - print-designer wird nicht direkt geforkt.
  - print-designer wird als konzeptioneller Seed benutzt.
  - Graphic-and-banner-designing-app-fabricjs wird nicht als technische Basis benutzt.
  - Der Frontend-Stack wird React + TypeScript + Vite.
  - Der Editor benutzt Fabric.js.
  - Der Backend-Stack wird TypeScript + NestJS + Fastify.
  - Die Primärdatenbank wird PostgreSQL.
  - Das Messaging wird RabbitMQ.
  - Das Caching und Locking wird Redis.
  - Das Objekt-Storage wird MinIO oder ein kompatibler S3-Endpoint.
  - Die Persistenz des Design-Dokuments wird nicht an rohes Fabric JSON gebunden.
  - Das persistierte Design-Dokument wird ein eigenes, versioniertes Flow2Print Document Schema.
  - Die APIs werden primär REST + OpenAPI.
  - Die asynchrone Kommunikation läuft über Events und Command Queues.
  - Search wird in v1 primär mit PostgreSQL Full Text + pg_trgm gelöst.
  - OpenSearch wird erst optional als späterer Adapter vorgesehen.
  - Temporal wird nicht in v1 erzwungen.
  - RabbitMQ + Outbox Pattern + Job State Tables reichen für v1.
  - Auth wird nicht von Magento übernommen.
  - Flow2Print hat ein eigenes Identity-Modell.
  - OIDC-Föderation für Enterprise-SSO wird unterstützt.
  - Keycloak wird als Referenz-IdP unterstützt, aber nicht als harte Pflicht für jede Installation.
  - Deployment-Standard wird Self-hosted first.
  - Lokales Setup wird Docker Compose.
  - Produktions-Setup wird Kubernetes + Helm.
  - Lizenzierung für den Plattform-Kern wird AGPL-3.0.
  - Offizielle Integrations-SDKs und der Magento-Connector dürfen permissiver lizenziert werden.
  - Der offizielle Vorschlag dafür ist Apache-2.0 für Connector und SDKs.
  - Der Editor wird Redirect-first aus Magento gestartet.
  - Iframe-Embedding wird nicht als Primärmodus in v1 geplant.
  - Flat Print, Apparel und Packaging sind öffentlich Teil des Zielbildes für 1.0.
  - Die interne Lieferreihenfolge bleibt dennoch gestuft.

  ## 4. Welche Repos und Quellen dieser Plan konkret auswertet

  - Seed-Repo 1: lmanukyan/print-designer (https://github.com/lmanukyan/print-designer)
  - Seed-Repo 2: basirkhan12/Graphic-and-banner-designing-app-fabricjs (https://github.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs)
  - Offizielle React-Dokumentation: react.dev (https://react.dev/)
  - Offizielle Vite-Dokumentation: vite.dev/guide (https://vite.dev/guide/)
  - Offizielle NestJS-Dokumentation: docs.nestjs.com (https://docs.nestjs.com/)
  - Offizielle PostgreSQL-Dokumentation: postgresql.org/docs/current (https://www.postgresql.org/docs/current/)
  - Offizielle RabbitMQ-Dokumentation: rabbitmq.com/docs (https://www.rabbitmq.com/docs)
  - Offizielle Keycloak-Dokumentation: keycloak.org/documentation (https://www.keycloak.org/documentation)
  - Offizielle Node.js Release-Seite: nodejs.org/en/about/previous-releases (https://nodejs.org/en/about/previous-releases)
  - Magento Open Source Release Notes 2.4.8: experienceleague.adobe.com (https://experienceleague.adobe.com/en/docs/commerce-operations/release/notes/magento-open-source/2-4-8)

  ## 5. Was print-designer heute tatsächlich ist

  - Das Root-Backend nutzt Payload CMS 2.
  - Das Root-Backend nutzt den MongoDB-Adapter von Payload.
  - Das Root-Backend nutzt Express.
  - Das Root-Backend nutzt Nodemailer.
  - Das Root-Backend rendert E-Mail-Templates mit Nunjucks.
  - Referenz: package.json (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/package.json)
  - Referenz: server.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/server.ts)
  - Referenz: payload.config.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/payload.config.ts)
  - Das Frontend unter src/app nutzt Vue 3.
  - Das Frontend nutzt Quasar.
  - Das Frontend nutzt Fabric.js 5.
  - Das Frontend nutzt Vuex.
  - Das Frontend wird mit Vue CLI gebaut.
  - Referenz: src/app/package.json (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/package.json)
  - Das Backend modelliert die Collections Users, Media, Orders, Products, Projects.
  - Referenz: payload.config.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/payload.config.ts)
  - Es gibt ein globales Pricing.
  - Referenz: Pricing.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/globals/Pricing.ts)
  - Der Zugriff wird sehr einfach über AuthorizedAccess, AdminAccess, OwnerAccess geregelt.
  - Referenz: access.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/access.ts)
  - Das Datenmodell nutzt ein verstecktes author-Feld zur Eigentümerbindung.
  - Referenz: fields.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/shared/fields.ts)
  - Products sind im Seed im Kern nur title, clientModel, price ranges, images, sizes.
  - Referenz: Products.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Products.ts)
  - Projects speichern im Kern title, json, author.
  - Referenz: Projects.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Projects.ts)
  - Orders speichern title, clientModel, phone, email, price, quantity, front, back, json, author.
  - Referenz: Orders.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Orders.ts)
  - Der Order-Hook packt Front-, Back- und Layer-Bilder in ein ZIP und mailt dieses weg.
  - Referenz: order-created.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/hooks/order-created.js)
  - Das Frontend hat Services für canvas, media, order, product, project, user.
  - Referenz: src/app/src/services (https://github.com/lmanukyan/print-designer/tree/develop/src/app/src/services)
  - Das Frontend hat UI-Bereiche für Controls, Layers, Modals.
  - Referenz: src/app/src/components (https://github.com/lmanukyan/print-designer/tree/develop/src/app/src/components)
  - Das Frontend hat eine front/back-Modellogik.
  - Referenz: canvas.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/canvas.js)
  - Das Frontend nimmt virtuelle Captures pro Modus und lädt PNGs hoch.
  - Referenz: canvas.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/canvas.js)
  - Das Frontend lädt Preise aus globals/pricing.
  - Referenz: order.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/order.js)
  - Das Frontend lädt Modelle über ein benutzerdefiniertes Endpoint products/models.
  - Referenz: product.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/product.js)
  - Das Frontend speichert Projekte direkt über CRUD auf projects.
  - Referenz: project.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/project.js)
  - Die Auth läuft über users/login, users/logout, users/me.
  - Referenz: user.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/user.js)
  - Das lokale Setup ist ein kleines docker-compose mit payload, mongo, nginx.
  - Referenz: docker-compose.yml (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/docker-compose.yml)
  - Die .env bestätigt ein kompaktes Setup mit DATABASE_URI, PAYLOAD_SECRET, SMTP_*, VUE_APP_API_URL.
  - Referenz: .env.example (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/.env.example)

  ## 6. Inferenz aus print-designer

  - Inferenz: print-designer ist ein guter funktionaler Seed für einen Editor + leichtes Backend.
  - Inferenz: print-designer ist keine belastbare Enterprise-Web2Print-Architektur.
  - Inferenz: Das Seed-Repo hat bereits die richtige Domänensprache Products, Projects, Orders, Pricing.
  - Inferenz: Das Seed-Repo hat aber noch keine harte Trennung zwischen Design, Output, Preflight, Commerce Link, Render Jobs und Production Artifacts.
  - Inferenz: Die Speicherung des Designzustands als einzelnes json-Blob ist für den Start brauchbar.
  - Inferenz: Für eine Open-Source-Plattform mit Upgrade-Pfad reicht das nicht.
  - Inferenz: Der Order-Hook über ZIP + E-Mail ist ein guter Demo-Mechanismus.
  - Inferenz: Für Enterprise-Produktionsworkflows ist er zu eng gekoppelt.
  - Inferenz: Die front/back-Modellogik ist wertvoll.
  - Inferenz: Sie sollte im Zielsystem in surfaces verallgemeinert werden.
  - Inferenz: Das UI-Muster mit Layers, Controls und Modals ist als Interaktionskonzept brauchbar.
  - Inferenz: Das persistierte Vertragsmodell darf trotzdem nicht rohes Fabric JSON bleiben.
  - Inferenz: Payload CMS wäre als Content-/Admin-Tool okay.
  - Inferenz: Für den Kern eines offenen Web2Print-Produkts wäre es zu CMS-zentriert.
  - Inferenz: MongoDB passt zum Seed.
  - Inferenz: Für das Zielsystem ist PostgreSQL wegen Relationen, Versionsregeln, JSONB, Audit und Integrationsdaten besser.

  ## 7. Was aus print-designer konzeptionell übernommen wird

  - Die Idee einer klaren Trennung zwischen product, project, order, media, user.
  - Die Idee einer Seiten- bzw. Modusumschaltung.
  - Die Idee eines Layer-Panels als primäres Objektmodell im Editor.
  - Die Idee einer Capture-/Proof-Generierung aus dem Editorzustand.
  - Die Idee einer einfachen Benutzerauth getrennt vom Canvas selbst.
  - Die Idee einer initialen Preisabfrage getrennt vom eigentlichen Designer.
  - Die Idee einer project-Domäne, die getrennt von order bleibt.
  - Die Idee, dass Produktbilder und Benutzeruploads nicht im gleichen UI-Kontext wie technische Druckdaten behandelt werden sollten.
  - Die Idee, dass der Editor einen klaren Service-Layer haben soll und nicht nur Komponentenlogik.

  ## 8. Was aus print-designer bewusst nicht übernommen wird

  - Nicht der Vue CLI-Build.
  - Nicht Vuex als State-Layer.
  - Nicht Payload als Kern-Domänenmodell.
  - Nicht MongoDB als Primärspeicher.
  - Nicht Orders als gleichzeitig Produktions- und Kommunikationsobjekt.
  - Nicht json als undifferenziertes Codefeld im Projekt.
  - Nicht der E-Mail-ZIP-Workflow.
  - Nicht die enge Koppelung von Capture-Upload und Order-Erzeugung.
  - Nicht die harte Front/Back-Spezialisierung.
  - Nicht das Modell, dass Previews im selben Schritt wie Produktionslogik entstehen.
  - Nicht das Sicherheitsmodell mit nur admin und user.
  - Nicht die implizite Versionierung über Überschreiben desselben Projekts.

  ## 9. Was das Laravel/Vue2/Fabric-Repo tatsächlich zeigt

  - Das zweite Repo beschreibt sich selbst als Canva Clone.
  - Referenz: README.md (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/README.md)
  - Es basiert auf Laravel 8, PHP 7.3|8.0, Vue 2, Laravel Mix, Bootstrap 4.
  - Referenz: composer.json (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/composer.json)
  - Referenz: package.json (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/package.json)
  - Die Routen zeigen Fokus auf templates, favorites, search, profile, chat, messages.
  - Referenz: routes/web.php (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/routes/web.php)
  - Inferenz: Das Repo ist als kreativer Design-Workspace interessant.
  - Inferenz: Das Repo ist deutlich weniger nah an Web2Print Product + Project + Order + Pricing als print-designer.
  - Inferenz: Das Repo ist deshalb nicht unser Seed.

  ## 10. Produktdefinition von Flow2Print

  - Flow2Print ist eine Open-Source-Web2Print-Plattform.
  - Flow2Print ist kein Shop-System.
  - Flow2Print ist kein Page-Builder.
  - Flow2Print ist kein CMS.
  - Flow2Print ist kein DAM im Vollausbau.
  - Flow2Print ist kein generischer Grafikeditor ohne Produktregeln.
  - Flow2Print nimmt einen Produktkontext entgegen.
  - Flow2Print erzwingt Template- und Designregeln.
  - Flow2Print verwaltet Projekte und Versionen.
  - Flow2Print erzeugt Previews, Proofs und Produktionsdateien.
  - Flow2Print validiert Druck- und Produktregeln.
  - Flow2Print verknüpft Projekte mit externen Commerce-Vorgängen.
  - Flow2Print soll B2B- und B2C-Flows gleichzeitig bedienen.
  - Flow2Print soll self-hosted installierbar sein.
  - Flow2Print soll offen genug sein, dass später weitere Connectoren neben Magento entstehen können.

  ## 11. Was ausdrücklich in Scope ist

  - Produktmodellierung für druckbare Produkte.
  - Template-Modellierung.
  - Designer für Flat Print.
  - Designer für Apparel Print Zones.
  - Designer für Packaging Surfaces.
  - Projektspeicherung.
  - Projektversionierung.
  - Finalisierung und Immutability.
  - Preview-Erzeugung.
  - Produktionsdatei-Erzeugung.
  - Basis-Preflight.
  - Approval-Status in einfacher Form.
  - Asset-Uploads und Asset-Metadaten.
  - Gast- und Benutzerflüsse.
  - Multi-Organization-Fähigkeit.
  - Magento-2-Connector.
  - APIs und Webhooks.
  - Dokumentierte Self-hosted-Installation.
  - Dokumentiertes lokales Demo-Setup.
  - Öffentliche OpenAPI- und JSON-Schema-Verträge.

  ## 12. Was ausdrücklich nicht in v1 Scope ist

  - Ein eigener Voll-Checkout.
  - Ein eigener Produktkatalog-Shop.
  - Ein generischer 3D-Editor.
  - Parametrische CAD-Konstruktion von Verpackungen.
  - Realtime-Multiuser-Co-Editing wie Figma.
  - Vollautomatische PDF/X-4-Zertifizierung.
  - Vollständige CMYK-Live-Editing-Simulation im Browser.
  - Tiefes MIS/ERP-Standardbundle in v1.
  - KI-Generierung als Kernfeature.
  - Ein vollwertiges DAM als eigenständiges Produkt.
  - Ein Marketplace für Templates.
  - On-the-fly-Fonts beliebiger Endnutzer im öffentlichen B2C-Flow.
  - Eine Marketplace-optimierte Magento-Extension als erstes Ziel.
  - Reines Iframe-Embedding als Primär-Integrationsmodus.

  ## 13. Leitprinzipien des technischen Konzepts

  - Der Kern wird um wenige stabile Fachobjekte gebaut.
  - Das UI wird nicht zum Systemvertrag.
  - Fabric.js wird nicht zum Persistenzvertrag.
  - Magento 2 wird nicht zum Besitzer von Designlogik.
  - Flow2Print wird nicht vom Connector abhängig.
  - Versionierte Dokumente sind der wichtigste Stabilitätspunkt.
  - Worker dürfen ausfallen, ohne dass Projekte korrupt werden.
  - Jede Finalisierung ist idempotent.
  - Jede Commerce-Synchronisation ist idempotent.
  - Jeder Output ist auf eine konkrete Projektversion rückverfolgbar.
  - Jedes Artefakt ist auf eine konkrete Blueprint- und Template-Version rückverfolgbar.
  - Jede API ist versionsfähig.
  - Jeder asynchrone Ablauf hat einen sichtbaren Job-Status.
  - Jedes öffentliche Objekt hat tenant-Kontext.
  - Jeder Seed-Einfluss aus print-designer wird in ein robusteres Modell überführt.
  - Self-hosted-Komplexität wird aktiv begrenzt.
  - Deshalb wird v1 ohne verpflichtendes OpenSearch und ohne verpflichtendes Temporal geplant.
  - Technologieentscheidungen sollen Community-Contribution erleichtern.
  - Deshalb wird TypeScript über Frontend und Backend hinweg vereinheitlicht.
  - Deshalb bleibt das Magento-Modul in einem separaten PHP-Repo.

  ## 14. Technologiestack für Flow2Print Platform

  - Runtime für Node-Services: Node.js 24 Active LTS.
  - Quelle: Node.js Releases (https://nodejs.org/en/about/previous-releases)
  - Frontend-Basis: React 19.
  - Quelle: React docs (https://react.dev/)
  - Build-Tool für Frontends: Vite.
  - Quelle: Vite docs (https://vite.dev/guide/)
  - Frontend-Sprache: TypeScript.
  - Styling: Tailwind CSS.
  - Primitive UI-Komponenten: Radix UI.
  - Form-Handling: react-hook-form.
  - Validierung im Frontend: Zod.
  - Client-Side Routing: React Router.
  - Server-State und Caching: TanStack Query.
  - Lokaler App-State für Editor und Shell: Zustand.
  - Internationalisierung: i18next plus react-i18next.
  - Tabellen und Listen: TanStack Table.
  - Canvas-Engine im Editor: Fabric.js.
  - Barcode-Generierung: bwip-js.
  - QR-Code-Generierung: qrcode.
  - Backend-Framework: NestJS.
  - Quelle: NestJS docs (https://docs.nestjs.com/)
  - HTTP-Adapter: Fastify unter Nest.
  - API-Dokumentation: OpenAPI.
  - API-Client-Generierung: openapi-typescript.
  - Datenbank: PostgreSQL 18.
  - Quelle: PostgreSQL docs (https://www.postgresql.org/docs/current/)
  - ORM und Migrationswerkzeug: Prisma.
  - Queue-Broker: RabbitMQ.
  - Quelle: RabbitMQ docs (https://www.rabbitmq.com/docs)
  - Cache und Distributed Locks: Redis.
  - Objekt-Storage: MinIO oder kompatibler S3-Storage.
  - Referenzdoku: MinIO docs (https://min.io/docs/minio/linux/index.html)
  - Suchbasis in v1: PostgreSQL Full Text Search + pg_trgm.
  - JSON-Schema-Validierung im Backend: AJV.
  - PDF-Erzeugung: PDFKit.
  - SVG-nach-PDF-Einbettung: svg-to-pdfkit.
  - Font-Embedding und Font-Metadaten: fontkit.
  - Bildverarbeitung: Sharp.
  - PDF-Nachverarbeitung und Strukturprüfungen: qpdf.
  - PDF-Raster-Previews und bestimmte Konvertierungen: Ghostscript.
  - Observability-Tracing: OpenTelemetry.
  - Metriken: Prometheus.
  - Dashboards: Grafana.
  - Logs: Loki.
  - Distributed Traces UI: Tempo.
  - Dokumentationssite: Docusaurus.
  - CI: GitHub Actions.
  - Dependency Automation: Renovate.
  - Release-Management: Changesets.
  - Security-Scans: Trivy.
  - Statische Analyse TypeScript: eslint + typescript-eslint.
  - Formatierung: Prettier.
  - Test Runner JS/TS: Vitest.
  - E2E im Browser: Playwright.

  ## 15. Technologiestack für Magento 2 Connector

  - Sprache: PHP.
  - Zielsystem: Magento Open Source 2.4.8 als Primär-Supportlinie.
  - Quelle: Magento Open Source 2.4.8 release notes (https://experienceleague.adobe.com/en/docs/commerce-operations/release/notes/magento-open-source/2-4-8)
  - Paketierung: Composer.
  - Modulstruktur: natives Magento 2 Modul.
  - API-Kommunikation zu Flow2Print: REST.
  - Signierte Rückrufe: HMAC SHA-256.
  - OAuth-ähnliche Machine Credentials oder statische API-Credentials pro Installation.
  - Tests: PHPUnit.
  - Static Analysis: PHPStan.
  - Coding Standard: PHPCS.
  - Admin-Konfiguration: system.xml.
  - Persistenz von Referenzen: quote item options, order item product_options, plus eigene Ledger-Tabellen.
  - Keine Design-Daten-Persistenz in Magento.
  - Keine Render-Pipeline in Magento.
  - Keine PDF-Generierung in Magento.

  ## 16. Warum React statt Vue im Zielsystem

  - print-designer nutzt Vue 3, Quasar und Vuex.
  - Referenz: src/app/package.json (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/package.json)
  - Die Entscheidung gegen direkten Vue-Weiterbau ist bewusst.
  - Wir wollen den Seed nur konzeptionell verwenden.
  - React 19 ist für ein offenes Produkt mit eigenem Portal, Designer und Admin eine stabile, gut beitragbare Basis.
  - React empfiehlt für größere Apps Frameworks oder etablierte App-Strukturen.
  - Quelle: react.dev (https://react.dev/)
  - Wir wählen trotzdem nicht Next.js.
  - Der Hauptgrund ist Self-hosted first.
  - Der zweite Hauptgrund ist Redirect-first-Integration mit Magento.
  - Der dritte Hauptgrund ist, dass wir keinen SEO-lastigen Public-Shop bauen.
  - Ein Vite-basierter SPA-Ansatz vereinfacht Betrieb und Embedding deutlich.
  - Die eigentliche Businesslogik sitzt ohnehin in den Backend-Services.
  - Das Portal braucht kein SSR als Kernvorteil.
  - Der Designer braucht vor allem deterministische clientseitige Interaktion.
  - Deshalb gewinnt React + Vite hier gegen Next.js.
  - Deshalb gewinnen React + Vite hier auch gegen einen direkten Vue-Fork.

  ## 17. Warum PostgreSQL statt MongoDB

  - print-designer benutzt MongoDB über Payload.
  - Referenz: payload.config.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/payload.config.ts)
  - MongoDB ist für den Seed okay.
  - Für Flow2Print brauchen wir aber stärkere relationale Regeln.
  - Wir brauchen Organization, Membership, Blueprint, Template, Project, ProjectVersion, OutputJob, CommerceLink.
  - Wir brauchen eindeutige Composite Constraints.
  - Wir brauchen JSONB zusätzlich zu relationalen Joins.
  - Wir brauchen starke Transaktionen rund um Finalize, Export und Commerce Sync.
  - Wir brauchen Audit- und Statusabfragen über viele Tabellen hinweg.
  - PostgreSQL passt dafür besser.
  - PostgreSQL bleibt trotzdem flexibel genug für schemareiche JSON-Dokumente.
  - PostgreSQL 18 ist aktuell dokumentiert.
  - Quelle: PostgreSQL docs (https://www.postgresql.org/docs/current/)

  ## 18. Warum REST + OpenAPI statt GraphQL als Hauptvertrag

  - Der externe Magento-Connector profitiert von stabilen, dokumentierten Request/Response-Schemas.
  - Der interne Plattformkern profitiert ebenfalls davon.
  - Jobs und Webhooks brauchen klare Versionierung.
  - Ein Open-Source-Projekt profitiert von generierbaren SDKs.
  - OpenAPI passt dafür sehr gut.
  - GraphQL ist nicht verboten.
  - GraphQL ist aber in v1 kein Primärvertrag.
  - Der Aufwand für Schema-Evolution, Auth-Policies und Debugging würde in v1 wenig echten Nutzen bringen.
  - Interne Aggregationen laufen über edge-api und Read-Models.
  - Externe Integration läuft über REST.
  - Offizielle API-Dokumentation wird als OpenAPI veröffentlicht.
  - Clients werden daraus generiert.

  ## 19. Repositorien und Ownership

  - Es gibt nicht ein einziges Repo für alles.
  - Es gibt zwei Haupt-Repositorien.
  - Repo 1 heißt flow2print-platform.
  - Repo 2 heißt flow2print-magento2-connector.
  - Optional kann später ein drittes Demo-Repo entstehen.
  - Das Demo-Repo wäre flow2print-demo-stack.
  - Das Plattform-Repo enthält alle JavaScript- und TypeScript-Komponenten.
  - Das Connector-Repo enthält nur PHP- und Magento-spezifische Artefakte.
  - Diese Trennung verhindert Toolchain-Konflikte.
  - Diese Trennung vereinfacht Releases.
  - Diese Trennung vereinfacht Contributor-Onboarding.
  - Diese Trennung verhindert, dass Magento-Entwicklungszyklen die Plattform blockieren.
  - Diese Trennung verhindert, dass Plattform-Releases Composer und npm unglücklich mischen.
  - Das Plattform-Repo ist die Referenz für Architektur und APIs.
  - Das Connector-Repo folgt einer dokumentierten Kompatibilitätsmatrix.

  ## 20. Struktur von flow2print-platform

  flow2print-platform/
    apps/
      designer-web/
      portal-web/
      edge-api/
      identity-service/
      catalog-service/
      template-service/
      project-service/
      asset-service/
      production-service/
      commerce-connector-service/
      render-worker/
      preflight-worker/
      docs-site/
    packages/
      config/
      logging/
      auth-sdk/
      http-sdk/
      event-contracts/
      design-document/
      editor-engine/
      pricing-signals/
      ui-kit/
      testing/
    schemas/
      openapi/
      jsonschema/
      events/
    infra/
      compose/
      helm/
      k8s/
      observability/
    docs/
      adr/
      architecture/
      api/
      product/
      operations/
      contributor-guide/
    scripts/
    .github/
    package.json
    pnpm-workspace.yaml
    turbo.json
    changeset/
    README.md
    LICENSE

  ## 21. Struktur von flow2print-magento2-connector

  flow2print-magento2-connector/
    app/
      code/
        Flow2Print/
          Connector/
            Api/
            Api/Data/
            Block/
            Console/
            Cron/
            Controller/
            etc/
            Helper/
            Model/
            Observer/
            Plugin/
            Setup/
            Ui/
            view/
    dev/
      tests/
    docs/
    composer.json
    phpstan.neon
    phpunit.xml.dist
    README.md
    CHANGELOG.md
    LICENSE

  ## 22. Paketierungs- und Build-Strategie im Plattform-Repo

  - Package-Manager: pnpm.
  - Monorepo-Orchestrierung: Turborepo.
  - Jedes app-Verzeichnis ist ein deploybares Artefakt.
  - Jedes package-Verzeichnis ist wiederverwendbare Shared-Logik.
  - schemas/openapi enthält exportierte OpenAPI-Snapshots.
  - schemas/jsonschema enthält exportierte JSON-Schemas.
  - schemas/events enthält Event-Verträge.
  - design-document ist das wichtigste Shared-Package.
  - editor-engine enthält die Fabric-Adapter und Dokument-Mapping-Logik.
  - event-contracts enthält Topics, Payload-Types und Idempotency-Metadaten.
  - http-sdk enthält generierte TypeScript-Clients.
  - auth-sdk enthält OIDC- und Session-Helfer.
  - pricing-signals enthält gemeinsame Typen für Commerce-Signale.
  - ui-kit enthält Shell-Komponenten, Form-Patterns und Tabellen.
  - testing enthält Fixtures, Factory-Helfer und API-Mocks.

  ## 23. Release-Strategie

  - Das Plattform-Repo bekommt semantische Versionen.
  - Das Connector-Repo bekommt semantische Versionen.
  - Breaking API-Änderungen erhöhen die Major-Version.
  - Änderungen am Flow2Print Document Schema erhöhen die Minor- oder Major-Version je nach Kompatibilität.
  - Jeder Release-Tag publiziert eine Kompatibilitätsmatrix.
  - Die Matrix listet platform version, connector version, document schema version.
  - Der Magento-Connector referenziert unterstützte Plattform-Majors explizit.
  - Changesets steuern Changelog und Paketversionen.
  - Jede öffentlich sichtbare API-Änderung braucht einen Eintrag in docs/adr oder docs/api/changelog.

  ## 24. Bounded Contexts des Plattform-Kerns

  - Identity
  - Catalog
  - Template
  - Project
  - Asset
  - Production
  - Commerce Integration
  - Portal Read Models
  - Diese Bounded Contexts bilden die Service-Grenzen.
  - Diese Bounded Contexts bilden auch die Owner-Grenzen.
  - Kein Service besitzt Tabellen außerhalb seines Kontextes.
  - Cross-Service-Abfragen laufen über APIs oder Event-getriebene Read-Models.
  - Gemeinsame Libraries teilen nur Typen und Hilfsfunktionen.
  - Gemeinsame Libraries teilen keine stillen fachlichen Zustände.

  ## 25. Service 1: edge-api

  - edge-api ist der Frontdoor-Service für Browser-Clients.
  - edge-api validiert Benutzer- und Gast-Tokens.
  - edge-api routet Requests an die Kernservices.
  - edge-api aggregiert Read-Model-Responses für das Portal.
  - edge-api führt keine fachliche Primärlogik aus.
  - edge-api besitzt keine Primärtabellen.
  - edge-api erzeugt keine Projektdaten.
  - edge-api erzeugt keine Produktionsjobs.
  - edge-api ist BFF und Security-Gateway.
  - edge-api exponiert die externen Browser-APIs.
  - edge-api versteckt interne Service-Topologie.
  - edge-api standardisiert Fehlermeldungen.
  - edge-api standardisiert Pagination, Filtering, Tracing-Headers und Idempotency-Headers.

  ## 26. Service 2: identity-service

  - identity-service besitzt Benutzer und Organisationen.
  - identity-service besitzt Memberships.
  - identity-service besitzt Rollen.
  - identity-service besitzt API-Clients.
  - identity-service besitzt Sessions.
  - identity-service unterstützt local auth.
  - identity-service unterstützt guest identities.
  - identity-service unterstützt OIDC federation.
  - Keycloak ist empfohlener Referenz-IdP für Enterprise-SSO.
  - Quelle: Keycloak docs (https://www.keycloak.org/documentation)
  - identity-service gibt JWT Access Tokens und Refresh Tokens aus.
  - identity-service mappt externe IdP-Claims auf Plattform-Rollen.
  - identity-service pflegt organization_member-Beziehungen.
  - identity-service publiziert identity.user.created und identity.membership.changed Events.

  ## 27. Service 3: catalog-service

  - catalog-service besitzt ProductBlueprints.
  - catalog-service besitzt BlueprintVersions.
  - catalog-service besitzt Surfaces.
  - catalog-service besitzt OptionGroups.
  - catalog-service besitzt OptionValues.
  - catalog-service besitzt PrintProfiles.
  - catalog-service besitzt MockupSets.
  - catalog-service besitzt PriceInputRules.
  - catalog-service ist nicht Magento.
  - catalog-service hält die interne Produktdefinition für den Designer.
  - Ein Blueprint kann auf mehrere Commerce-Produkte gemappt werden.
  - Ein Commerce-Produkt kann auf eine konkrete BlueprintVersion gemappt werden.
  - catalog-service publiziert catalog.blueprint.published.

  ## 28. Service 4: template-service

  - template-service besitzt Templates.
  - template-service besitzt TemplateVersions.
  - template-service besitzt Placeholder Definitions.
  - template-service besitzt Brand Policies.
  - template-service besitzt Constraint Sets.
  - template-service mappt Templates auf Blueprints.
  - template-service mappt Templates auf Organizations.
  - template-service mappt Templates auf Portals und Kanäle.
  - template-service publiziert template.published.
  - template-service validiert Templates gegen Blueprint-Geometrie.
  - template-service versioniert Templates strikt.
  - Ein Projekt referenziert immer eine konkrete TemplateVersion oder null.

  ## 29. Service 5: project-service

  - project-service besitzt Projects.
  - project-service besitzt ProjectVersions.
  - project-service besitzt ProjectStates.
  - project-service besitzt Approval Requests.
  - project-service besitzt Project Comments nur optional in v1.
  - project-service implementiert Autosave.
  - project-service implementiert explizite Snapshots.
  - project-service implementiert Finalize.
  - project-service implementiert Reopen nicht.
  - project-service implementiert Clone.
  - project-service implementiert Guest-to-User-Reassignment.
  - project-service publiziert project.created.
  - project-service publiziert project.version.saved.
  - project-service publiziert project.finalized.
  - project-service publiziert project.approval.requested.
  - project-service ist der Besitzer des dokumentierten Designzustands.

  ## 30. Service 6: asset-service

  - asset-service besitzt Assets.
  - asset-service besitzt AssetVariants.
  - asset-service besitzt FontFamilies.
  - asset-service besitzt FontFiles.
  - asset-service besitzt ColorProfiles.
  - asset-service schreibt Binärdaten ins Objekt-Storage.
  - asset-service schreibt Metadaten nach PostgreSQL.
  - asset-service erzeugt Thumbnails und Web-Varianten.
  - asset-service liest EXIF und Bildmaße aus.
  - asset-service klassifiziert MIME-Typen.
  - asset-service unterstützt image, svg, pdf asset, font asset, technical asset.
  - asset-service publiziert asset.uploaded.
  - asset-service publiziert asset.variant.ready.

  ## 31. Service 7: production-service

  - production-service orchestriert Previews, Proofs und Produktionsdateien.
  - production-service besitzt OutputJobs.
  - production-service besitzt OutputArtifacts.
  - production-service besitzt PreflightReports.
  - production-service besitzt PreflightIssues.
  - production-service enqueued Jobs für render-worker.
  - production-service enqueued Jobs für preflight-worker.
  - production-service verwaltet den Job-Status.
  - production-service erzeugt keine Designdokumente.
  - production-service konsumiert finale oder explizit angeforderte Projektversionen.
  - production-service publiziert production.preview.completed.
  - production-service publiziert production.export.completed.
  - production-service publiziert preflight.completed.

  ## 32. Service 8: commerce-connector-service

  - commerce-connector-service verwaltet externe Commerce-Systeme.
  - commerce-connector-service verwaltet Connector-Konfigurationen.
  - commerce-connector-service verwaltet CommerceLinks.
  - commerce-connector-service verwaltet LaunchSessions.
  - commerce-connector-service verwaltet externe Quote- und Order-Referenzen.
  - commerce-connector-service verwaltet Webhook- und Callback-Logs.
  - commerce-connector-service ist nicht Magento-spezifisch im Kern.
  - commerce-connector-service bekommt aber in v1 einen offiziellen Magento 2-Adapter.
  - commerce-connector-service publiziert commerce.launch.created.
  - commerce-connector-service publiziert commerce.quote.linked.
  - commerce-connector-service publiziert commerce.order.linked.

  ## 33. Worker 1: render-worker

  - render-worker konsumiert Render-Kommandos.
  - render-worker erzeugt PNG/WebP-Previews.
  - render-worker erzeugt Proof-PDFs.
  - render-worker erzeugt Produktions-PDFs.
  - render-worker zieht Fonts und Assets über interne APIs oder signierte URLs.
  - render-worker schreibt Artefakte in das Objekt-Storage.
  - render-worker schreibt keine Projektzustände.
  - render-worker schreibt nur Job-Ergebnisse zurück an production-service.
  - render-worker ist horizontal skalierbar.
  - render-worker ist stateless.

  ## 34. Worker 2: preflight-worker

  - preflight-worker konsumiert Preflight-Kommandos.
  - preflight-worker validiert Dokumentregeln.
  - preflight-worker validiert Assetregeln.
  - preflight-worker validiert Druckprofilregeln.
  - preflight-worker validiert Packaging-spezifische technische Regeln.
  - preflight-worker validiert Apparel-Zonenregeln.
  - preflight-worker erzeugt Issues mit Severity.
  - preflight-worker schreibt Reports an production-service.
  - preflight-worker ist horizontal skalierbar.
  - preflight-worker ist stateless.

  ## 35. Datenbankstrategie

  - Eine PostgreSQL-Instanz pro Deployment.
  - Ein Schema pro Service-Kontext.
  - identity Schema.
  - catalog Schema.
  - template Schema.
  - project Schema.
  - asset Schema.
  - production Schema.
  - integration Schema.
  - Jeder Service besitzt seine eigenen Prisma-Migrations.
  - Cross-Schema-Lesezugriffe werden vermieden.
  - Für sehr simple Referenzprüfungen sind DB-FKs über Schema-Grenzen nicht die Standardstrategie.
  - Service-Verantwortung geht vor globaler Datenbankbequemlichkeit.
  - Eindeutige IDs sind UUIDv7.
  - Öffentliche IDs dürfen UUIDs oder präfixierte ULIDs sein.
  - Menschliche Slugs bleiben zusätzlich möglich.
  - Große JSON-Dokumente liegen als JSONB in project.project_versions.
  - Finale Snapshots werden zusätzlich im Objekt-Storage archiviert.
  - Das reduziert Risiko bei späteren Migrationsschritten.
  - Das verbessert die Reproduzierbarkeit von Exports.

  ## 36. Objekt-Storage-Strategie

  - Bucket assets-original.
  - Bucket assets-derived.
  - Bucket project-snapshots.
  - Bucket output-previews.
  - Bucket output-proofs.
  - Bucket output-production.
  - Bucket output-technical.
  - Asset-URLs werden nie dauerhaft öffentlich.
  - Browser-Downloads laufen über signierte Kurzzeit-URLs.
  - Interne Worker dürfen Service-Credentials oder interne URLs verwenden.
  - Jeder Artefakt-Key enthält tenant, object type, id, hash.
  - Objekt-Storage wird nicht als Primärindex für Abfragen missbraucht.
  - Metadaten bleiben in PostgreSQL.

  ## 37. Eventing-Strategie

  - RabbitMQ-Exchange flow2print.events.v1.
  - RabbitMQ-Exchange flow2print.commands.v1.
  - Jeder Service besitzt eine Outbox-Tabelle.
  - Jeder publizierte Event kommt aus einer Transaktion mit Outbox.
  - Ein separater Outbox-Publisher liest und veröffentlicht zuverlässig.
  - Event-Envelope enthält eventId.
  - Event-Envelope enthält eventType.
  - Event-Envelope enthält occurredAt.
  - Event-Envelope enthält tenantId.
  - Event-Envelope enthält actor.
  - Event-Envelope enthält traceId.
  - Event-Envelope enthält schemaVersion.
  - Event-Envelope enthält payload.
  - Jeder Consumer speichert processed_event_id für Idempotenz.
  - Commands werden über dedizierte Queues und Retry/Dead-Letter-Queues zugestellt.
  - Dead-Letter-Queues werden im Ops-Dashboard sichtbar gemacht.

  ## 38. Standard-Events

  - identity.user.created
  - identity.membership.changed
  - catalog.blueprint.published
  - template.published
  - project.created
  - project.version.saved
  - project.finalized
  - project.approval.requested
  - asset.uploaded
  - asset.variant.ready
  - production.preview.requested
  - production.preview.completed
  - production.export.requested
  - production.export.completed
  - preflight.requested
  - preflight.completed
  - commerce.launch.created
  - commerce.quote.linked
  - commerce.order.linked
  - commerce.sync.failed

  ## 39. Kernobjekt 1: Organization

  - id
  - slug
  - displayName
  - type
  - status
  - defaultLocale
  - defaultCurrency
  - timezone
  - brandingConfig
  - settingsJson
  - createdAt
  - updatedAt
  - type erlaubt mindestens public_store, b2b_org, internal_demo.
  - Jede Fachdatenzeile bekommt tenantId.
  - B2C-Installationen können mit einer öffentlichen Default-Organisation starten.

  ## 40. Kernobjekt 2: User

  - id
  - email
  - passwordHash nur bei lokaler Auth
  - displayName
  - status
  - type
  - lastLoginAt
  - createdAt
  - updatedAt
  - type erlaubt mindestens guest, customer, member, service_account.
  - Gäste bekommen einen Benutzer- oder Identitätseintrag mit eingeschränkten Rechten.
  - Gäste können in registrierte Kunden überführt werden.

  ## 41. Kernobjekt 3: OrganizationMembership

  - id
  - tenantId
  - userId
  - role
  - portalAccess
  - status
  - createdAt
  - updatedAt
  - Rollenminimum in v1:
  - org_owner
  - org_admin
  - brand_manager
  - designer
  - buyer
  - approver
  - viewer

  ## 42. Kernobjekt 4: ProductBlueprint

  - id
  - tenantId
  - slug
  - displayName
  - kind
  - status
  - latestVersionId
  - defaultPrintProfileId
  - defaultApprovalPolicy
  - createdAt
  - updatedAt
  - kind erlaubt mindestens flat, apparel, packaging.
  - Das Objekt ist die Flow2Print-interne Produktdefinition.
  - Es ist nicht identisch zu Magento-SKU.

  ## 43. Kernobjekt 5: BlueprintVersion

  - id
  - blueprintId
  - version
  - status
  - surfacesJson
  - optionsJson
  - mockupConfigJson
  - printProfileId
  - pricingSignalsConfigJson
  - publishedAt
  - createdBy
  - createdAt
  - status erlaubt draft, published, archived.
  - Projekte referenzieren immer eine konkrete BlueprintVersion.

  ## 44. Kernobjekt 6: Surface

  - id
  - blueprintVersionId
  - key
  - label
  - surfaceType
  - artboardWidthMm
  - artboardHeightMm
  - bleedBoxJson
  - safeBoxJson
  - maskAssetId
  - technicalOverlayAssetId
  - previewBackgroundAssetId
  - printAreaJson
  - zIndex
  - surfaceType erlaubt page, print_zone, packaging_face, technical_sheet.
  - front/back aus print-designer wird hier generalisiert zu surfaces.

  ## 45. Kernobjekt 7: OptionGroup

  - id
  - blueprintVersionId
  - key
  - label
  - selectionType
  - required
  - displayOrder
  - visibilityRuleJson
  - pricingSignalRuleJson
  - selectionType erlaubt single, multi, quantity, text, color.

  ## 46. Kernobjekt 8: OptionValue

  - id
  - optionGroupId
  - key
  - label
  - valueJson
  - displayOrder
  - availabilityRuleJson
  - pricingSignalDeltaJson

  ## 47. Kernobjekt 9: PrintProfile

  - id
  - tenantId
  - slug
  - displayName
  - targetDpi
  - allowedColorModes
  - bleedRequired
  - safeMarginMm
  - allowTransparentBackground
  - pdfOutputPreset
  - imageUpscalePolicy
  - fontEmbeddingPolicy
  - technicalLayerPolicy
  - createdAt
  - updatedAt

  ## 48. Kernobjekt 10: Template

  - id
  - tenantId
  - slug
  - displayName
  - blueprintId
  - status
  - latestVersionId
  - visibilityScope
  - createdAt
  - updatedAt

  ## 49. Kernobjekt 11: TemplateVersion

  - id
  - templateId
  - version
  - documentSeedJson
  - constraintSetJson
  - brandPolicyJson
  - placeholderMapJson
  - status
  - publishedAt
  - createdAt
  - Projekte referenzieren genau eine TemplateVersion oder null.
  - Template-Snapshots sind immutable.

  ## 50. Kernobjekt 12: Project

  - id
  - tenantId
  - ownerIdentityId
  - blueprintVersionId
  - templateVersionId
  - status
  - title
  - channel
  - origin
  - activeVersionId
  - approvalState
  - commerceLinkId
  - createdAt
  - updatedAt
  - origin erlaubt portal, magento, api.
  - status erlaubt draft, finalized, ordered, archived.
  - approvalState erlaubt not_required, pending, approved, rejected.

  ## 51. Kernobjekt 13: ProjectVersion

  - id
  - projectId
  - versionNumber
  - documentJson
  - documentHash
  - snapshotObjectKey
  - isFinal
  - createdBy
  - createdAt
  - basedOnVersionId
  - changeSummary
  - documentJson ist das versionierte Flow2Print-Dokument.
  - documentHash ermöglicht Reproduzierbarkeit.
  - snapshotObjectKey referenziert den archivierten JSON-Snapshot.
  - Finale Versionen sind immutable.

  ## 52. Kernobjekt 14: Asset

  - id
  - tenantId
  - kind
  - ownerIdentityId
  - originalObjectKey
  - mimeType
  - filename
  - sizeBytes
  - widthPx
  - heightPx
  - dpiX
  - dpiY
  - iccProfileRef
  - sha256
  - createdAt
  - kind erlaubt image, svg, pdf, font, technical.

  ## 53. Kernobjekt 15: AssetVariant

  - id
  - assetId
  - variantKind
  - objectKey
  - widthPx
  - heightPx
  - metadataJson
  - createdAt
  - variantKind erlaubt thumb, preview, web, technical-preview, normalized.

  ## 54. Kernobjekt 16: OutputJob

  - id
  - tenantId
  - projectVersionId
  - jobType
  - status
  - requestedBy
  - requestedAt
  - startedAt
  - completedAt
  - errorCode
  - errorMessage
  - jobType erlaubt preview, proof_pdf, production_pdf, preflight.
  - status erlaubt queued, running, succeeded, failed, cancelled.

  ## 55. Kernobjekt 17: OutputArtifact

  - id
  - outputJobId
  - artifactType
  - objectKey
  - mimeType
  - byteSize
  - pageCount
  - metadataJson
  - createdAt
  - artifactType erlaubt preview_png, preview_webp, proof_pdf, production_pdf, surface_png, technical_pdf.

  ## 56. Kernobjekt 18: PreflightReport

  - id
  - outputJobId
  - projectVersionId
  - status
  - summaryJson
  - createdAt
  - status erlaubt pass, warn, fail.

  ## 57. Kernobjekt 19: PreflightIssue

  - id
  - reportId
  - surfaceKey
  - issueCode
  - severity
  - message
  - objectRef
  - suggestion
  - detailsJson
  - severity erlaubt info, warning, blocking.

  ## 58. Kernobjekt 20: CommerceLink

  - id
  - tenantId
  - connectorType
  - externalStoreId
  - externalProductRef
  - externalCustomerRef
  - externalQuoteRef
  - externalOrderRef
  - projectId
  - state
  - returnUrl
  - launchTokenHash
  - createdAt
  - updatedAt
  - connectorType erlaubt in v1 mindestens magento2.

  ## 59. Dokument-Schema: Grundsatz

  - Das persistierte Dokument heißt Flow2Print Document.
  - Das Dokument ist versioniert.
  - Das Dokument ist nicht rohes Fabric JSON.
  - Das Dokument wird als JSON Schema veröffentlicht.
  - Das Dokument ist die wichtigste Kompatibilitätsgrenze des Produkts.
  - Das Dokument wird vom Editor gelesen und geschrieben.
  - Das Dokument wird vom Renderer gelesen.
  - Das Dokument wird vom Preflight gelesen.
  - Das Dokument wird vom Connector nicht interpretiert.
  - Der Connector kennt nur Referenzen und Status.

  ## 60. Dokument-Schema: Wichtige Root-Felder

  - schemaVersion
  - projectId
  - projectVersionId
  - tenantId
  - blueprintVersionId
  - templateVersionId
  - locale
  - currency
  - units
  - surfaces
  - assets
  - variables
  - metadata
  - createdFrom
  - renderHints
  - units ist immer mm.
  - Rotationen bleiben in Grad.
  - Farben werden im Dokument in UI-lesbarer Form abgelegt.
  - Produktionsprofile definieren später die konkrete Ausgabeinterpretation.

  ## 61. Dokument-Schema: Beispiel

  {
    "schemaVersion": "1.0.0",
    "projectId": "prj_01JZ...",
    "projectVersionId": "prv_01JZ...",
    "tenantId": "org_01JZ...",
    "blueprintVersionId": "bpv_01JZ...",
    "templateVersionId": "tpv_01JZ...",
    "locale": "de-DE",
    "currency": "EUR",
    "units": "mm",
    "surfaces": [
      {
        "surfaceId": "front",
        "label": "Front",
        "artboard": { "width": 210, "height": 297 },
        "bleedBox": { "x": 0, "y": 0, "width": 216, "height": 303 },
        "safeBox": { "x": 5, "y": 5, "width": 206, "height": 293 },
        "layers": []
      }
    ],
    "assets": [],
    "variables": {},
    "metadata": {
      "channel": "magento"
    }
  }

  ## 62. Dokument-Schema: Surface-Objekt

  - surfaceId
  - label
  - artboard
  - bleedBox
  - safeBox
  - printArea
  - technicalOverlayRef
  - mockupRef
  - layers
  - flags
  - flags erlaubt mindestens printable, proofOnly, technicalOnly.

  ## 63. Dokument-Schema: Layer-Typen

  - text
  - image
  - shape
  - svg
  - group
  - barcode
  - qr
  - placeholder
  - technical
  - cutline
  - foldline
  - gluezone
  - text und image sind die häufigsten Typen.
  - technical, cutline, foldline, gluezone sind normal nicht benutzereditierbar.

  ## 64. Dokument-Schema: Gemeinsame Layer-Felder

  - id
  - type
  - name
  - visible
  - locked
  - x
  - y
  - width
  - height
  - rotation
  - opacity
  - blendMode
  - zIndex
  - constraints
  - metadata
  - Alle Koordinaten sind in mm.
  - Alle Größen sind kanonisch, nicht nur CSS-Pixel.
  - Das erleichtert Rendern und Preflight.

  ## 65. Dokument-Schema: Text-Layer-Felder

  - text
  - fontFamilyRef
  - fontStyle
  - fontWeight
  - fontSizePt
  - lineHeight
  - letterSpacing
  - textAlign
  - color
  - textTransform
  - overflowPolicy
  - allowAutoFit
  - maxLines
  - placeholderBinding

  ## 66. Dokument-Schema: Image-Layer-Felder

  - assetRef
  - crop
  - fitMode
  - dpiEstimate
  - backgroundRemovalState
  - colorAdjustments
  - maskRef
  - placeholderBinding
  - fitMode erlaubt contain, cover, stretch, manual.

  ## 67. Dokument-Schema: Variable Bindings

  - Variable Bindings erlauben CSV- oder Datensatzerweiterung später.
  - In v1 werden sie im Datenmodell vorbereitet.
  - Vollständige Batch-Personalisierung ist nicht Kern von v1.
  - Platzhalter können aber bereits eindeutige bindingKeys tragen.
  - Das verhindert spätere Datenmodellbrüche.

  ## 68. Editor-Engine: Grundsatz

  - Die Editor-Engine hat drei Ebenen.
  - Ebene 1 ist das persistierte Flow2Print Document.
  - Ebene 2 ist ein internes Editor Scene Model.
  - Ebene 3 ist die Fabric.js-Darstellung.
  - Das Dokument wird nie direkt als Fabric-Persistenzvertrag benutzt.
  - Die Engine mappt Dokument -> Scene -> Fabric.
  - Die Engine mappt Fabric-Änderungen zurück nach Scene -> Dokument.
  - Diese Zwischenschicht ist Pflicht.
  - Sonst bleibt das ganze Produkt von Fabric-Interna abhängig.
  - Genau das wollen wir vermeiden.

  ## 69. Editor-Engine: Packages

  - Package design-document enthält Typen und AJV-Schemas.
  - Package editor-engine enthält Mapper, Commands, Undo/Redo, Surface-Helfer.
  - Package ui-kit enthält Panel-Komponenten.
  - designer-web konsumiert diese Pakete.
  - render-worker konsumiert design-document.
  - preflight-worker konsumiert design-document.

  ## 70. designer-web: Routen

  - /designer/launch/:launchToken
  - /designer/project/:projectId
  - /designer/project/:projectId/version/:projectVersionId
  - /designer/reorder/:commerceLinkId
  - /designer/demo/:blueprintId
  - Die Launch-Route ist die Standardroute aus Magento.
  - Die Reorder-Route lädt ein geklontes finales Projekt.
  - Die Demo-Route dient Open-Source-Demos.

  ## 71. portal-web: Routen

  - /login
  - /projects
  - /projects/:id
  - /outputs
  - /products
  - /blueprints
  - /templates
  - /assets
  - /organizations
  - /integrations
  - /settings
  - /approvals
  - portal-web bedient Admin und Endkunden über Rollen.
  - Wir bauen nicht zwei getrennte Portale, sondern ein Rollen-Portal.
  - Das reduziert Pflegeaufwand.

  ## 72. Editor-UI: Hauptpanels

  - Surface Navigator
  - Canvas Stage
  - Layers Panel
  - Object Inspector
  - Template Variables Panel
  - Assets Panel
  - Preflight Panel
  - History Panel
  - Output Panel
  - Approval Panel
  - Das Seed-Muster Layers + Controls + Modals bleibt also semantisch erhalten.
  - Referenzidee aus print-designer: App.vue (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/App.vue)

  ## 73. Editor-UI: Flat Print

  - Flat-Produkte zeigen surface tabs.
  - Typische Surfaces sind front, back, inside-left, inside-right.
  - Mehrseitige Produkte benutzen dasselbe Surface-Modell.
  - Eine Broschüre ist intern kein Spezialwesen.
  - Eine Broschüre ist eine Liste von Surfaces/Pages mit demselben Kernformat.
  - In v1 bleibt das UI für mehrseitige Produkte einfacher als InDesign.
  - Der Kern unterstützt aber mehr als nur Front/Back.

  ## 74. Editor-UI: Apparel

  - Apparel-Produkte zeigen print zone tabs.
  - Typische Zonen sind front, back, left_sleeve, right_sleeve, neck_label.
  - Jede Zone hat eigene Geometrie.
  - Jede Zone hat eigenes Mockup.
  - Das Mockup ist ein Visualisierungshintergrund.
  - Das Mockup ist nicht Teil des finalen Produktionsoutputs.
  - Die Produktionsdatei wird pro Zone erzeugt.
  - Das entspricht Print-on-Demand- und DTF-/DTG-Mustern besser.
  - Warp auf Falten und echtes 3D sind in v1 nicht geplant.

  ## 75. Editor-UI: Packaging

  - Packaging-Produkte zeigen faces oder technical surfaces.
  - Ein Dieline-SVG wird im Admin als technische Grundlage hochgeladen.
  - Das System erkennt oder mappt Layer-Namen wie cut, fold, glue, safe, bleed.
  - Technische Linien sind im Editor sichtbar.
  - Technische Linien sind standardmäßig gesperrt.
  - Technische Linien sind im Produktions-PDF je nach Profil ein- oder ausblendbar.
  - Die Bearbeitung bleibt 2D.
  - Ein optionales Mockup-Composite kann später ergänzt werden.
  - v1 baut keine echte 3D-Faltschachtel-Vorschau.

  ## 76. Editor-State-Slices

  - session
  - project
  - surfaces
  - layers
  - selection
  - history
  - assets
  - preflight
  - outputs
  - launchContext
  - ui
  - permissions
  - Diese Slices werden mit Zustand organisiert.
  - Server-State bleibt in TanStack Query.
  - Lokale Interaktionslogik bleibt in Zustand.

  ## 77. Editor-Autosave

  - Autosave wird debounced.
  - Debounce-Zeit ist 5 Sekunden nach letzter relevanter Änderung.
  - Maximaler ungespeicherter Zeitraum ist 30 Sekunden.
  - Autosave erzeugt kein neues ProjectVersion pro Tastendruck.
  - Autosave aktualisiert den aktiven Draft-Stand.
  - Explizites Save Snapshot erzeugt eine neue Version.
  - Finalize erzeugt immer eine neue finale Version.
  - Undo/Redo bleibt lokal innerhalb der Session.
  - Persistentes History-Replay über Sessions hinweg ist nicht v1.

  ## 78. Font-Strategie

  - Fonts werden zentral über asset-service verwaltet.
  - Endnutzer dürfen in v1 keine beliebigen Fonts hochladen.
  - Admins dürfen Font-Familien registrieren.
  - Templates dürfen erlaubte Font-Sets definieren.
  - Das reduziert Lizenz- und Renderingprobleme.
  - Texte referenzieren fontFamilyRef.
  - Proof und Produktionsrendering nutzen dieselbe Fontquelle.
  - Das minimiert Abweichungen.

  ## 79. Asset-Strategie

  - Bilder werden nach Upload normalisiert.
  - Metadaten umfassen width, height, dpi, icc, sha.
  - Previews nutzen abgeleitete Web-Varianten.
  - Exporte nutzen Originale oder normalisierte High-Quality-Varianten.
  - SVGs werden separat behandelt.
  - PDFs als Input-Assets sind v1-seitig primär für technische Overlays und adminseitige Hilfsdaten gedacht.
  - Benutzerseitige PDF-Platzierung wird nicht als Kernflow von v1 priorisiert.

  ## 80. Approval-Strategie

  - Approval ist einfach gehalten.
  - Ein Projekt kann approval required geerbt vom Blueprint oder Template bekommen.
  - Ein Projekt kann pending approval sein.
  - Ein Projekt kann approved sein.
  - Ein Projekt kann rejected sein.
  - Magento darf nur finalisierte und gegebenenfalls freigegebene Projekte bestellen.
  - Parallel-Approval-Ketten sind kein v1-Ziel.
  - Ein linearer Approver reicht für v1.

  ## 81. Preis-Strategie

  - Die finale Verkaufspreisberechnung bleibt bei Magento.
  - Flow2Print berechnet pricing signals.
  - Pricing Signals sind normalisierte Inputs für Magento.
  - Beispiele:
  - surfaceCount
  - pageCount
  - printZonesUsed
  - areaCoverageEstimate
  - hasSpecialInk
  - hasPackagingTechnicalLayer
  - personalizationRecordCount
  - templateTier
  - proofRequested
  - approvalRequired
  - Flow2Print wird nicht zum führenden Verkaufspreis-System.
  - Flow2Print muss aber genug Metadaten liefern, damit Magento sauber preisen kann.

  ## 82. Standardisierte Pricing Signals

  - signal.surface_count
  - signal.page_count
  - signal.zone_count
  - signal.total_print_area_mm2
  - signal.image_count
  - signal.text_count
  - signal.asset_upload_count
  - signal.requires_manual_review
  - signal.proof_mode
  - signal.template_type
  - signal.customization_complexity
  - signal.packaging_face_count
  - signal.apparel_zone_count
  - Diese Signale gehen strukturiert an den Connector.
  - Magento mappt sie auf Preisregeln oder Custom Options.

  ## 83. Launch-Session-Konzept

  - Magento startet nie direkt ein Projekt ohne Launch-Kontext.
  - Magento ruft POST /v1/launch-sessions auf.
  - Flow2Print prüft Connector-Credentials.
  - Flow2Print erzeugt LaunchSession.
  - LaunchSession enthält Produktkontext, Rücksprung-URL, Gast-/Benutzerkontext und TTL.
  - Der Benutzer wird mit einem signierten Launch-Token zum Designer geleitet.
  - Der Designer lädt ausschließlich aus dieser Session.
  - So bleiben Produktkontext und Commerce-Link sauber gebunden.

  ## 84. Beispiel: Launch-Session Request

  {
    "connectorType": "magento2",
    "externalStoreId": "default_store_view",
    "externalProductRef": "SKU-TSHIRT-BLACK",
    "externalVariantRef": "size:l;color:black",
    "customer": {
      "externalCustomerRef": "12345",
      "email": "kunde@example.com",
      "isGuest": false
    },
    "locale": "de-DE",
    "currency": "EUR",
    "returnUrl": "https://shop.example.com/flow2print/return",
    "options": {
      "size": "L",
      "color": "black"
    }
  }

  ## 85. Beispiel: Launch-Session Response

  {
    "launchSessionId": "lsn_01JZ...",
    "projectId": "prj_01JZ...",
    "designerUrl": "https://flow2print.example.com/designer/launch/tkn_01JZ...",
    "expiresAt": "2026-03-06T15:30:00Z"
  }

  ## 86. Externe API-Gruppe: Identity

  - POST /v1/auth/register
  - POST /v1/auth/login
  - POST /v1/auth/refresh
  - POST /v1/auth/logout
  - GET /v1/me
  - POST /v1/oidc/callback
  - POST /v1/guests
  - POST /v1/guests/claim
  - POST /v1/organizations
  - POST /v1/organizations/:id/members
  - PATCH /v1/organizations/:id/members/:memberId
  - DELETE /v1/organizations/:id/members/:memberId

  ## 87. Externe API-Gruppe: Catalog

  - GET /v1/blueprints
  - POST /v1/blueprints
  - GET /v1/blueprints/:id
  - PATCH /v1/blueprints/:id
  - POST /v1/blueprints/:id/versions
  - POST /v1/blueprints/:id/versions/:versionId/publish
  - POST /v1/blueprints/:id/mockups
  - POST /v1/blueprints/:id/surfaces/import-dieline
  - GET /v1/print-profiles
  - POST /v1/print-profiles

  ## 88. Externe API-Gruppe: Template

  - GET /v1/templates
  - POST /v1/templates
  - GET /v1/templates/:id
  - PATCH /v1/templates/:id
  - POST /v1/templates/:id/versions
  - POST /v1/templates/:id/versions/:versionId/publish
  - POST /v1/templates/:id/clone
  - GET /v1/templates/:id/compatible-blueprints

  ## 89. Externe API-Gruppe: Project

  - GET /v1/projects
  - POST /v1/projects
  - GET /v1/projects/:id
  - PATCH /v1/projects/:id
  - POST /v1/projects/:id/autosave
  - POST /v1/projects/:id/versions
  - GET /v1/projects/:id/versions
  - GET /v1/projects/:id/versions/:versionId
  - POST /v1/projects/:id/finalize
  - POST /v1/projects/:id/clone
  - POST /v1/projects/:id/request-approval
  - POST /v1/projects/:id/approve
  - POST /v1/projects/:id/reject

  ## 90. Externe API-Gruppe: Asset

  - POST /v1/assets
  - GET /v1/assets
  - GET /v1/assets/:id
  - DELETE /v1/assets/:id
  - GET /v1/fonts
  - POST /v1/fonts
  - GET /v1/color-profiles

  ## 91. Externe API-Gruppe: Production

  - POST /v1/outputs/preview
  - POST /v1/outputs/proof-pdf
  - POST /v1/outputs/production-pdf
  - POST /v1/preflight
  - GET /v1/jobs/:id
  - GET /v1/preflight-reports/:id
  - GET /v1/output-artifacts/:id
  - GET /v1/projects/:id/latest-output

  ## 92. Externe API-Gruppe: Commerce Connector

  - POST /v1/launch-sessions
  - GET /v1/launch-sessions/:id
  - POST /v1/connectors/magento2/quote-links
  - POST /v1/connectors/magento2/order-links
  - POST /v1/connectors/magento2/reorders
  - POST /v1/connectors/magento2/webhooks/order-status
  - POST /v1/connectors/magento2/webhooks/payment-status
  - GET /v1/connectors/magento2/projects/:projectId/status
  - POST /v1/connectors/magento2/projects/:projectId/return

  ## 93. Öffentliche Request-Konventionen

  - JSON über HTTPS.
  - Authorization: Bearer.
  - Idempotency-Key für finalize, launch session, output job, quote link, order link.
  - Antwortobjekte enthalten id, type, attributes, links optional nicht zwingend.
  - Fehlerobjekte enthalten code, message, details, traceId.
  - Pagination nutzt page, pageSize, total.
  - Filter sind whitelist-basiert.
  - Sortierfelder sind whitelist-basiert.
  - Webhooks sind signiert.
  - Long-running Operations liefern Job-Objekte.

  ## 94. API-Entscheidung: Finalize

  - Finalize ist der kritischste Endpunkt.
  - POST /v1/projects/:id/finalize erwartet optional approval intent und commerce context.
  - Finalize validiert Draft-Sperren.
  - Finalize erzeugt eine neue finale Version.
  - Finalize triggert mindestens preflight.
  - Finalize kann optional direkt preview und proof.
  - Finalize ist idempotent per Key.
  - Wiederholte identische Requests liefern dieselbe finale Version oder denselben Job zurück.
  - Finalize überschreibt keine bestehende finale Version.
  - Ein erneuter Bearbeitungsstart erzeugt einen neuen Draft-Clone.

  ## 95. Beispiel: Finalize Response

  {
    "projectId": "prj_01JZ...",
    "finalVersionId": "prv_01JZ...",
    "state": "finalized",
    "approvalState": "pending",
    "jobs": [
      {
        "jobId": "job_01JZ...",
        "jobType": "preflight",
        "status": "queued"
      }
    ]
  }

  ## 96. Technische Validierung des Dokuments vor Persistenz

  - Jeder autosave validiert gegen JSON Schema.
  - Jeder snapshot validiert gegen JSON Schema.
  - Jeder finalize validiert zusätzlich gegen Blueprint und Template Constraints.
  - Schemafehler blockieren Speicherung.
  - Constraintfehler blockieren Finalize, nicht zwingend Draft-Autosave.
  - Das erlaubt Entwürfe, aber keine kaputten finalen Versionen.
  - Constraint-Fehler werden als domänenspezifische Fehlercodes zurückgegeben.

  ## 97. Preflight-Regeln: Allgemein

  - Fehlende Assets.
  - Defekte Asset-Referenzen.
  - Bild-DPI unter Profilgrenze.
  - Text außerhalb Safe Area.
  - Objekte außerhalb Bleed/Artboard-Regeln.
  - Gesperrte Template-Objekte verändert.
  - Nicht erlaubte Fonts.
  - Nicht erlaubte Farben.
  - Transparenz nicht erlaubt laut Profil.
  - Zu kleine Linienbreite.
  - Fehlende Pflicht-Platzhalter.
  - Leere Pflicht-Texte.
  - Unsichtbare, aber als Pflicht definierte Inhalte.

  ## 98. Preflight-Regeln: Apparel

  - Objekt außerhalb Print-Zone.
  - Objekt größer als max. Zone.
  - Zone ohne erlaubte Hintergrundtransparenz.
  - Motiv kollidiert mit gesperrtem Sicherheitsbereich.
  - Zu geringe Asset-Auflösung bezogen auf Zonenfläche.
  - Zone laut Produktvariante nicht erlaubt.
  - Nicht unterstützte Anzahl aktiver Zonen.

  ## 99. Preflight-Regeln: Packaging

  - Artwork auf Glue Zone.
  - Artwork auf verbotener technischer Zone.
  - Text über kritische Faltkante.
  - Wichtige Inhalte außerhalb sicherer Paneele.
  - Dieline-Layer verändert.
  - Technische Referenz fehlt.
  - Bleed nicht ausreichend entlang definierter Schnittkanten.
  - Nicht gemappte technische Layer im Input-SVG.

  ## 100. Output-Typen in v1

  - browser preview
  - approval proof pdf
  - production pdf
  - technical proof pdf
  - surface preview png
  - surface export png nur wenn Produktprofil das verlangt
  - production pdf bleibt das zentrale Zielartefakt.

  ## 101. Rendering-Pipeline: High Level

  - Schritt 1: Lade ProjectVersion.
  - Schritt 2: Lade BlueprintVersion.
  - Schritt 3: Lade TemplateVersion.
  - Schritt 4: Löse Asset-Referenzen auf.
  - Schritt 5: Löse Font-Referenzen auf.
  - Schritt 6: Validiere Dokumentintegrität.
  - Schritt 7: Erzeuge Render-Scene pro Surface.
  - Schritt 8: Erzeuge Browser-Previews.
  - Schritt 9: Erzeuge PDF-Artefakte.
  - Schritt 10: Führe qpdf-Checks aus.
  - Schritt 11: Führe Preflight-Analyse aus.
  - Schritt 12: Schreibe Artefakte und Reports.
  - Schritt 13: Publiziere Events.

  ## 102. Rendering-Pipeline: Preview

  - Previews werden für UI und Rückgaben an Magento gebraucht.
  - Previews werden rasterisiert.
  - Previews nutzen sRGB.
  - Previews können Mockup-Hintergründe enthalten.
  - Apparel-Previews dürfen Garment-Mockups enthalten.
  - Packaging-Previews dürfen technische Overlays ausblenden.
  - Browser-Previews sind nicht Produktionsdateien.
  - Der Artefakt-Typ wird klar unterschieden.

  ## 103. Rendering-Pipeline: Proof PDF

  - Proof PDFs sind für menschliche Prüfung.
  - Proof PDFs dürfen Mockup- oder technische Zusatzhinweise enthalten.
  - Proof PDFs dürfen Seitenlabels tragen.
  - Proof PDFs dürfen Wasserzeichen wie PROOF tragen.
  - Proof PDFs sind nicht zwingend identisch mit Produktions-PDFs.
  - Die Differenz wird im Output-Profil definiert.

  ## 104. Rendering-Pipeline: Production PDF

  - Produktions-PDFs enthalten nur druckrelevante Inhalte.
  - Mockup-Hintergründe werden entfernt.
  - Technische Layer werden je Profil ein- oder ausgeblendet.
  - Bleed und Trim werden berücksichtigt.
  - Artboards werden korrekt in PDF-Koordinaten übersetzt.
  - Texte werden mit eingebetteten Fonts geschrieben.
  - Bilder werden in sinnvoller Qualität eingebettet.
  - Transparenz- und Flattening-Regeln folgen dem Print-Profil.
  - Das Ziel ist ein reproduzierbares Produktionsartefakt.
  - Wir behaupten in v1 nicht automatisch volle PDF/X-Abnahme.
  - Wir liefern stattdessen eine offen dokumentierte, reproduzierbare Produktions-PDF-Pipeline.

  ## 105. Warum PDFKit + svg-to-pdfkit + qpdf + Ghostscript

  - PDFKit ist gut geeignet für programmatische PDF-Ausgabe.
  - svg-to-pdfkit erlaubt SVG-Einbettung für technische Overlays und Vektorelemente.
  - fontkit deckt Font-Embedding ab.
  - qpdf ist nützlich für PDF-Strukturprüfungen und Nachbearbeitung.
  - Ghostscript ist nützlich für Preview-Raster und bestimmte Konvertierungen.
  - Diese Kombination ist open source.
  - Diese Kombination ist self-hosted-freundlich.
  - Diese Kombination ist realistischer als ein reiner Browser-Screenshot-Ansatz.
  - Diese Kombination ist ehrlicher als zu behaupten, wir hätten von Tag 1 eine perfekte High-End-Prepress-Engine.

  ## 106. Packaging-Eingabemodell

  - Admin lädt ein Dieline-SVG hoch.
  - System versucht bekannte technische Layer zu erkennen.
  - Falls Erkennung fehlschlägt, mappt Admin die Layer manuell.
  - Admin definiert Faces und deren Zuordnung zu technischen Bereichen.
  - Admin definiert Safe Areas pro Face.
  - Admin definiert Bleed-Kanten pro Face.
  - Admin definiert verbotene Zonen.
  - Das Blueprint speichert diese Mappings.
  - Das Template arbeitet auf diesen gemappten Surfaces.

  ## 107. Apparel-Eingabemodell

  - Admin lädt Mockup-Bilder pro Farbvariante hoch.
  - Admin definiert Print-Zonen pro Produktvariante.
  - Admin definiert Zone-Masken optional.
  - Admin definiert zulässige Zonenkombinationen.
  - Admin definiert Output-Profil pro Zone.
  - Das Blueprint speichert diese Regeln.
  - Das Template kann zonenspezifisch gesperrte oder editierbare Elemente definieren.

  ## 108. Commerce-Link-Modell

  - Ein Projekt kann null oder einen CommerceLink haben.
  - Ein CommerceLink gehört zu genau einem Connector-Typ.
  - Ein CommerceLink kann Quote- und Order-Referenzen getrennt speichern.
  - Ein CommerceLink kann aus magento launch, portal direct, api direct entstehen.
  - Ein Projekt ohne CommerceLink ist trotzdem gültig.
  - Das ist wichtig für Demos, Portale und später andere Connectoren.

  ## 109. Magento-Connector: Produktverantwortung

  - Magento bleibt führend für SKU, Preis, Cart, Checkout, Order.
  - Flow2Print bleibt führend für Blueprint, Template, Project, Output, Preflight.
  - Magento kennt kein Design-Dokument.
  - Magento kennt keine Layer.
  - Magento kennt keine Preflight-Engine.
  - Magento kennt nur Referenzen, Status und Pricing Signals.
  - Genau diese Schnittlinie muss hart bleiben.

  ## 110. Magento-Connector: UX-Modus

  - Primärmodus ist Redirect.
  - Der Benutzer klickt im PDP auf Customize.
  - Magento fordert Launch-Session an.
  - Magento leitet auf designerUrl.
  - Nach Finalisierung springt Flow2Print zur returnUrl.
  - Magento lädt Server-seitig den finalen Projektstatus nach.
  - Danach wird der Artikel dem Warenkorb hinzugefügt oder aktualisiert.
  - Dieser Modus vermeidet Iframe-, Cookie- und CSP-Probleme.
  - Dieser Modus ist auch für mobile Geräte robuster.

  ## 111. Magento-Connector: Frontend-Einstiegspunkte

  - Produktdetailseite.
  - Warenkorb-Position Edit design.
  - Kundenkonto Reorder design.
  - Order-Detailseite Reopen as new draft.
  - Optional Kategorie- oder Landingpage-Starter.
  - Der Connector liefert keine eigenen Canvas-Komponenten.
  - Der Connector liefert nur Start-, Rückkehr- und Statusmechanik.

  ## 112. Magento-Connector: Server-seitige Abläufe

  - Launch-Session erzeugen.
  - Finalen Projektstatus abrufen.
  - Quote-Item-Referenz anlegen.
  - Quote-Item beim Bearbeiten aktualisieren.
  - Order-Item-Referenz bei Bestellung persistieren.
  - Reorder-Flow starten.
  - Status-Sync verarbeiten.
  - Reconciliation-Job ausführen.
  - Fehler sichtbar loggen.

  ## 113. Magento-Connector: Eigene Tabellen

  - flow2print_launch_session
  - flow2print_quote_item_link
  - flow2print_order_item_link
  - flow2print_sync_ledger
  - flow2print_connector_log
  - Die Tabellen speichern nur Referenzen und Synchronisationsdaten.
  - Große Payloads werden nicht dauerhaft dupliziert.
  - Redundante Previews können zur Beschleunigung mitgespeichert werden.
  - Die Quelle der Wahrheit bleibt trotzdem Flow2Print.

  ## 114. Magento-Connector: Quote Item Daten

  - quote_item_id
  - flow2print_project_id
  - flow2print_project_version_id
  - flow2print_blueprint_ref
  - flow2print_template_ref
  - flow2print_preview_url
  - flow2print_pricing_signals_json
  - flow2print_status
  - created_at
  - updated_at

  ## 115. Magento-Connector: Order Item Daten

  - order_item_id
  - flow2print_project_id
  - flow2print_project_version_id
  - flow2print_output_artifact_ref
  - flow2print_preflight_status
  - flow2print_production_status
  - created_at
  - updated_at

  ## 116. Magento-Connector: Admin-Konfiguration

  - base_api_url
  - client_id
  - client_secret
  - webhook_secret
  - default_store_mapping
  - default_locale_mapping
  - return_route
  - allow_guest_designs
  - require_finalized_before_add_to_cart
  - sync_on_order_place
  - reconciliation_cron_enabled
  - debug_logging_enabled

  ## 117. Magento-Connector: Signaturen und Sicherheit

  - Jede ausgehende Webhook- oder Callback-Nachricht wird signiert.
  - Eingehende Rückmeldungen von Flow2Print werden per HMAC verifiziert.
  - Launch-Sessions werden server-seitig angefordert.
  - Der Browser sieht keinen Connector-Secret.
  - Gastflüsse bekommen nur kurzlebige Launch-Tokens.
  - returnUrl wird server-seitig validiert.
  - Offene Redirects werden verhindert.

  ## 118. Magento-Connector: Reorder

  - Reorder verwendet keine alte finale Version direkt als editierbare Zielversion.
  - Reorder ruft POST /v1/connectors/magento2/reorders.
  - Flow2Print klont die finale Version in ein neues Draft-Projekt.
  - Magento bekommt neue designerUrl.
  - Das verhindert Mutation historischer Produktionsreferenzen.

  ## 119. Magento-Connector: Payment und Produktionsfreigabe

  - Standard in v1:
  - Projekt kann vor Order finalisiert werden.
  - Produktion wird erst nach Order-Link relevant.
  - Optionaler Webhook payment-status kann später Produktionsjobs erst nach Zahlung freigeben.
  - Dieses Verhalten bleibt pro Connector-Konfiguration definierbar.
  - Der Kernpfad blockiert v1 nicht an Zahlungslogik.

  ## 120. Identity und OIDC

  - local auth bleibt Standard.
  - OIDC federation ist optional.
  - Keycloak ist empfohlener Referenzanbieter.
  - Quelle: Keycloak docs (https://www.keycloak.org/documentation)
  - Azure AD oder andere OIDC-Anbieter können später ebenfalls angebunden werden.
  - Rollenmapping bleibt in Flow2Print.
  - Externe Tokens werden nicht blind vertraut.
  - Gruppen- oder Rollenclaims werden explizit gemappt.

  ## 121. Guest-Flow

  - Gäste dürfen Designs starten.
  - Gäste bekommen eine temporäre Identität.
  - Projekte von Gästen sind an guest identity und launch session gebunden.
  - Beim Login oder bei Bestellabschluss kann das Projekt geclaimed werden.
  - Claiming migriert Besitz und CommerceLink.
  - Gastprojekte können mit TTL bereinigt werden.
  - TTL-Bereinigung betrifft nur unbestellte, inaktive Gast-Drafts.

  ## 122. Multi-Tenancy-Strategie

  - Jede Business-Tabelle enthält tenantId.
  - Systemweite Admins sind seltene Sonderrollen.
  - Templates sind tenant-gebunden.
  - Assets sind tenant-gebunden.
  - Blueprints sind tenant-gebunden.
  - Projects sind tenant-gebunden.
  - Connectoren sind tenant-gebunden.
  - B2C-Standardinstallationen können mit einem einzigen Tenant starten.
  - B2B-Portale können mehrere Tenants oder Organisationsbereiche nutzen.
  - Tenant-Grenzen werden im Backend erzwungen.
  - Tenant-Grenzen werden nicht nur im Frontend gefiltert.

  ## 123. Suchstrategie

  - v1 nutzt PostgreSQL-Suche.
  - pg_trgm unterstützt fuzzy Suche für Namen und Slugs.
  - Full Text Search unterstützt Template- und Projekttextfelder.
  - Facettierung in v1 bleibt einfach.
  - Wenn Asset- und Katalogmengen wachsen, wird ein SearchAdapter abstrahiert.
  - Ein späterer OpenSearch-Adapter kann dann hinzugefügt werden.
  - Wir erzwingen OpenSearch nicht für die erste Open-Source-Installation.

  ## 124. Security-Baselines

  - Access Tokens kurzlebig.
  - Refresh Tokens rotierend.
  - Passwort-Hashes mit modernem KDF.
  - Service-zu-Service-Kommunikation über interne Credentials.
  - CORS restriktiv je Deployment.
  - Rate Limiting für öffentliche Endpunkte.
  - Signed URLs für Artefakte.
  - Audit-Logs für kritische Aktionen.
  - Finalize, Approval, Connector-Webhook und Credential-Änderungen werden auditiert.
  - Sensitive Daten werden nie in Job-Payloads unnötig repliziert.

  ## 125. Observability

  - Jeder HTTP-Request bekommt traceId.
  - Jeder Event erbt traceId, wenn vorhanden.
  - Jeder Output-Job ist im UI und im Ops-Stack sichtbar.
  - Metriken umfassen Jobdauer, Fehlerraten, Retry-Raten, Assetgrößen, Queue-Länge.
  - Logs werden strukturiert in JSON geschrieben.
  - Dashboards unterscheiden designer, portal, api, workers, connector sync.
  - Alerting fokussiert auf finalize failures, DLQ growth, render failures, webhook signature failures.

  ## 126. Lokales Entwickler-Setup

  - Docker Compose startet postgres, redis, rabbitmq, minio, mailpit, grafana, prometheus.
  - pnpm dev startet lokale Frontends und Services.
  - pnpm test führt Unit- und Integrations-Tests aus.
  - pnpm seed:demo lädt Demo-Tenants und Beispielprodukte.
  - Demo-Produkte:
  - business-card
  - tshirt-front-back
  - folding-carton-simple
  - Ein Demo-Magento kann optional im separaten Stack folgen.
  - Das Plattform-Repo erzwingt aber kein Magento für lokale Entwicklung.

  ## 127. Produktions-Deployment

  - Kubernetes wird offizieller Produktionspfad.
  - Helm-Charts für jeden Service.
  - Gemeinsames Chart für Observability optional.
  - Readiness- und Liveness-Probes für alle Services.
  - Worker skaliert nach Queue-Länge.
  - Objekt-Storage extern oder clusterintern.
  - PostgreSQL als verwalteter Dienst oder selbst betrieben.
  - RabbitMQ als StatefulSet oder verwalteter Dienst.
  - Redis als verwalteter Dienst oder Sentinel/Cluster je nach Bedarf.
  - Ingress bleibt Controller-neutral.
  - Beispielwerte für NGINX Ingress und Traefik können dokumentiert werden.

  ## 128. CI-Pipeline Plattform

  - Install mit pnpm.
  - Lint.
  - Typecheck.
  - Unit Tests.
  - API Contract Snapshot Check.
  - JSON Schema Validation Tests.
  - Build aller Apps.
  - Docker Image Build.
  - Compose Smoke Test.
  - Security Scan.
  - Artifact Upload.
  - Release nur auf Tags oder gemergte Release-PRs.

  ## 129. CI-Pipeline Connector

  - composer validate
  - composer install
  - phpcs
  - phpstan
  - phpunit
  - Magento-Kompatibilitätsmatrix in separaten Jobs möglich.
  - Release-Artefakte als ZIP und Composer-Paket.

  ## 130. Testing-Strategie: Unit

  - Dokument-Schema-Validator.
  - Editor-Mapping Fabric <-> Scene <-> Document.
  - Preis-Signal-Berechnung.
  - Tenant-Policy-Prüfungen.
  - Launch-Session-Signierung.
  - Finalize-Idempotenz.
  - Output-Job-Statusmaschinen.
  - Preflight-Regeln.
  - Connector-Signaturprüfung.
  - Magento-Payload-Mapper.

  ## 131. Testing-Strategie: Integration

  - API zu DB.
  - API zu RabbitMQ.
  - Asset Upload bis Variant-Erzeugung.
  - Projekt speichern bis finale Version.
  - Finalize bis Preflight-Job.
  - Finalize bis Preview-Artefakt.
  - Finalize bis Production-PDF-Artefakt.
  - Magento Launch bis Return-Handshake.
  - Quote-Link bis Order-Link.
  - Reorder-Clone.

  ## 132. Testing-Strategie: End-to-End

  - Flat-Print Gastflow aus Magento.
  - Flat-Print registrierter Flow aus Magento.
  - Apparel-Flow mit zwei Zonen.
  - Packaging-Flow mit Dieline.
  - B2B-Approval-Flow.
  - Projekt klonen und erneut bestellen.
  - Rücksprung aus Designer zu Magento.
  - Fehlerhafte Assets mit Blocking Preflight.
  - Output-Job Retry nach Worker-Fehler.

  ## 133. Testing-Strategie: Contract

  - OpenAPI-Snapshots werden versioniert.
  - JSON-Schema-Snapshots werden versioniert.
  - Event-Contract-Snapshots werden versioniert.
  - Connector-Repo testet gegen veröffentlichte API-Fixtures.
  - Breaking Changes ohne Major-Version sind CI-blockierend.

  ## 134. Migrations-Strategie

  - BlueprintVersion ist immutable nach Publish.
  - TemplateVersion ist immutable nach Publish.
  - ProjectVersion ist immutable nach Finalize.
  - Flow2Print Document Schema bekommt Migrationspfade.
  - Alte Dokumente können beim Laden migriert werden.
  - Migrations laufen explizit und versioniert.
  - render-worker rendert nur unterstützte Schema-Versionen oder migrierte Formen.
  - Das verhindert stilles Drift-Verhalten.

  ## 135. Open-Source-Governance

  - Kern unter AGPL-3.0.
  - Connector und SDKs unter Apache-2.0.
  - DCO oder CLA muss entschieden und dokumentiert werden.
  - Empfehlung: DCO statt schwerem CLA.
  - CODE_OF_CONDUCT ins Repo.
  - CONTRIBUTING.md ins Repo.
  - SECURITY.md ins Repo.
  - GOVERNANCE.md ins Repo.
  - ADR-Prozess für Architekturentscheidungen.
  - RFC-Prozess für größere Feature- oder Contract-Änderungen.
  - Öffentliche Roadmap im Repo.
  - Demo-Daten und Beispielprodukte von Anfang an.

  ## 136. Roadmap: 0.1 Foundation

  - Monorepo aufsetzen.
  - Auth-Service.
  - Catalog-Service.
  - Template-Service.
  - Project-Service.
  - Asset-Service.
  - Edge-API.
  - Design-Dokument-Schema.
  - Editor-Engine-Skelett.
  - React/Vite Shells.
  - Docker-Compose-Stack.
  - Demo-Tenant.
  - Demo-Blueprint business-card.
  - Launch-Session-API.

  ## 137. Roadmap: 0.2 Flat Print Alpha

  - Flat-Surface-Editor.
  - Template-Constraints.
  - Asset-Uploads.
  - Autosave.
  - Snapshotting.
  - Finalize.
  - Preview-Jobs.
  - Proof-PDF.
  - Production-PDF.
  - Basis-Preflight.
  - Portal-Listen.
  - Magento-Launch.
  - Magento-Return.
  - Quote-Linking.

  ## 138. Roadmap: 0.3 Apparel Alpha

  - Apparel-Zonenmodell.
  - Mockup-Hintergründe.
  - Zonen-Constraints.
  - Apparel-Preflight-Regeln.
  - Mehrzonen-Outputs.
  - Pricing Signals für Zonen.
  - Apparel-Demo-Produkt.

  ## 139. Roadmap: 0.4 Packaging Alpha

  - Dieline-Upload.
  - Layer-Mapping.
  - Face-/Surface-Mapping.
  - Glue/Fold/Cut-Regeln.
  - Packaging-Preflight.
  - Packaging-Proof.
  - Packaging-Demo-Produkt.

  ## 140. Roadmap: 0.5 Magento Beta

  - Reorder-Flow.
  - Order-Linking.
  - Reconciliation-Cron.
  - Payment-Status-Webhook.
  - Admin-Konfiguration.
  - Logging und Support-Ansichten.
  - Demo-Magento-Repo oder Demo-Guide.

  ## 141. Roadmap: 1.0

  - Stabilisiertes Document Schema.
  - Stabilisiertes API-Schema.
  - Stabilisiertes Event-Schema.
  - Public Docs Site.
  - Installationshandbuch.
  - Operations-Handbuch.
  - Upgrade-Handbuch.
  - Connector-Kompatibilitätsmatrix.
  - Smoke-Test-Suites.
  - Release-Prozess.
  - First-party Demo-Stack.

  ## 142. Akzeptanzkriterien für 1.0

  - Eine frische Self-hosted-Installation läuft dokumentiert mit Compose.
  - Ein Flat Print-Produkt kann von Magento gestartet, gestaltet, finalisiert und bestellt werden.
  - Ein Apparel-Produkt kann von Magento gestartet, gestaltet, finalisiert und bestellt werden.
  - Ein Packaging-Produkt kann von Magento gestartet, gestaltet, finalisiert und bestellt werden.
  - Jedes bestellte Projekt ist auf eine finale Version rückverfolgbar.
  - Jedes Output-Artefakt ist auf Projekt-, Template- und Blueprint-Version rückverfolgbar.
  - Blocking-Preflight verhindert Finalize oder Bestellbarkeit je Konfiguration.
  - Reorder erzeugt immer neues Draft-Projekt.
  - API- und Dokument-Verträge sind versioniert und veröffentlicht.
  - Das Projekt ist für externe Contributors verständlich bootstrapbar.

  ## 143. Entscheidungen gegen unnötige Komplexität

  - Kein Pflicht-OpenSearch in v1.
  - Kein Pflicht-Temporal in v1.
  - Kein Pflicht-Keycloak in jeder Installation.
  - Kein Microservice-Split in 20 Dienste.
  - Kein SSR-Zwang.
  - Kein Iframe als Primärintegration.
  - Kein PDF/X-Marketingversprechen, das wir open source kurzfristig nicht sauber tragen können.
  - Kein rohes Fabric JSON als Langzeitvertrag.
  - Kein Magento-Monolith mit eingegossener W2P-Logik.

  ## 144. Was wir aus print-designer strukturell lernen und bewusst überführen

  - Das Seed trennt product, project, order, media, user.
  - Referenz: src/app/src/services (https://github.com/lmanukyan/print-designer/tree/develop/src/app/src/services)
  - Das Zielsystem übernimmt diese Domänensprache.
  - Das Seed speichert Projects separat von Orders.
  - Referenz: Projects.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Projects.ts)
  - Das Zielsystem übernimmt diese Trennung.
  - Das Seed nutzt front/back-Sichtweisen.
  - Referenz: canvas.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/canvas.js)
  - Das Zielsystem verallgemeinert das zu surfaces.
  - Das Seed nutzt layers und ein control panel.
  - Referenz: App.vue (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/App.vue)
  - Das Zielsystem übernimmt diese Bedienlogik, aber nicht den Stack.
  - Das Seed nutzt ein einfaches pricing-Objekt.
  - Referenz: Pricing.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/globals/Pricing.ts)
  - Das Zielsystem überführt das in pricing signals, nicht in finale Shop-Preisführung.
  - Das Seed packt Outputs in ein ZIP und mailt sie.
  - Referenz: order-created.js (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/hooks/order-created.js)
  - Das Zielsystem ersetzt das durch Output-Artefakte, Jobs und Connector-Status.
  - Inferenz: Genau so bekommen wir ein sauberes, rundes Konzept statt nur eines größeren Demos.

  ## 145. Beispielhafte Ownership-Zuordnung im Team

  - Plattform-Frontend-Team besitzt designer-web, portal-web, editor-engine, ui-kit.
  - Core-Backend-Team besitzt identity, catalog, template, project.
  - Production-Team besitzt production-service, render-worker, preflight-worker.
  - Integrations-Team besitzt commerce-connector-service und magento2-connector.
  - DevOps-Team besitzt infra, Observability, Release-Automation.
  - Diese Ownership ist im Monorepo sichtbar.
  - Diese Ownership verhindert verwischte Zuständigkeiten.

  ## 146. Mögliche Risiken

  - Risko: PDF-Ausgabe wird unterschätzt.
  - Risiko: Packaging-Geometrie wird unterschätzt.
  - Risiko: Magento-Return-Flow wird zu spät konkretisiert.
  - Risiko: Das Dokument-Schema wird zu nah an Fabric gebaut.
  - Risiko: B2B-Approval wächst unkontrolliert.
  - Risiko: Search/Reporting werden zu früh zu schwer.
  - Risiko: Self-hosted-Betrieb wird zu komplex.
  - Risiko: Open-Source-Beiträge scheitern an schlechter Doku.
  - Risiko: Connector- und Plattform-Versionen driften auseinander.

  ## 147. Gegenmaßnahmen

  - Das Dokument-Schema wird früh und hart definiert.
  - Output- und Preflight-Pipeline werden vor dem großen Feature-Ausbau ernst genommen.
  - Packaging bleibt in v1 2D und nicht 3D.
  - Redirect-first reduziert Connector-Komplexität.
  - Approval bleibt in v1 bewusst linear.
  - OpenSearch und Temporal bleiben optional.
  - Demo-Produkte decken alle drei Produktarten ab.
  - Kompatibilitätsmatrix wird früh dokumentiert.
  - Contract-Tests blockieren ungewollte API-Drifts.

  ## 148. Konkrete Defaults, die im Bootstrap direkt gesetzt werden

  - Default-Sprache en plus de.
  - Default-Währung EUR.
  - Default-Unit mm.
  - Default-Produkt-Demos:
  - business-card
  - poster-a3
  - tshirt-front-back
  - folding-carton-simple
  - Default-Preview-Format png.
  - Default-Proof pdf.
  - Default-Production pdf.
  - Default-Queue-Retry 3.
  - Default-Gastprojekt-TTL 30 Tage.
  - Default-Launch-Token-TTL 30 Minuten.

  ## 149. Non-Goals nochmals explizit, um Fehlimplementierungen zu vermeiden

  - Nicht in v1: echtes Figma-Coediting.
  - Nicht in v1: generisches DAM mit Rollen, Collections und AI-Suche.
  - Nicht in v1: 3D-Apparel-Warping.
  - Nicht in v1: Verpackungs-CAD.
  - Nicht in v1: Page-Builder für Marketingseiten.
  - Nicht in v1: Shop-Checkout.
  - Nicht in v1: Magento-internes Rendering.
  - Nicht in v1: Browserbasierte CMYK-Farbverbindlichkeit.
  - Nicht in v1: Callas-ähnliche proprietäre Preflight-Tiefe.
  - Nicht in v1: unbeschränkte beliebige Benutzer-Font-Uploads.

  ## 150. Das ist die eigentliche runde Konzeptidee

  - Das System ist um Blueprint -> Template -> Project -> Version -> Output -> CommerceLink aufgebaut.
  - Das System ist nicht um Screens herum aufgebaut.
  - Das System ist nicht um einzelne Kundenfeatures herum aufgebaut.
  - Das System ist nicht um Fabric-Interna herum aufgebaut.
  - Das System ist nicht um Magento herum aufgebaut.
  - Genau dadurch bleibt es als Open-Source-Produkt sauber.
  - Genau dadurch lässt es sich später über Magento hinaus erweitern.
  - Genau dadurch kann print-designer sinnvoll als Inspiration dienen, ohne zur Architektur-Falle zu werden.

  ## 151. Primäre Quellen aus den Seed-Repos

  - print-designer README (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/README.md)
  - print-designer root package.json (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/package.json)
  - print-designer app package.json (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/package.json)
  - print-designer payload config (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/payload.config.ts)
  - print-designer Products collection (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Products.ts)
  - print-designer Projects collection (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Projects.ts)
  - print-designer Orders collection (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/collections/Orders.ts)
  - print-designer Pricing global (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/globals/Pricing.ts)
  - print-designer access rules (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/access.ts)
  - print-designer shared fields (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/shared/fields.ts)
  - print-designer server.ts (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/server.ts)
  - print-designer order-created hook (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/hooks/order-created.js)
  - print-designer canvas service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/canvas.js)
  - print-designer App.vue (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/App.vue)
  - print-designer product service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/product.js)
  - print-designer project service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/project.js)
  - print-designer order service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/order.js)
  - print-designer user service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/user.js)
  - print-designer media service (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/src/app/src/services/media.js)
  - print-designer docker-compose.yml (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/docker-compose.yml)
  - print-designer .env.example (https://raw.githubusercontent.com/lmanukyan/print-designer/develop/.env.example)
  - Graphic-and-banner-designing-app-fabricjs README (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/README.md)
  - Graphic-and-banner-designing-app-fabricjs composer.json (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/composer.json)
  - Graphic-and-banner-designing-app-fabricjs package.json (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/package.json)
  - Graphic-and-banner-designing-app-fabricjs routes/web.php (https://raw.githubusercontent.com/basirkhan12/Graphic-and-banner-designing-app-fabricjs/master/routes/web.php)

  ## 152. Primäre Technologiequellen

  - React docs (https://react.dev/)
  - Vite docs (https://vite.dev/guide/)
  - NestJS docs (https://docs.nestjs.com/)
  - PostgreSQL docs (https://www.postgresql.org/docs/current/)
  - RabbitMQ docs (https://www.rabbitmq.com/docs)
  - Keycloak docs (https://www.keycloak.org/documentation)
  - Node.js Releases (https://nodejs.org/en/about/previous-releases)
  - Magento Open Source 2.4.8 release notes (https://experienceleague.adobe.com/en/docs/commerce-operations/release/notes/magento-open-source/2-4-8)

  ## 153. Explizite Annahmen

  - Wir starten auf leerer grüner Wiese.
  - Es gibt noch keinen bestehenden Code in diesem Workspace.
  - Flow2Print darf als eigenständiges Produkt geplant werden.
  - Der Magento-Connector ist ein separates Repo.
  - AGPL-3.0 für den Plattform-Kern ist gewünscht.
  - B2B und B2C müssen beide im Zielbild Platz haben.
  - Packaging und Apparel sollen nicht ausgeklammert werden.
  - Trotzdem bleiben 3D und High-End-Prepress in v1 bewusst begrenzt.
  - print-designer wird nur als Seed-Ideenlieferant behandelt.
  - Der Connector darf permissiver lizenziert werden als der Kern.

  ## 154. Entscheidungsfertiges Fazit

  - Ja, print-designer ist ein guter inhaltlicher Seed.
  - Nein, print-designer ist keine Architektur, die wir nur hochskalieren sollten.
  - Flow2Print sollte als neue Plattform gebaut werden.
  - Der Kern gehört in ein TypeScript-Monorepo.
  - Der Magento-Connector gehört in ein separates PHP-Repo.
  - Der Plattform-Kern muss von Anfang an auf Blueprint -> Template -> Project -> Version -> Output -> CommerceLink beruhen.
  - Der persistierte Vertrag muss ein eigenes versioniertes Dokument-Schema sein.
  - React + Vite + Fabric.js ist die richtige Editor-Basis.
  - NestJS + PostgreSQL + RabbitMQ + Redis + MinIO ist der richtige Plattform-Kern.
  - PDFKit + Sharp + qpdf + Ghostscript ist die ehrliche Open-Source-Pipeline für v1.
  - Redirect-first ist die richtige Magento-Integration.
  - Genau so bleibt das Konzept sauber, rund und open-source-fähig.
