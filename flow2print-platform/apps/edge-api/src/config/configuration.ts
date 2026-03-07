import { readBaseServiceConfig, readPublicAppConfig } from "@flow2print/config";

export default () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  serviceName: process.env.SERVICE_NAME ?? "edge-api",
  designerAppUrl: process.env.DESIGNER_APP_URL ?? "",
  ...readBaseServiceConfig({
    ...process.env,
    SERVICE_NAME: process.env.SERVICE_NAME ?? "edge-api",
    PORT: process.env.PORT ?? "3000",
  }),
  ...readPublicAppConfig(process.env),
});
