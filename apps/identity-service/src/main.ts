import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";

@Controller()
class IdentityController {
  @Get("/health")
  getHealth() {
    return {
      service: "identity-service",
      status: "ok"
    };
  }

  @Get("/v1/users/demo")
  getDemoUser() {
    return {
      id: "usr_demo_001",
      email: "demo@flow2print.local",
      displayName: "Flow2Print Demo",
      roles: ["org_admin"]
    };
  }
}

@Module({
  controllers: [IdentityController]
})
class IdentityModule {}

void bootstrapHttpService({
  name: "identity-service",
  port: 4001,
  module: IdentityModule
});

