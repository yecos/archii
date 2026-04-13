import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q');
    if (!q) {
      return NextResponse.json(
        { error: 'Query de busqueda requerida' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(q)}')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error en busqueda' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ArchiFlow] /api/onedrive/search error:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    );
  }
}
