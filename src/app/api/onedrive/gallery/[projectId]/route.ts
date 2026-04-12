import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/onedrive/gallery/[projectId]
 * Returns OneDrive files for a specific project folder.
 * The access token is passed via x-ms-access-token header.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const accessToken = req.headers.get('x-ms-access-token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    // Search for a folder named with the projectId or project name
    const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/children?$filter=name eq '${projectId}'&$top=1`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (searchRes.status === 401) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.value && searchData.value.length > 0) {
        const folder = searchData.value[0];
        // Get files inside the project folder
        const filesUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folder.id}/children?$top=100&$orderby=name`;

        const filesRes = await fetch(filesUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (filesRes.status === 401) {
          return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
        }

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          return NextResponse.json({
            folderId: folder.id,
            folderName: folder.name,
            files: filesData.value || [],
          });
        }
      }
    }

    // No folder found — return empty
    return NextResponse.json({ folderId: null, folderName: null, files: [] });
  } catch (error: any) {
    console.error('[OneDrive Gallery] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
