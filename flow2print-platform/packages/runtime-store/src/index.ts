import { getDatabaseRuntimeStore, readDatabaseUrl } from "@flow2print/database";

let store: ReturnType<typeof getDatabaseRuntimeStore> | null = null;

export const getRuntimeStore = () => {
  if (!readDatabaseUrl()) {
    throw new Error("database_url_missing");
  }

  if (!store) {
    store = getDatabaseRuntimeStore();
  }

  return store;
};
