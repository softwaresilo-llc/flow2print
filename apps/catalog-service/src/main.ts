import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";
import { sampleDocument } from "@flow2print/design-document";

@Controller()
class CatalogController {
  @Get("/health")
  getHealth() {
    return {
      service: "catalog-service",
      status: "ok"
    };
  }

  @Get("/v1/blueprints")
  getBlueprints() {
    return [
      {
        id: sampleDocument.blueprintVersionId,
        blueprintId: "bp_business_card",
        label: "Business Card",
        kind: "flat",
        surfaces: sampleDocument.surfaces.map((surface) => ({
          surfaceId: surface.surfaceId,
          label: surface.label,
          artboard: surface.artboard
        }))
      }
    ];
  }
}

@Module({
  controllers: [CatalogController]
})
class CatalogModule {}

void bootstrapHttpService({
  name: "catalog-service",
  port: 4002,
  module: CatalogModule
});

