import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { SessionOrScopeGuard } from "../../common/guards/auth.guard.js";
import { Scopes } from "../../common/decorators/scopes.decorator.js";
import { UpdateSettingsDto } from "./dto/settings.dto.js";

@ApiTags("settings")
@Controller("v1/settings")
@UseGuards(SessionOrScopeGuard)
@Scopes("settings:read", "admin:read")
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "Get system settings" })
  async get() {
    return this.store.instance.getSystemSettings();
  }

  @Patch()
  @Scopes("settings:write", "admin:write")
  @ApiOperation({ summary: "Update system settings" })
  async update(@Body() body: UpdateSettingsDto) {
    return this.store.instance.updateSystemSettings(body);
  }
}
