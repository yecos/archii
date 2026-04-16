/**
 * /api/ai-chat-history — Persist AI chat sessions to Firestore.
 * GET: Load sessions for the authenticated user.
 * PUT: Save/update a session.
 * DELETE: Delete a specific session.
 */

import { requireAuth } from '@/lib/api-auth';
import { getAdminDb, getAdminFieldValue } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

const MAX_SESSIONS = 20;
const MAX_MESSAGES = 50;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = getAdminDb();
    const FV = getAdminFieldValue();

    const snap = await db
      .collection('users')
      .doc(user.uid)
      .collection('aiSessions')
      .orderBy('updatedAt', 'desc')
      .limit(MAX_SESSIONS)
      .get();

    const sessions = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Conversacion',
        projectContext: data.projectContext || '',
        projectId: data.projectId || undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        messages: (data.messages || []).slice(-MAX_MESSAGES),
      };
    });

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ChatHistory GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = getAdminDb();
    const FV = getAdminFieldValue();

    const body = await request.json();
    const { sessionId, title, messages, projectContext, projectId } = body as {
      sessionId: string;
      title: string;
      messages: Array<{
        id: string;
        role: string;
        content: string;
        timestamp: string;
        images?: string[];
        toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: string; status?: string }>;
      }>;
      projectContext?: string;
      projectId?: string;
    };

    if (!sessionId || !title) {
      return NextResponse.json({ error: 'Se requiere sessionId y title' }, { status: 400 });
    }

    const sessionRef = db
      .collection('users')
      .doc(user.uid)
      .collection('aiSessions')
      .doc(sessionId);

    const messagesData = (messages || []).slice(-MAX_MESSAGES).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      images: m.images || undefined,
      toolCalls: m.toolCalls || undefined,
    }));

    await sessionRef.set({
      title,
      projectContext: projectContext || '',
      projectId: projectId || '',
      messages: messagesData,
      updatedAt: FV.serverTimestamp(),
      createdAt: FV.serverTimestamp(), // overwrite only on first create — Firestore set() will keep existing if we use merge, but we want overwrite
    }, { merge: true });

    return NextResponse.json({ success: true, sessionId });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ChatHistory PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Se requiere sessionId' }, { status: 400 });
    }

    await db
      .collection('users')
      .doc(user.uid)
      .collection('aiSessions')
      .doc(sessionId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[ChatHistory DELETE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
