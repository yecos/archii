import { spawn } from 'node:child_process';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-archii' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Las pruebas requieren exclusivamente Firebase local');
const app = initializeApp({ projectId: 'demo-archii' });
const auth = getAuth(app);
const user = await auth.createUser({ email: 'inventory-e2e@example.test', password: 'LocalInventory123!', displayName: 'Pruebas Inventario' });
const reader = await auth.createUser({ email: 'reader-e2e@example.test', password: 'LocalInventory123!', displayName: 'Lector Inventario' });
const db = getFirestore(app);
const batch = db.batch();
batch.set(db.doc('tenants/inventory-e2e'), { name: 'Empresa ficticia de pruebas', createdBy: user.uid, members: [user.uid, reader.uid], superAdmins: [], memberRoles: { [user.uid]: 'Director', [reader.uid]: 'Interventor' }, createdAt: FieldValue.serverTimestamp() });
for (const [account, role] of [[user, 'Director'], [reader, 'Interventor']]) batch.set(db.doc(`users/${account.uid}`), { name: account.displayName, email: account.email, role, defaultTenantId: 'inventory-e2e', defaultTenantName: 'Empresa ficticia de pruebas', createdAt: FieldValue.serverTimestamp() });
await batch.commit();
await db.terminate();
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--turbopack', '--port', '3100', '--hostname', '127.0.0.1'], { env: { ...process.env, NODE_ENV: 'development' }, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
