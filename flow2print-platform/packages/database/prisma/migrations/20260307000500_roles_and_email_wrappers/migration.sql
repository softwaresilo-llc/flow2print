-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Seed default roles
INSERT INTO "Role" ("id", "label", "description", "permissions", "isSystem", "updatedAt")
VALUES
  ('admin', 'Admin', 'Full system access including users, settings, tokens, templates, and operational data.', ARRAY['*']::TEXT[], TRUE, NOW()),
  ('manager', 'Manager', 'Operational access for projects, assets, commerce, and production-facing workflows.', ARRAY['projects:*','assets:*','commerce:*','catalog:read','mail:read']::TEXT[], TRUE, NOW()),
  ('customer', 'Customer', 'End-user account for portal and project ownership without admin access.', ARRAY['projects:own','assets:own']::TEXT[], TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Add mail wrapper columns to email templates
ALTER TABLE "EmailTemplate"
ADD COLUMN "wrapperHeaderHtml" TEXT NOT NULL DEFAULT '',
ADD COLUMN "wrapperFooterHtml" TEXT NOT NULL DEFAULT '';

-- Copy existing global wrapper into current templates so previews and sent mail stay intact
UPDATE "EmailTemplate"
SET
  "wrapperHeaderHtml" = COALESCE((SELECT "mailHeaderHtml" FROM "SystemSettings" WHERE "id" = 'default'), ''),
  "wrapperFooterHtml" = COALESCE((SELECT "mailFooterHtml" FROM "SystemSettings" WHERE "id" = 'default'), '')
WHERE "wrapperHeaderHtml" = '' AND "wrapperFooterHtml" = '';

-- Remove wrapper fields from global settings
ALTER TABLE "SystemSettings"
DROP COLUMN "mailHeaderHtml",
DROP COLUMN "mailFooterHtml";
