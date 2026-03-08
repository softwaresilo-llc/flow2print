import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __flow2printPrismaClient__: PrismaClient | undefined;
}

export const isPostgresPersistenceEnabled = () => {
  return Boolean(readDatabaseUrl());
};

export const readDatabaseUrl = () => {
  return process.env.DATABASE_URL ?? process.env.FLOW2PRINT_POSTGRES_URL ?? "";
};

export const getPrismaClient = () => {
  if (!globalThis.__flow2printPrismaClient__) {
    if (!readDatabaseUrl()) {
      throw new Error("database_url_missing");
    }
    globalThis.__flow2printPrismaClient__ = new PrismaClient();
  }

  return globalThis.__flow2printPrismaClient__;
};
