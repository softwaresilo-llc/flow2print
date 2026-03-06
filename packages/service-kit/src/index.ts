import { Logger, Module, type Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";

export interface ServiceBootstrapOptions {
  name: string;
  port: number;
  module: Type<unknown>;
}

@Module({})
export class EmptyRootModule {}

export async function bootstrapHttpService(options: ServiceBootstrapOptions): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(options.module, new FastifyAdapter({
    logger: false
  }));

  await app.register(cors, {
    origin: true
  });

  app.enableShutdownHooks();
  await app.listen(options.port, "0.0.0.0");

  Logger.log(`${options.name} listening on ${options.port}`, "Flow2Print");
  return app;
}

