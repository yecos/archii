import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/onedrive/token
 * Refreshes the Microsoft access token using a refresh token.
 * The client sends the refresh_token, and we exchange it via Azure AD.
 *
 * Required environment variables:
 * - AZURE_AD_CLIENT_ID: Azure AD App Registration Client ID
 * - AZURE_AD_CLIENT_SECRET: Azure AD App Registration Client Secret
 * - AZURE_AD_TENANT_ID: Azure AD Tenant ID (or "common" for multi-tenant)
 */

const AZURE_TOKEN_URL = 'https://login.microsoftonline.com';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken, uid } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 });
    }

    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const tenantId = process.env.AZURE_AD_TENANT_ID || 'consumers';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Azure AD credentials not configured on server' },
        { status: 500 }
      );
    }

    const tokenUrl = `${AZURE_TOKEN_URL}/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Files.ReadWrite offline_access openid profile email',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OneDrive Token] Azure error:', data);
      return NextResponse.json(
        { error: data.error_description || 'Failed to refresh token' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    });
  } catch (error: any) {
    console.error('[OneDrive Token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
