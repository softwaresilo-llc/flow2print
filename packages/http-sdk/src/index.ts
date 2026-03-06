export interface ApiDescriptor {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
}

export const launchSessionApi: ApiDescriptor = {
  method: "POST",
  path: "/v1/launch-sessions",
  summary: "Create a launch session for an external commerce system."
};

export const projectFinalizeApi: ApiDescriptor = {
  method: "POST",
  path: "/v1/projects/:id/finalize",
  summary: "Finalize a project and trigger output jobs."
};

