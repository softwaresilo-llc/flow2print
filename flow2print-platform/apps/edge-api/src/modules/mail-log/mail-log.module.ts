import { Module } from "@nestjs/common";
import { MailLogController } from "./mail-log.controller.js";

@Module({
  controllers: [MailLogController],
})
export class MailLogModule {}
