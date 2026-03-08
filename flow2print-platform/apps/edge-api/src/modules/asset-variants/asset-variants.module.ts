import { Module } from "@nestjs/common";
import { RuntimeStoreModule } from "../../services/runtime-store.module.js";
import { AssetVariantsController } from "./asset-variants.controller.js";

@Module({
  imports: [RuntimeStoreModule],
  controllers: [AssetVariantsController]
})
export class AssetVariantsModule {}
