/**
 * api-auth.ts
 * Firebase ID token verification utilities for API routes.
 * Provides authenticateRequest, requireAuth, and requireAdmin helpers.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || "yecos11@gmail.com").split(",").map(e => e.trim().toLowerCase());

export interface AuthUser {
  uid: string;
  email: string;
  role?: string;
}

export interface AuthError {
  reason: string;
  detail?: string;
}

/**
 * Authenticate a request by verifying the Firebase ID token from the Authorization header.
 * Returns the decoded user info on success, or null on failure.
 * If an error occurs, the error info is stored and can be retrieved.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[ArchiFlow Auth] Missing or malformed Authorization header");
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      console.warn("[ArchiFlow Auth] Empty Bearer token");
      return null;
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      role: decodedToken.role,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("auth/id-token-expired") ||
        error.message.includes("token expired")
      ) {
        console.warn("[ArchiFlow Auth] Token expired");
      } else if (
        error.message.includes("auth/invalid-id-token") ||
        error.message.includes("invalid token")
      ) {
        console.warn("[ArchiFlow Auth] Invalid token");
      } else {
        console.warn("[ArchiFlow Auth] Verification failed:", error.message);
      }
    } else {
      console.warn("[ArchiFlow Auth] Unknown verification error:", error);
    }
    return null;
  }
}

/**
 * Authenticate and return detailed error info.
 * Use this for debugging auth issues.
 */
export async function authenticateRequestDebug(
  request: NextRequest
): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return { user: null, error: { reason: "missing_header", detail: "No Authorization header found" } };
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken) {
      return { user: null, error: { reason: "empty_token", detail: "Bearer token is empty" } };
    }

    if (!idToken.startsWith("eyJ")) {
      return { user: null, error: { reason: "malformed_token", detail: `Token does not look like a JWT (starts with: ${idToken.substring(0, 10)})` } };
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        role: decodedToken.role,
      },
      error: null,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Categorize the error
    let reason = "unknown";
    if (msg.includes("auth/id-token-expired") || msg.includes("token expired")) {
      reason = "token_expired";
    } else if (msg.includes("auth/id-token-revoked")) {
      reason = "token_revoked";
    } else if (msg.includes("auth/invalid-id-token") || msg.includes("invalid token")) {
      reason = "invalid_token";
    } else if (msg.includes("PROJECT_MISMATCH")) {
      reason = "project_mismatch";
    } else if (msg.includes("Could not load") || msg.includes("credential")) {
      reason = "credential_error";
    } else if (msg.includes("network") || msg.includes("fetch")) {
      reason = "network_error";
    }

    console.error("[ArchiFlow Auth] Debug verification error:", { reason, msg, stack: stack?.substring(0, 200) });

    return {
      user: null,
      error: { reason, detail: msg },
    };
  }
}

/**
 * Require authentication. Returns the user on success, or throws a 401 response.
 * Usage: const user = await requireAuth(request);
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthUser> {
  const user = await authenticateRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "No autenticado. Se requiere un token válido." },
      { status: 401 }
    ) as unknown as AuthUser;
  }

  return user;
}

/**
 * Require authentication AND admin role.
 * Returns the user on success, or throws a 401/403 response.
 * Usage: const user = await requireAdmin(request);
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (!user.email) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401 }
    ) as unknown as AuthUser;
  }

  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.warn(
      `[ArchiFlow Auth] Non-admin access attempt by ${user.email}`
    );
    return NextResponse.json(
      { error: "No autorizado. Se requieren permisos de administrador.", email: user.email },
      { status: 403 }
    ) as unknown as AuthUser;
  }

  return user;
}
