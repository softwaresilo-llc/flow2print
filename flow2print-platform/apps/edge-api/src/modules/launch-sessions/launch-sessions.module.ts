import { Module } from "@nestjs/common";
import { LaunchSessionsController } from "./launch-sessions.controller.js";

@Module({
  controllers: [LaunchSessionsController],
})
export class LaunchSessionsModule {}
