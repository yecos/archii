import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Verify ArchiFlow authentication from X-Firebase-Token header.
 * OneDrive routes use the Authorization header for MS access tokens,
 * so ArchiFlow auth is passed via a separate custom header.
 */
async function verifyArchiFlowAuth(request: NextRequest): Promise<boolean> {
  const fbToken = request.headers.get('x-firebase-token');
  if (!fbToken) return false;
  try {
    const user = await authenticateRequest({
      ...request,
      headers: new Headers({ 'authorization': `Bearer ${fbToken}` }),
    } as NextRequest);
    return !!user;
  } catch {
    return false;
  }
}

/**
 * Extract the MS access token from the Authorization header.
 */
function getAccessToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET — Download a file from OneDrive.
 * Returns the binary file with appropriate Content-Type and Content-Disposition.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    if (!(await verifyArchiFlowAuth(request))) {
      return NextResponse.json({ error: 'ArchiFlow authentication required' }, { status: 401 });
    }

    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const graphUrl = `${GRAPH_BASE}/me/drive/items/${id}/content`;

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    if (res.status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60';
      return NextResponse.json(
        { error: 'Throttled by Graph API', retryAfter: Number(retryAfter) },
        { status: 429 }
      );
    }
    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Graph API error: ${errBody}` }, { status: res.status });
    }

    // Get metadata to determine filename
    let filename = 'download';
    try {
      const metaRes = await fetch(`${GRAPH_BASE}/me/drive/items/${id}?$select=name,file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        filename = meta.name || 'download';
      }
    } catch {
      // If metadata fetch fails, use default filename
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[OneDrive File Download GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH — Rename or move a file in OneDrive.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    if (!(await verifyArchiFlowAuth(request))) {
      return NextResponse.json({ error: 'ArchiFlow authentication required' }, { status: 401 });
    }

    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, parentReference } = body;

    if (!name && !parentReference) {
      return NextResponse.json(
        { error: 'At least one of "name" or "parentReference" is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (parentReference) updateData.parentReference = parentReference;

    const graphUrl = `${GRAPH_BASE}/me/drive/items/${id}`;

    const res = await fetch(graphUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (res.status === 401) {
      return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    if (res.status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (res.status === 409) {
      return NextResponse.json({ error: 'Conflict — file with this name already exists' }, { status: 409 });
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60';
      return NextResponse.json(
        { error: 'Throttled by Graph API', retryAfter: Number(retryAfter) },
        { status: 429 }
      );
    }
    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Graph API error: ${errBody}` }, { status: res.status });
    }

    const updatedItem = await res.json();
    return NextResponse.json({ item: updatedItem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[OneDrive File PATCH]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE — Delete a file (or folder) from OneDrive.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    if (!(await verifyArchiFlowAuth(request))) {
      return NextResponse.json({ error: 'ArchiFlow authentication required' }, { status: 401 });
    }

    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const graphUrl = `${GRAPH_BASE}/me/drive/items/${id}`;

    const res = await fetch(graphUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    if (res.status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60';
      return NextResponse.json(
        { error: 'Throttled by Graph API', retryAfter: Number(retryAfter) },
        { status: 429 }
      );
    }
    // Graph API returns 204 No Content on successful delete
    if (!res.ok && res.status !== 204) {
      const errBody = await res.text();
      return NextResponse.json({ error: `Graph API error: ${errBody}` }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[OneDrive File DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
