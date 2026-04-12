import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/onedrive/upload
 * Uploads a file to a specific OneDrive folder.
 * Accepts FormData with: file (File), folderId (string)
 */

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get('x-ms-access-token');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string | null;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!folderId) {
      return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
    }

    // For files < 4MB, use simple upload. For larger files, would need upload session.
    const graphUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(file.name)}:/content`;

    const response = await fetch(graphUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (response.status === 401) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[OneDrive Upload] Graph API error:', errorData);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[OneDrive Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
