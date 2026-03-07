import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AdminGuard } from "../../common/guards/auth.guard.js";
import { UpdateRoleDto } from "./dto/roles.dto.js";

@ApiTags("roles")
@Controller("v1/roles")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List all roles (admin only)" })
  async list() {
    return { docs: await this.store.instance.listRoles() };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get role by ID (admin only)" })
  async get(@Param("id") id: string) {
    const role = await this.store.instance.getRole(id);
    if (!role) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "role_not_found" };
    }
    return role;
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update role (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateRoleDto) {
    const role = await this.store.instance.updateRole(id, body);
    if (!role) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "role_not_found" };
    }
    return role;
  }
}
