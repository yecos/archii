import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError, isPlatformAdminEmail } from "@/lib/api-auth";

/**
 * GET /api/admin-emails
 *
 * Compatibility endpoint that returns only whether the authenticated caller is
 * a platform Admin. The ADMIN_EMAILS list never leaves the server.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    return NextResponse.json({ isAdmin: isPlatformAdminEmail(user.email) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
  }
}
