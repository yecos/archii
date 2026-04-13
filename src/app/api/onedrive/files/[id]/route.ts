import { NextRequest, NextResponse } from 'next/server';

async function getValidToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

// GET: Descargar archivo de OneDrive
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getValidToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${id}/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(blob, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    console.error('[ArchiFlow] /api/onedrive/files/[id] GET error:', error);
    return NextResponse.json(
      { error: 'Error al descargar archivo', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Renombrar archivo en OneDrive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getValidToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al renombrar archivo' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ArchiFlow] /api/onedrive/files/[id] PATCH error:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar archivo de OneDrive
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getValidToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al eliminar archivo' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ArchiFlow] /api/onedrive/files/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    );
  }
}
