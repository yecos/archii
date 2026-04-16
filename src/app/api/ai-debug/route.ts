/**
 * /api/ai-debug — Endpoint de diagnóstico para la IA.
 * Verifica si las API keys están configuradas, si Firebase Admin funciona,
 * y si la conexión Firestore es operativa.
 * Solo accesible para usuarios autenticados (no expone las keys).
 */

import { requireAuth } from '@/lib/api-auth';
import { testAdminConnection, getAdminInitStatus } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const checks: Array<{ name: string; ok: boolean; message: string }> = [];

    // 1. Check AI API keys (without revealing them)
    const groqKey = process.env.GROQ_API_KEY;
    checks.push({
      name: 'GROQ_API_KEY',
      ok: !!groqKey && groqKey.length > 10,
      message: groqKey ? `Configurada (${groqKey.slice(0, 6)}...${groqKey.slice(-4)})` : 'NO configurada',
    });

    const mistralKey = process.env.MISTRAL_API_KEY;
    checks.push({
      name: 'MISTRAL_API_KEY',
      ok: !!mistralKey && mistralKey.length > 10,
      message: mistralKey ? `Configurada (${mistralKey.slice(0, 6)}...${mistralKey.slice(-4)})` : 'NO configurada',
    });

    const openaiKey = process.env.OPENAI_API_KEY;
    checks.push({
      name: 'OPENAI_API_KEY',
      ok: !!openaiKey && openaiKey.length > 10,
      message: openaiKey ? `Configurada (${openaiKey.slice(0, 6)}...${openaiKey.slice(-4)})` : 'NO configurada',
    });

    // 2. Check Firebase Admin credentials
    const adminCreds = process.env.FIREBASE_ADMIN_CREDENTIALS;
    checks.push({
      name: 'FIREBASE_ADMIN_CREDENTIALS',
      ok: !!adminCreds,
      message: adminCreds ? 'Configuradas' : 'NO configuradas',
    });

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    checks.push({
      name: 'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
      ok: !!(clientEmail && privateKey),
      message: clientEmail ? `Configuradas (${clientEmail})` : 'NO configuradas',
    });

    const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    checks.push({
      name: 'GOOGLE_APPLICATION_CREDENTIALS',
      ok: !!gac,
      message: gac ? 'Configuradas' : 'NO configuradas',
    });

    // 3. Check project ID
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    checks.push({
      name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ok: !!projectId,
      message: projectId || 'NO configurado',
    });

    // 4. Check project mismatch
    const initStatus = getAdminInitStatus();
    checks.push({
      name: 'Admin SDK Init Method',
      ok: true,
      message: initStatus.method,
    });

    checks.push({
      name: 'Project ID (App)',
      ok: true,
      message: initStatus.projectId,
    });

    checks.push({
      name: 'Project ID (Credentials)',
      ok: !initStatus.mismatch,
      message: initStatus.credProjectId || 'No disponible',
    });

    checks.push({
      name: 'Project ID Match',
      ok: !initStatus.mismatch,
      message: initStatus.mismatch
        ? `CONFLICTO: App usa "${initStatus.projectId}" pero credenciales son para "${initStatus.credProjectId}"`
        : 'OK — Coinciden',
    });

    // 5. Test Firestore connection (real test)
    const connectionTest = await testAdminConnection();
    checks.push({
      name: 'Firestore Connection',
      ok: connectionTest.ok,
      message: connectionTest.ok
        ? 'Firestore funciona correctamente'
        : `ERROR: ${connectionTest.error?.substring(0, 150)}`,
    });

    // 6. Summary
    const aiKeysOk = checks.filter(c => ['GROQ_API_KEY', 'MISTRAL_API_KEY', 'OPENAI_API_KEY'].includes(c.name) && c.ok).length;
    const firestoreOk = connectionTest.ok;
    const anyCred = checks.filter(c => ['FIREBASE_ADMIN_CREDENTIALS', 'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'].includes(c.name) && c.ok).length > 0;

    let summary = '';
    if (initStatus.mismatch) {
      summary = `CONFLICTO DE PROYECTOS: La app usa "${initStatus.projectId}" pero las credenciales son para "${initStatus.credProjectId}". SOLUCION: Ve a Firebase Console del proyecto "${initStatus.projectId}" → Project Settings → Service Accounts → Generate New Private Key. Copia ese JSON y reemplaza FIREBASE_ADMIN_CREDENTIALS en Vercel.`;
    } else if (aiKeysOk === 0) {
      summary = 'NINGUNA API key de IA configurada. Agrega GROQ_API_KEY, MISTRAL_API_KEY u OPENAI_API_KEY en Vercel.';
    } else if (!firestoreOk) {
      summary = `Firestore NO funciona. Configura FIREBASE_ADMIN_CREDENTIALS con las credenciales del proyecto "${initStatus.projectId}" en Vercel → Settings → Environment Variables.`;
    } else {
      summary = `${aiKeysOk} API key(s) de IA OK. Firestore OK. Todo funciona.`;
    }

    return new Response(JSON.stringify({
      ok: aiKeysOk > 0 && firestoreOk,
      user: { uid: user.uid, email: user.email },
      aiKeysConfigured: aiKeysOk,
      firestoreWorking: firestoreOk,
      credentialsFound: anyCred,
      adminInit: initStatus,
      checks,
      summary,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      summary: `Error de autenticación: ${message}. Asegúrate de estar logueado.`,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
