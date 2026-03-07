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
import { AdminGuard } from "../../common/guards/auth.guard.js";
import { CreateUserDto, UpdateUserDto } from "./dto/users.dto.js";

@ApiTags("users")
@Controller("v1/users")
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @ApiOperation({ summary: "List all users (admin only)" })
  async list() {
    return { docs: await this.store.instance.listUsers() };
  }

  @Post()
  @ApiOperation({ summary: "Create user (admin only)" })
  async create(@Body() body: CreateUserDto) {
    const user = await this.store.instance.createUser({
      email: body.email,
      displayName: body.displayName,
      password: body.password,
      role: body.role,
    });
    if (!user) {
      return { statusCode: HttpStatus.CONFLICT, code: "user_already_exists" };
    }
    return user;
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateUserDto) {
    const user = await this.store.instance.updateUser(id, body);
    if (!user) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "user_not_found" };
    }
    if ("conflict" in user) {
      return { statusCode: HttpStatus.CONFLICT, code: "email_already_exists" };
    }
    return user;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete user (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteUser(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "user_not_found" };
    }
    return { ok: true };
  }
}
