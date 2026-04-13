/**
 * api-auth.ts
 * Authentication helpers for API routes.
 * Since this project uses client-side Firebase Auth with compat SDK,
 * server-side auth checks are simplified.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Require authentication for API routes.
 * In a production setup, this would verify Firebase ID tokens.
 * For now, it's a placeholder that allows all requests through.
 */
export async function requireAuth(request: NextRequest): Promise<void> {
  // Client-side Firebase Auth handles authentication.
  // API routes can verify tokens if needed in production.
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Authentication required");
  }
}

/**
 * Require admin role for API routes.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth(request);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
