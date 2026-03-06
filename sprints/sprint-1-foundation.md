# Sprint 1: Foundation & Identity (Refined)

## Ziel
Herstellung der vollständigen operativen Basis für die Plattform. Nach diesem Sprint können sich Entwickler einloggen, Services starten und sicher miteinander kommunizieren.

## Technische Vorgaben
- **Runtime:** Node.js 22 LTS
- **Package Manager:** pnpm (Workspace Mode)
- **Monorepo:** Turborepo 2.x
- **Datenbank:** PostgreSQL 16 (via Docker)
- **Message Broker:** RabbitMQ 3.13 (via Docker)
- **ID-Format:** UUIDv7 (zeitlich sortierbar)

## Work Packages

### 1.1 Infrastructure & Tooling
- [ ] **Monorepo Setup:**
    - `turbo.json` mit Caching-Strategie für Build, Lint, Test.
    - `pnpm-workspace.yaml` mit korrekten Patterns (`apps/*`, `packages/*`).
    - `.editorconfig`, `.prettierrc`, `.eslintrc.js` zentralisieren.
- [ ] **Docker Environment:**
    - `docker-compose.yml` erstellen mit:
        - `postgres` (Port 5432)
        - `redis` (Port 6379)
        - `rabbitmq` (Port 5672/15672)
        - `minio` (Port 9000/9001) + `createbuckets` Script.
        - `mailpit` (Port 1025/8025) für lokale Mails.

### 1.2 Shared Libraries (`packages/`)
- [ ] **`packages/config`:** TypeScript-Configs (`tsconfig.base.json`, `tsconfig.nest.json`, `tsconfig.react.json`).
- [ ] **`packages/service-kit`:**
    - `PrismaClient` Factory mit Logging.
    - `LoggerModule` (basierend auf Pino/Winston).
    - `BaseEntity` Definitionen (CreatedAt, UpdatedAt, UUIDv7).
    - `HealthCheck` Utilities.
- [ ] **`packages/auth-sdk`:**
    - JWT Strategy & Guards.
    - Decorators (`@CurrentUser`, `@Public`, `@Roles`).

### 1.3 Identity Service (`apps/identity-service`)
- [ ] **Data Model (Prisma):**
    - `Organization` (Tenant Root).
    - `User` (Global Identity).
    - `Membership` (User <-> Organization mit Rollen).
    - `ApiKey` (Service-to-Service Auth).
- [ ] **Auth API:**
    - `POST /auth/register` (Initial User Setup).
    - `POST /auth/login` (Password Grant).
    - `POST /auth/refresh` (JWT Refresh).
    - `POST /auth/guests` (Anonymous Guest Session).
- [ ] **Seed Script:**
    - `seed:dev` Script zum Anlegen einer Default-Org und Admin-Users.

### 1.4 Edge API (`apps/edge-api`)
- [ ] **Gateway Setup:** NestJS Proxy Middleware.
- [ ] **Global Auth Guard:** Validierung des JWTs vor Weiterleitung.
- [ ] **Request Context:** Injection von `x-user-id`, `x-tenant-id` in Downstream-Requests.

### 1.5 Portal Shell (`apps/portal-web`)
- [ ] **React 19 Shell:**
    - Vite Setup mit React Router v7.
    - `TanStack Query` Client Setup.
    - `ui-kit` Integration (Tailwind + Radix Primitives).
- [ ] **Auth Context:**
    - Login Screen.
    - Protected Route Wrapper.
    - Logout Handler.

## Definition of Done (DoD)
- [ ] `pnpm dev` startet alle Services und die Frontend-App.
- [ ] Docker-Container laufen stabil und sind persistent (Volumes).
- [ ] Ein Entwickler kann sich über das Portal registrieren und einloggen.
- [ ] Die Datenbank-Migrationen (`prisma migrate`) laufen automatisch oder per Script.
