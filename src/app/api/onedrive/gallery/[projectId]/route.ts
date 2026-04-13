import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar la carpeta del proyecto dentro de ArchiFlow
    const rootResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/drive/root/children',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const rootData = await rootResponse.json();

    const archiFolder = rootData.value?.find(
      (f: any) => f.name === 'ArchiFlow' && f.folder
    );

    if (!archiFolder) {
      return NextResponse.json({ photos: [] });
    }

    const projResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${archiFolder.id}/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const projData = await projResponse.json();

    const projFolder = projData.value?.find(
      (f: any) => f.name === projectId && f.folder
    );

    if (!projFolder) {
      return NextResponse.json({ photos: [] });
    }

    // Listar archivos de imagen en la carpeta del proyecto
    const filesResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${projFolder.id}/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const filesData = await filesResponse.json();

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const photos = (filesData.value || []).filter((f: any) => {
      const ext = f.name?.split('.').pop()?.toLowerCase() || '';
      return imageExtensions.includes(ext);
    }).map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      thumbnails: f.thumbnails,
      createdDateTime: f.createdDateTime,
      '@microsoft.graph.downloadUrl': f['@microsoft.graph.downloadUrl'],
    }));

    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error('[ArchiFlow] /api/onedrive/gallery/[projectId] error:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    );
  }
}
