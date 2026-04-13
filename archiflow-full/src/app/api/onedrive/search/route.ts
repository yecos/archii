import { NextRequest, NextResponse } from 'next/server';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Extract the MS access token from the Authorization header.
 */
function getAccessToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * GET — Search files in OneDrive using the Graph API search endpoint.
 * Optionally filters results from Firestore if projectId is provided.
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAccessToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const projectId = searchParams.get('projectId') || '';

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Search query "q" is required' }, { status: 400 });
    }

    const encodedQuery = encodeURIComponent(q.trim());
    const select = 'id,name,size,mimeType,file,folder';
    const graphUrl = `${GRAPH_BASE}/me/drive/root/search(q='${encodedQuery}')?$top=20&$select=${select}`;

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      return NextResponse.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
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

    const data = await res.json();
    let items = data.value || [];

    // If projectId is provided, try to filter results from Firestore
    // to only return items that belong to the project
    if (projectId) {
      try {
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const db = getAdminDb();

        // Get all drive item IDs for this project from Firestore
        const snapshot = await db
          .collection('onedrive_files')
          .where('projectId', '==', projectId)
          .select('driveItemId')
          .get();

        const projectDriveItemIds = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.driveItemId) {
            projectDriveItemIds.add(data.driveItemId);
          }
        });

        if (projectDriveItemIds.size > 0) {
          items = items.filter((item: Record<string, unknown>) =>
            projectDriveItemIds.has(item.id as string)
          );
        }
      } catch (firestoreErr) {
        // Firestore filter failure should not block the response — return all results
        console.error('[OneDrive Search] Firestore filter warning:', firestoreErr);
      }
    }

    return NextResponse.json({
      items,
      count: items.length,
      query: q.trim(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[OneDrive Search GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
