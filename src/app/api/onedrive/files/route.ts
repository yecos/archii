import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/onedrive/files?folderId=xxx&top=50
 * Proxies file listing requests to Microsoft Graph API.
 * Avoids CORS issues and hides the access token from the browser.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = req.headers.get('x-ms-access-token');
    const folderId = searchParams.get('folderId');
    const top = searchParams.get('top') || '50';

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!folderId) {
      return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=${top}&orderby=name`;

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[OneDrive Files] Graph API error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[OneDrive Files] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
