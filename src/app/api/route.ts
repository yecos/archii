import { NextResponse } from "next/server";

/**
 * GET /api
 * ArchiFlow API health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    name: "ArchiFlow API",
    version: "2.0.0",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
