import { Injectable } from "@nestjs/common";
import { getRuntimeStore } from "@flow2print/runtime-store";

export type RuntimeStore = ReturnType<typeof getRuntimeStore>;

let storeInstance: RuntimeStore | null = null;

const getStore = (): RuntimeStore => {
  if (!storeInstance) {
    storeInstance = getRuntimeStore();
  }
  return storeInstance;
};

@Injectable()
export class RuntimeStoreService {
  private readonly _store = getStore();

  get instance(): RuntimeStore {
    return this._store;
  }
}
