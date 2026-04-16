/**
 * /api/external/[collection]/route.ts — Public API endpoint for external integrations.
 * Supports: projects, tasks, expenses collections.
 * Auth: Bearer token (API Key).
 * Rate limit: 100 req/min per key.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFirebase } from '@/lib/firebase-service';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;

const ALLOWED_COLLECTIONS = ['projects', 'tasks', 'expenses'];

function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    if (!ALLOWED_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: `Collection not found. Available: ${ALLOWED_COLLECTIONS.join(', ')}` }, { status: 404 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header. Use: Bearer afk_xxxx' }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);
    if (!apiKey.startsWith('afk_')) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
    }

    const db = getFirebase().firestore();
    const keyPrefix = apiKey.slice(0, 12) + '...';
    const keyDocs = await db.collection('apiKeys').where('keyPrefix', '==', keyPrefix).where('isActive', '==', true).limit(1).get();
    if (keyDocs.empty) {
      return NextResponse.json({ error: 'API key not found or revoked' }, { status: 401 });
    }

    if (!checkRateLimit(keyPrefix)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 100 req/min.' }, { status: 429 });
    }

    const keyDoc = keyDocs.docs[0];
    await keyDoc.ref.update({
      lastUsed: getFirebase().firestore.FieldValue.serverTimestamp(),
      requestCount: getFirebase().firestore.FieldValue.increment(1),
    });

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const snapshot = await db.collection(collection).orderBy('createdAt', 'desc').limit(limit).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalSnap = await db.collection(collection).get();
    const total = totalSnap.size;

    return NextResponse.json({ collection, data, total, limit });
  } catch (err: unknown) {
    console.error('[ArchiFlow] External API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
