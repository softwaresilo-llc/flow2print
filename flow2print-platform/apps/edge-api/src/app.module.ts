import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./common/guards/auth.guard.js";
import { RuntimeStoreModule } from "./services/runtime-store.module.js";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { ApiTokensModule } from "./modules/api-tokens/api-tokens.module.js";
import { RolesModule } from "./modules/roles/roles.module.js";
import { EmailTemplatesModule } from "./modules/email-templates/email-templates.module.js";
import { MailLogModule } from "./modules/mail-log/mail-log.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { BlueprintsModule } from "./modules/blueprints/blueprints.module.js";
import { TemplatesModule } from "./modules/templates/templates.module.js";
import { ArtifactsModule } from "./modules/artifacts/artifacts.module.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { AssetsModule } from "./modules/assets/assets.module.js";
import { AssetVariantsModule } from "./modules/asset-variants/asset-variants.module.js";
import { FontFamiliesModule } from "./modules/font-families/font-families.module.js";
import { FontFilesModule } from "./modules/font-files/font-files.module.js";
import { LaunchSessionsModule } from "./modules/launch-sessions/launch-sessions.module.js";
import { CommerceModule } from "./modules/commerce/commerce.module.js";
import { SystemInfoModule } from "./modules/system-info/system-info.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ port: parseInt(process.env.PORT ?? "3000", 10) })],
    }),
    RuntimeStoreModule,
    AuthModule,
    UsersModule,
    ApiTokensModule,
    RolesModule,
    EmailTemplatesModule,
    MailLogModule,
    SettingsModule,
    BlueprintsModule,
    TemplatesModule,
    ArtifactsModule,
    ProjectsModule,
    AssetsModule,
    AssetVariantsModule,
    FontFamiliesModule,
    FontFilesModule,
    LaunchSessionsModule,
    CommerceModule,
    SystemInfoModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
