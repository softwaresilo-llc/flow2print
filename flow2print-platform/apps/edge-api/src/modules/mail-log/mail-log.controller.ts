import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { SessionOrScopeGuard } from "../../common/guards/auth.guard.js";
import { Scopes } from "../../common/decorators/scopes.decorator.js";

@ApiTags("mail-log")
@Controller("v1/mail-log")
@UseGuards(SessionOrScopeGuard)
@Scopes("mail:read", "admin:read")
@ApiBearerAuth()
export class MailLogController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List mail log entries" })
  async list() {
    return { docs: await this.store.instance.listMailLog() };
  }
}
