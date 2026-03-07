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
import { Public } from "../../common/decorators/public.decorator.js";
import {
  CreateBlueprintDto,
  UpdateBlueprintDto,
} from "./dto/blueprints.dto.js";

@ApiTags("blueprints")
@Controller("v1/blueprints")
@ApiBearerAuth()
export class BlueprintsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List all blueprints" })
  async list() {
    return { docs: await this.store.instance.getBlueprints() };
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Create blueprint (admin only)" })
  async create(@Body() body: CreateBlueprintDto) {
    return this.store.instance.createBlueprint({
      displayName: body.displayName,
      kind: body.kind,
    });
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Update blueprint (admin only)" })
  async update(@Param("id") id: string, @Body() body: UpdateBlueprintDto) {
    const blueprint = await this.store.instance.updateBlueprint(id, body);
    if (!blueprint) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "blueprint_not_found" };
    }
    return blueprint;
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Delete blueprint (admin only)" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteBlueprint(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "blueprint_not_found" };
    }
    return { ok: true };
  }
}
