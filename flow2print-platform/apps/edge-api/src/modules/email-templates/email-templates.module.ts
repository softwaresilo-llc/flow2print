import { Module } from "@nestjs/common";
import { EmailTemplatesController } from "./email-templates.controller.js";

@Module({
  controllers: [EmailTemplatesController],
})
export class EmailTemplatesModule {}
