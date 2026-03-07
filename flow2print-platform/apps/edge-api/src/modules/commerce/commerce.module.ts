import { Module } from "@nestjs/common";
import { CommerceController } from "./commerce.controller.js";

@Module({
  controllers: [CommerceController],
})
export class CommerceModule {}
