import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";

@Controller()
class ProductionController {
  @Get("/health")
  getHealth() {
    return {
      service: "production-service",
      status: "ok"
    };
  }

  @Get("/v1/jobs/demo")
  getDemoJob() {
    return {
      id: "job_demo_001",
      jobType: "preview",
      status: "queued"
    };
  }
}

@Module({
  controllers: [ProductionController]
})
class ProductionModule {}

void bootstrapHttpService({
  name: "production-service",
  port: 4006,
  module: ProductionModule
});

