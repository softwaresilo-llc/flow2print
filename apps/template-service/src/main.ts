import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";

@Controller()
class TemplateController {
  @Get("/health")
  getHealth() {
    return {
      service: "template-service",
      status: "ok"
    };
  }

  @Get("/v1/templates")
  getTemplates() {
    return [
      {
        id: "tpl_business_card_clean",
        version: "1.0.0",
        blueprintId: "bp_business_card",
        label: "Business Card Clean"
      }
    ];
  }
}

@Module({
  controllers: [TemplateController]
})
class TemplateModule {}

void bootstrapHttpService({
  name: "template-service",
  port: 4003,
  module: TemplateModule
});

