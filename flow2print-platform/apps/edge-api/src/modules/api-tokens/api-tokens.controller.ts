import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AdminGuard, CurrentSession } from "../../common/index.js";
import type { SessionWithUser } from "../../common/index.js";
import { CreateApiTokenDto, UpdateApiTokenDto } from "./dto/api-tokens.dto.js";

@ApiTags("api-tokens")
@Controller("v1/api-tokens")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class ApiTokensController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List all API tokens (admin only)" })
  async list() {
    return { docs: await this.store.instance.listApiTokens() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get API token by ID (admin only)" })
  async get(@Param("id") id: string) {
    const record = await this.store.instance.getApiToken(id);
    if (!record) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "api_token_not_found" };
    }
    return record;
  }

  @Post()
  @ApiOperation({ summary: "Create API token (admin only)" })
  async create(
    @Body() body: CreateApiTokenDto,
    @CurrentSession() session: SessionWithUser | null,
  ) {
    const created = await this.store.instance.createApiToken({
      label: body.label,
      scopes: body.scopes,
      expiresAt: body.expiresAt ?? null,
      createdByUserId: session?.user.id ?? null,
    });
    return { ...created.record, token: created.token };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update API token (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateApiTokenDto) {
    const token = await this.store.instance.updateApiToken(id, body);
    if (!token) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "api_token_not_found" };
    }
    return token;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete API token (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteApiToken(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "api_token_not_found" };
    }
    return { ok: true };
  }
}
