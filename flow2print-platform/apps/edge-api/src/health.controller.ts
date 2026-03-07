import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator.js";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("healthz")
  @Public()
  @ApiOperation({ summary: "Health check" })
  healthz() {
    return {
      ok: true,
      service: "edge-api",
      framework: "nestjs",
    };
  }
}
