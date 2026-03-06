import type { AuthProvider } from "@refinedev/core";

import { requestJson, writeSessionToken, readSessionToken } from "./api.js";

interface LoginResponse {
  session: {
    token: string;
  };
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
  };
}

interface SessionResponse {
  session: LoginResponse["session"];
  user: LoginResponse["user"];
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const payload = await requestJson<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    writeSessionToken(payload.session.token);

    return {
      success: true,
      redirectTo: "/projects"
    };
  },
  logout: async () => {
    try {
      await requestJson("/v1/auth/logout", {
        method: "POST"
      });
    } catch {
      // session may already be gone
    }

    writeSessionToken(null);

    return {
      success: true,
      redirectTo: "/login"
    };
  },
  check: async () => {
    const token = readSessionToken();
    if (!token) {
      return {
        authenticated: false,
        redirectTo: "/login"
      };
    }

    try {
      await requestJson("/v1/auth/session", {
        method: "GET"
      });

      return {
        authenticated: true
      };
    } catch {
      writeSessionToken(null);
      return {
        authenticated: false,
        redirectTo: "/login"
      };
    }
  },
  getIdentity: async () => {
    const payload = await requestJson<SessionResponse>("/v1/auth/session", {
      method: "GET"
    });

    return {
      id: payload.user.id,
      name: payload.user.displayName,
      avatar: "",
      email: payload.user.email,
      role: payload.user.role
    };
  },
  getPermissions: async () => {
    const payload = await requestJson<SessionResponse>("/v1/auth/session", {
      method: "GET"
    });

    return payload.user.role;
  },
  onError: async (error) => {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("401") || message.includes("auth_required") || message.includes("session_not_found")) {
      writeSessionToken(null);
      return {
        logout: true,
        redirectTo: "/login"
      };
    }

    return { error };
  },
  forgotPassword: async ({ email }) => {
    await requestJson("/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });

    return {
      success: true,
      redirectTo: "/login"
    };
  },
  updatePassword: async ({ password, token }) => {
    await requestJson("/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ password, token })
    });

    return {
      success: true,
      redirectTo: "/login"
    };
  }
};
