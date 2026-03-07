import { Module } from "@nestjs/common";
import { BlueprintsController } from "./blueprints.controller.js";

@Module({
  controllers: [BlueprintsController],
})
export class BlueprintsModule {}
