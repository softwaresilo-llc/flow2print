import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";

@Controller()
class AssetController {
  @Get("/health")
  getHealth() {
    return {
      service: "asset-service",
      status: "ok"
    };
  }

  @Get("/v1/assets")
  getAssets() {
    return [
      {
        id: "ast_logo_demo",
        kind: "image",
        filename: "logo.png",
        mimeType: "image/png"
      }
    ];
  }
}

@Module({
  controllers: [AssetController]
})
class AssetModule {}

void bootstrapHttpService({
  name: "asset-service",
  port: 4005,
  module: AssetModule
});

