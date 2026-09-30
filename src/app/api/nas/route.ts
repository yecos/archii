import { NextRequest, NextResponse } from 'next/server';
import { requireNasAccess, NasAccessError } from '@/lib/nas-auth';
import { nasBridgeFetch, nasQuery, NasBridgeError } from '@/lib/nas-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(error: unknown) {
  if (error instanceof NasAccessError || error instanceof NasBridgeError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : 'Error interno';
  console.error('[NAS API]', message);
  return NextResponse.json({ error: message, code: 'NAS_INTERNAL_ERROR' }, { status: 500 });
}

function requestContext(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    action: searchParams.get('action') || 'status',
    tenantId: searchParams.get('tenantId') || '',
    projectId: searchParams.get('projectId') || '',
    path: searchParams.get('path') || '',
    name: searchParams.get('name') || '',
  };
}

export async function GET(request: NextRequest) {
  const ctx = requestContext(request);

  try {
    const { config } = await requireNasAccess(
      request,
      ctx.tenantId,
      ctx.projectId || undefined
    );

    if (ctx.action === 'status') {
      const response = await nasBridgeFetch(config, '/health');
      const data = await response.json();
      return NextResponse.json({
        enabled: true,
        tenantId: ctx.tenantId,
        projectId: ctx.projectId || null,
        storage: 's10-nas',
        bridge: data,
      });
    }

    if (!ctx.projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    if (ctx.action === 'list') {
      const response = await nasBridgeFetch(
        config,
        '/files' + nasQuery({ projectId: ctx.projectId, path: ctx.path })
      );
      return NextResponse.json(await response.json());
    }

    if (ctx.action === 'download') {
      if (!ctx.path) {
        return NextResponse.json({ error: 'path es requerido' }, { status: 400 });
      }

      const response = await nasBridgeFetch(
        config,
        '/download' + nasQuery({ projectId: ctx.projectId, path: ctx.path }),
        { headers: { Accept: '*/*' } }
      );

      const headers = new Headers();
      headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
      const length = response.headers.get('Content-Length');
      const disposition = response.headers.get('Content-Disposition');
      if (length) headers.set('Content-Length', length);
      if (disposition) headers.set('Content-Disposition', disposition);
      headers.set('Cache-Control', 'private, no-store');

      return new NextResponse(response.body, { status: 200, headers });
    }

    return NextResponse.json({ error: 'Acción GET no soportada' }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = requestContext(request);

  try {
    if (!ctx.projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    const { config } = await requireNasAccess(request, ctx.tenantId, ctx.projectId);
    const body = await request.json().catch(() => ({}));

    if (ctx.action === 'ensure') {
      const response = await nasBridgeFetch(config, '/projects/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: ctx.projectId }),
      });
      return NextResponse.json(await response.json());
    }

    if (ctx.action === 'folder') {
      const response = await nasBridgeFetch(config, '/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: ctx.projectId,
          path: String(body.path || ''),
          name: String(body.name || ''),
        }),
      });
      return NextResponse.json(await response.json());
    }

    if (ctx.action === 'move') {
      const response = await nasBridgeFetch(config, '/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: ctx.projectId,
          path: String(body.path || ''),
          destination: String(body.destination || ''),
        }),
      });
      return NextResponse.json(await response.json());
    }

    return NextResponse.json({ error: 'Acción POST no soportada' }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  const ctx = requestContext(request);

  try {
    if (ctx.action !== 'upload') {
      return NextResponse.json({ error: 'Acción PUT no soportada' }, { status: 400 });
    }
    if (!ctx.projectId || !ctx.name) {
      return NextResponse.json({ error: 'projectId y name son requeridos' }, { status: 400 });
    }

    const maxMb = Math.max(1, Math.min(20, Number(process.env.NAS_API_UPLOAD_MAX_MB || 4)));
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength && contentLength > maxMb * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `Archivo demasiado grande para el proxy web. Máximo ${maxMb} MB en esta fase.`,
          code: 'NAS_UPLOAD_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    const { config } = await requireNasAccess(request, ctx.tenantId, ctx.projectId);
    const payload = await request.arrayBuffer();
    if (payload.byteLength > maxMb * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `Archivo demasiado grande para el proxy web. Máximo ${maxMb} MB en esta fase.`,
          code: 'NAS_UPLOAD_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    const response = await nasBridgeFetch(
      config,
      '/upload' + nasQuery({
        projectId: ctx.projectId,
        path: ctx.path,
        name: ctx.name,
      }),
      {
        method: 'PUT',
        headers: {
          'Content-Type': request.headers.get('content-type') || 'application/octet-stream',
          'Content-Length': String(payload.byteLength),
        },
        body: payload,
      }
    );

    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = requestContext(request);

  try {
    if (ctx.action !== 'rename') {
      return NextResponse.json({ error: 'Acción PATCH no soportada' }, { status: 400 });
    }
    if (!ctx.projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 });
    }

    const { config } = await requireNasAccess(request, ctx.tenantId, ctx.projectId);
    const body = await request.json();

    const response = await nasBridgeFetch(config, '/rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: ctx.projectId,
        path: String(body.path || ''),
        newName: String(body.newName || ''),
      }),
    });

    return NextResponse.json(await response.json());
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = requestContext(request);

  try {
    if (ctx.action !== 'delete' || !ctx.projectId || !ctx.path) {
      return NextResponse.json({ error: 'Acción, projectId y path son requeridos' }, { status: 400 });
    }

    const { config } = await requireNasAccess(request, ctx.tenantId, ctx.projectId);
    const response = await nasBridgeFetch(
      config,
      '/files' + nasQuery({ projectId: ctx.projectId, path: ctx.path }),
      { method: 'DELETE' }
    );

    return NextResponse.json(await response.json());
  } catch (error) {
    return jsonError(error);
  }
}
