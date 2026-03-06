import "reflect-metadata";
import { Controller, Get, Module } from "@nestjs/common";
import { bootstrapHttpService } from "@flow2print/service-kit";

@Controller()
class ConnectorController {
  @Get("/health")
  getHealth() {
    return {
      service: "commerce-connector-service",
      status: "ok"
    };
  }

  @Get("/v1/connectors/magento2/status")
  getMagentoStatus() {
    return {
      connectorType: "magento2",
      mode: "redirect-first",
      supportedFeatures: ["launch-session", "quote-link", "order-link", "reorder"]
    };
  }
}

@Module({
  controllers: [ConnectorController]
})
class ConnectorModule {}

void bootstrapHttpService({
  name: "commerce-connector-service",
  port: 4007,
  module: ConnectorModule
});

