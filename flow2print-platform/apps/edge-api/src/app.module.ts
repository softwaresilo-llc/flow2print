import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./common/guards/auth.guard.js";
import { RuntimeStoreService } from "./services/runtime-store.service.js";
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
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { AssetsModule } from "./modules/assets/assets.module.js";
import { LaunchSessionsModule } from "./modules/launch-sessions/launch-sessions.module.js";
import { CommerceModule } from "./modules/commerce/commerce.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ port: parseInt(process.env.PORT ?? "3000", 10) })],
    }),
    AuthModule,
    UsersModule,
    ApiTokensModule,
    RolesModule,
    EmailTemplatesModule,
    MailLogModule,
    SettingsModule,
    BlueprintsModule,
    TemplatesModule,
    ProjectsModule,
    AssetsModule,
    LaunchSessionsModule,
    CommerceModule,
  ],
  controllers: [HealthController],
  providers: [
    RuntimeStoreService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
