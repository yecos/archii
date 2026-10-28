import { spawn } from 'node:child_process';

// Never inherit a production project or credential into the browser test server.
const env = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-archii',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-local-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-archii.appspot.com',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-local-app',
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_ADMIN_CREDENTIALS: '',
  ADMIN_EMAILS: '',
  GEMINI_API_KEY: '',
};
const child = spawn(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:exec', '--project', 'demo-archii', '--only', 'firestore,auth', '--config', 'firebase.inventory-test.json', 'node scripts/inventory-e2e-app.mjs'], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
