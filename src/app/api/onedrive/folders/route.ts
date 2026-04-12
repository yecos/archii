import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/onedrive/folders
 * Creates a folder in OneDrive.
 * Body: { parentFolderId: string, folderName: string }
 */

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('x-ms-access-token');
    const { parentFolderId, folderName } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!parentFolderId || !folderName) {
      return NextResponse.json(
        { error: 'parentFolderId and folderName are required' },
        { status: 400 }
      );
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;

    const response = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    });

    if (response.status === 401) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[OneDrive Folders] Graph API error:', errorData);
      return NextResponse.json({ error: 'Failed to create folder' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[OneDrive Folders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
