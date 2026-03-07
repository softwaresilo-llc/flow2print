import { Module } from "@nestjs/common";
import { ApiTokensController } from "./api-tokens.controller.js";

@Module({
  controllers: [ApiTokensController],
})
export class ApiTokensModule {}
