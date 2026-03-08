import { Module } from "@nestjs/common";
import { SystemInfoController } from "./system-info.controller.js";

@Module({
  controllers: [SystemInfoController]
})
export class SystemInfoModule {}
