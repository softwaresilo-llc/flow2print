import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { SessionOrScopeGuard } from "../../common/guards/auth.guard.js";
import { Scopes } from "../../common/decorators/scopes.decorator.js";

@ApiTags("system-info")
@Controller("v1/system-info")
@UseGuards(SessionOrScopeGuard)
@Scopes("admin:read", "settings:read")
@ApiBearerAuth()
export class SystemInfoController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "Get runtime and configuration info for the admin workspace" })
  async get() {
    const settings = await this.store.instance.getSystemSettings();
    const [projects, templates, blueprints, assets, users, emailTemplates, tokens] = await Promise.all([
      this.store.instance.listProjects(),
      this.store.instance.getTemplates(),
      this.store.instance.getBlueprints(),
      this.store.instance.listAssets(),
      this.store.instance.listUsers(),
      this.store.instance.listEmailTemplates(),
      this.store.instance.listApiTokens()
    ]);

    return {
      runtime: {
        framework: "nestjs",
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        now: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime())
      },
      persistence: {
        engine: "postgresql",
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
        dataDir: process.env.FLOW2PRINT_DATA_DIR ?? null
      },
      applications: {
        portalAppUrl: settings.portalAppUrl || null,
        designerAppUrl: settings.designerAppUrl || null,
        adminAppUrl: settings.adminAppUrl || null,
        commerceBaseUrl: settings.commerceBaseUrl || null,
        publicApiUrl: settings.publicApiUrl || null
      },
      limits: {
        maxUploadMb: settings.maxUploadMb,
        maxImageEdgePx: settings.maxImageEdgePx,
        sessionTtlHours: settings.sessionTtlHours,
        passwordResetTtlMinutes: settings.passwordResetTtlMinutes
      },
      catalog: {
        projects: projects.length,
        templates: templates.length,
        blueprints: blueprints.length,
        assets: assets.length,
        users: users.length,
        emailTemplates: emailTemplates.length,
        apiTokens: tokens.length
      }
    };
  }
}
