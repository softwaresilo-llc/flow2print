import { Module } from "@nestjs/common";
import { RuntimeStoreModule } from "../../services/runtime-store.module.js";
import { FontFilesController } from "./font-files.controller.js";

@Module({
  imports: [RuntimeStoreModule],
  controllers: [FontFilesController]
})
export class FontFilesModule {}
