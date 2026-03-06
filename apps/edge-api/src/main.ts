import "reflect-metadata";
import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";
import { sampleDocument } from "@flow2print/design-document";
import { eventExchangeNames } from "@flow2print/event-contracts";

interface LaunchSessionRequest {
  externalProductRef: string;
  externalStoreId: string;
  returnUrl: string;
}

@Controller()
class EdgeApiController {
  @Get("/health")
  getHealth() {
    return {
      service: "edge-api",
      status: "ok"
    };
  }

  @Get("/v1/meta")
  getMeta() {
    return {
      service: "edge-api",
      exchanges: eventExchangeNames,
      routes: ["/v1/launch-sessions", "/v1/projects/:id/finalize"]
    };
  }

  @Post("/v1/launch-sessions")
  createLaunchSession(@Body() request: LaunchSessionRequest) {
    return {
      launchSessionId: "lsn_demo_001",
      projectId: sampleDocument.projectId,
      designerUrl: `http://localhost:4173/designer/launch/lsn_demo_001?product=${request.externalProductRef}`,
      returnUrl: request.returnUrl,
      storeId: request.externalStoreId
    };
  }

  @Post("/v1/projects/:id/finalize")
  finalizeProject(@Param("id") projectId: string) {
    return {
      projectId,
      finalVersionId: `${projectId}_v_final`,
      jobId: "job_finalize_demo_001",
      status: "queued"
    };
  }
}

@Module({
  controllers: [EdgeApiController]
})
class EdgeApiModule {}

void bootstrapHttpService({
  name: "edge-api",
  port: 4000,
  module: EdgeApiModule
});

