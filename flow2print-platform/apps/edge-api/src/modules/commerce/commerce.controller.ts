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
import {
  CreateQuoteLinkDto,
  CreateOrderLinkDto,
  ReorderDto,
} from "./dto/commerce.dto.js";

@ApiTags("commerce")
@Controller("v1/connectors/magento2")
@UseGuards(SessionOrScopeGuard)
@Roles("admin", "manager")
@Scopes("commerce:read", "projects:read")
@ApiBearerAuth()
export class CommerceController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Post("reorders")
  @Scopes("commerce:write", "projects:write")
  @ApiOperation({ summary: "Create reorder from project" })
  async reorder(@Body() body: ReorderDto) {
    const cloned = await this.store.instance.cloneProjectForReorder(
      body.projectId,
    );
    if (!cloned) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return { projectId: cloned.id, state: cloned.status };
  }

  @Post("quote-links")
  @Scopes("commerce:write")
  @ApiOperation({ summary: "Create quote link" })
  async createQuoteLink(@Body() body: CreateQuoteLinkDto) {
    const link = await this.store.instance.createQuoteLink({
      projectId: body.projectId,
      externalQuoteRef: body.externalQuoteRef,
      externalStoreId: body.externalStoreId,
      externalProductRef: body.externalProductRef,
      externalCustomerRef: body.externalCustomerRef,
      returnUrl: body.returnUrl,
    });
    if (!link) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return link;
  }

  @Post("order-links")
  @Scopes("commerce:write")
  @ApiOperation({ summary: "Create order link" })
  async createOrderLink(@Body() body: CreateOrderLinkDto) {
    const link = await this.store.instance.createOrderLink({
      projectId: body.projectId,
      externalOrderRef: body.externalOrderRef,
      externalStoreId: body.externalStoreId,
      externalProductRef: body.externalProductRef,
      externalCustomerRef: body.externalCustomerRef,
      returnUrl: body.returnUrl,
    });
    if (!link) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return link;
  }

  @Get("projects/:projectId/status")
  @ApiOperation({ summary: "Get commerce status for project" })
  async getStatus(@Param("projectId") projectId: string) {
    const status = await this.store.instance.getCommerceStatus(projectId);
    if (!status) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return status;
  }
}
