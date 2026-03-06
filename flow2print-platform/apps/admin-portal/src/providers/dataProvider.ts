import type { BaseRecord, DataProvider, GetListResponse } from "@refinedev/core";

import { API_URL, requestJson } from "./api.js";

const endpointMap: Record<string, string> = {
  projects: "projects",
  templates: "templates",
  blueprints: "blueprints",
  assets: "assets",
  users: "users",
  "api-tokens": "api-tokens",
  "mail-log": "mail-log",
  "email-templates": "email-templates",
  settings: "settings"
};

const withId = (resource: string, id: string | number) => `/v1/${endpointMap[resource]}/${id}`;
const withCollection = (resource: string) => `/v1/${endpointMap[resource]}`;

const extractDocs = <T extends BaseRecord>(payload: unknown): GetListResponse<T> => {
  if (payload && typeof payload === "object" && "docs" in (payload as Record<string, unknown>)) {
    const docs = ((payload as { docs: T[] }).docs ?? []) as T[];
    return {
      data: docs,
      total: docs.length
    };
  }

  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      total: payload.length
    };
  }

  return {
    data: [],
    total: 0
  };
};

const getOneViaCollection = async <T extends BaseRecord>(resource: string, id: string | number) => {
  const listPayload = await requestJson<unknown>(withCollection(resource), { method: "GET" });
  const docs = extractDocs<T>(listPayload).data;
  const record = docs.find((item) => `${item.id}` === `${id}`);

  if (!record) {
    throw new Error(`${resource}_not_found`);
  }

  return { data: record };
};

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,
  getList: async ({ resource }) => {
    const payload = await requestJson<unknown>(withCollection(resource), { method: "GET" });
    return extractDocs(payload);
  },
  getOne: async ({ resource, id }) => {
    if (resource === "projects") {
      return requestJson<BaseRecord>(withId(resource, id), { method: "GET" }).then((data) => ({ data }));
    }

    if (resource === "settings") {
      return requestJson<BaseRecord>(withCollection(resource), { method: "GET" }).then((data) => ({ data }));
    }

    return getOneViaCollection(resource, id);
  },
  create: async ({ resource, variables }) => {
    const data = await requestJson(withCollection(resource), {
      method: "POST",
      body: JSON.stringify(variables)
    });
    return { data };
  },
  update: async ({ resource, id, variables }) => {
    const data = await requestJson(withId(resource, id), {
      method: "PATCH",
      body: JSON.stringify(variables)
    });
    return { data };
  },
  deleteOne: async ({ resource, id }) => {
    await requestJson(withId(resource, id), {
      method: "DELETE"
    });
    return { data: { id } as BaseRecord };
  },
  getMany: async ({ resource, ids }) => {
    const listPayload = await requestJson<unknown>(withCollection(resource), { method: "GET" });
    const docs = extractDocs<BaseRecord>(listPayload).data.filter((item) => ids.map(String).includes(String(item.id)));
    return { data: docs as BaseRecord[] };
  },
  getManyReference: async ({ resource }: { resource: string }) => {
    const payload = await requestJson<unknown>(withCollection(resource), { method: "GET" });
    return extractDocs(payload);
  },
  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    const searchParams = new URLSearchParams();

    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (typeof value !== "undefined" && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }

    if (Array.isArray(filters)) {
      searchParams.set("filters", JSON.stringify(filters));
    }

    if (Array.isArray(sorters)) {
      searchParams.set("sorters", JSON.stringify(sorters));
    }

    const finalUrl = searchParams.size ? `${url}?${searchParams.toString()}` : url;
    const data = await requestJson(finalUrl, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined
    });

    return { data };
  }
} as DataProvider;
