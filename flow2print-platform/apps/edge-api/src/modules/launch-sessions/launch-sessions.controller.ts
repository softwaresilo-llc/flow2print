import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { SessionOrScopeGuard } from "../../common/guards/auth.guard.js";
import { Scopes } from "../../common/decorators/scopes.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { launchSessionRequestSchema } from "@flow2print/http-sdk";

@ApiTags("launch-sessions")
@Controller("v1/launch-sessions")
@UseGuards(SessionOrScopeGuard)
@Roles("admin", "manager")
@Scopes("commerce:write", "projects:write")
@ApiBearerAuth()
export class LaunchSessionsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Post()
  @ApiOperation({ summary: "Create launch session" })
  async create(@Body() body: unknown) {
    const parsed = launchSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: "invalid_launch_request",
        issues: parsed.error.issues,
      };
    }

    const launchSession = await this.store.instance.createLaunchSession(
      parsed.data,
    );
    const designerAppUrl = process.env.DESIGNER_APP_URL ?? "";

    return {
      launchSessionId: launchSession.id,
      projectId: launchSession.projectId,
      designerUrl: designerAppUrl
        ? `${designerAppUrl}/designer/launch/${launchSession.id}`
        : `/designer/launch/${launchSession.id}`,
      expiresAt: launchSession.expiresAt,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get launch session by ID" })
  async get(@Param("id") id: string) {
    const session = await this.store.instance.getLaunchSession(id);
    if (!session) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "launch_session_not_found",
      };
    }
    return session;
  }
}
