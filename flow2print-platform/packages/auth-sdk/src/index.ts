export interface AuthContext {
  actorId: string;
  tenantId: string;
  roles: string[];
}

export const systemAuthContext = (): AuthContext => ({
  actorId: "system",
  tenantId: "public",
  roles: ["system_admin"]
});
