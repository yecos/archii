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

/**
 * Authenticate a request by verifying the Firebase ID token from the Authorization header.
 * Returns the decoded user info on success, or null on failure.
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
      console.warn("[ArchiFlow Auth] Unknown verification error");
    }
    return null;
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
    throw NextResponse.json(
      { error: "No autenticado. Se requiere un token válido." },
      { status: 401 }
    );
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

  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.warn(
      `[ArchiFlow Auth] Non-admin access attempt by ${user.email}`
    );
    throw NextResponse.json(
      { error: "No autorizado. Se requieren permisos de administrador." },
      { status: 403 }
    );
  }

  return user;
}
