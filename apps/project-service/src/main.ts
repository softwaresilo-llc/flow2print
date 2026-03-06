import "reflect-metadata";
import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";
import { sampleDocument, validateDocument } from "@flow2print/design-document";

@Controller()
class ProjectController {
  @Get("/health")
  getHealth() {
    return {
      service: "project-service",
      status: "ok"
    };
  }

  @Get("/v1/projects/demo")
  getDemoProject() {
    return {
      id: sampleDocument.projectId,
      activeVersionId: sampleDocument.projectVersionId,
      document: sampleDocument
    };
  }

  @Post("/v1/projects")
  createProject(@Body() payload: unknown) {
    const overrides = typeof payload === "object" && payload !== null ? payload : {};
    const parsed = validateDocument({
      ...sampleDocument,
      ...overrides
    });

    return {
      id: parsed.projectId,
      activeVersionId: parsed.projectVersionId,
      document: parsed
    };
  }

  @Post("/v1/projects/:id/finalize")
  finalizeProject(@Param("id") projectId: string) {
    return {
      id: projectId,
      finalVersionId: `${projectId}_final_v1`,
      state: "finalized"
    };
  }
}

@Module({
  controllers: [ProjectController]
})
class ProjectModule {}

void bootstrapHttpService({
  name: "project-service",
  port: 4004,
  module: ProjectModule
});
