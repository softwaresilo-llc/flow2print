import { Module } from "@nestjs/common";
import { RuntimeStoreModule } from "../../services/runtime-store.module.js";
import { FontFamiliesController } from "./font-families.controller.js";

@Module({
  imports: [RuntimeStoreModule],
  controllers: [FontFamiliesController]
})
export class FontFamiliesModule {}
