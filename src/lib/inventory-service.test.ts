// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { executeInventory, type InventoryAction } from './inventory-service';
import { executeToolCall } from '@/app/api/ai-agent/_lib/execute-tool-call';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = 'demo-archii';
const main = 'Almacén Principal';
const reserve = 'Bodega Reserva';

describe.skipIf(!host)('inventory transactions against Firestore emulator', () => {
  const app = initializeApp({ projectId }, 'inventory-tests');
  const db = getFirestore(app);
  const run = (action: InventoryAction, data: Record<string, unknown>, requestId = randomUUID(), uid = 'director', tenant = 'company-a') => executeInventory(db, uid, tenant, requestId, action, data);
  const balance = async () => (await db.doc('invProducts/product-a').get()).data()!;
  const movements = async () => (await db.collection('invMovements').get()).docs;

  beforeAll(() => { db.settings({ ignoreUndefinedProperties: true }); });
  beforeEach(async () => {
    await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
    const batch = db.batch();
    batch.set(db.doc('tenants/company-a'), { createdBy: 'owner', members: ['director', 'reader', 'contractor'], memberRoles: { director: 'Director', reader: 'Miembro', contractor: 'Contratista' } });
    batch.set(db.doc('tenants/company-b'), { createdBy: 'other-owner', members: ['other-owner'] });
    batch.set(db.doc('invProducts/product-a'), { tenantId: 'company-a', name: 'Cemento', unit: 'Saco', stock: 5, warehouse: main, warehouseStock: { [main]: 5, [reserve]: 0 }, createdAt: FieldValue.serverTimestamp() });
    batch.set(db.doc('invProducts/product-b'), { tenantId: 'company-b', name: 'Acero', unit: 'Unidad', stock: 30, warehouseStock: { [main]: 30 } });
    await batch.commit();
  });
  afterAll(async () => { await db.terminate(); await deleteApp(app); });

  it('commits stock and the movement together', async () => {
    const result = await run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: reserve });
    expect(result.stock).toBe(7);
    expect((await balance()).warehouseStock).toEqual({ [main]: 5, [reserve]: 2 });
    const ledger = (await db.doc(`invMovements/${result.id}`).get()).data()!;
    expect(ledger).toMatchObject({ tenantId: 'company-a', productId: 'product-a', createdBy: 'director', quantity: 2, inventoryVersion: 1 });
  });

  it('rejects overselling without a movement or balance change', async () => {
    await expect(run('movement', { productId: 'product-a', type: 'Salida', quantity: 10, warehouse: main })).rejects.toThrow('Stock insuficiente');
    expect((await balance()).stock).toBe(5);
    expect(await movements()).toHaveLength(0);
  });

  it('serializes concurrent exits and never oversells', async () => {
    const results = await Promise.allSettled(Array.from({ length: 2 }, () => run('movement', { productId: 'product-a', type: 'Salida', quantity: 4, warehouse: main })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await balance()).stock).toBe(1);
    expect(await movements()).toHaveLength(1);
  });

  it('deduplicates concurrent submissions and retries after a lost response', async () => {
    const id = randomUUID();
    const data = { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main };
    const [a, b] = await Promise.all([run('movement', data, id), run('movement', data, id)]);
    expect(a).toEqual(b);
    expect(await run('movement', data, id)).toEqual(a);
    expect((await balance()).stock).toBe(7);
    expect(await movements()).toHaveLength(1);
    await expect(run('movement', { ...data, quantity: 3 }, id)).rejects.toThrow('otros datos');
  });

  it('does not partially write when a later validation fails', async () => {
    await expect(run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main, date: '2026-02-30' })).rejects.toThrow('Fecha inválida');
    expect((await balance()).stock).toBe(5);
    expect(await movements()).toHaveLength(0);
    expect((await db.collection('tenants/company-a/inventoryRequests').get()).size).toBe(0);
  });

  it('checks product, category, tenant membership and role on the server', async () => {
    await expect(run('movement', { productId: 'product-b', type: 'Entrada', quantity: 2, warehouse: main })).rejects.toThrow('no encontrado');
    await expect(run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main }, randomUUID(), 'reader')).rejects.toThrow('Tu rol');
    await expect(run('movement', { productId: 'product-b', type: 'Entrada', quantity: 2, warehouse: main }, randomUUID(), 'director', 'company-b')).rejects.toThrow('No perteneces');
    await db.doc('invCategories/foreign').set({ tenantId: 'company-b', name: 'Otro' });
    await expect(run('saveProduct', { name: 'Nuevo', categoryId: 'foreign' })).rejects.toThrow('no encontrado');
    expect((await db.doc('invProducts/product-b').get()).data()?.stock).toBe(30);
    expect(await movements()).toHaveLength(0);
  });

  it('allows the contractor role and refuses forged profile Admin roles', async () => {
    await run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main }, randomUUID(), 'contractor');
    await db.doc('users/reader').set({ role: 'Admin' });
    await db.doc('tenants/company-a').update({ memberRoles: {} });
    await expect(run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main }, randomUUID(), 'reader')).rejects.toThrow('Tu rol');
  });

  it('transfers both warehouse balances with a completed receipt', async () => {
    const result = await run('transfer', { productId: 'product-a', quantity: 3, fromWarehouse: main, toWarehouse: reserve });
    expect((await balance()).stock).toBe(5);
    expect((await balance()).warehouseStock).toEqual({ [main]: 2, [reserve]: 3 });
    expect((await db.doc(`invTransfers/${result.id}`).get()).data()).toMatchObject({ status: 'Completada', quantity: 3 });
    await expect(run('transfer', { productId: 'product-a', quantity: 4, fromWarehouse: main, toWarehouse: reserve })).rejects.toThrow('Stock insuficiente');
    expect((await db.collection('invTransfers').get()).size).toBe(1);
  });

  it('metadata edits never overwrite a more recent movement', async () => {
    await run('movement', { productId: 'product-a', quantity: 2, type: 'Entrada', warehouse: main });
    await run('saveProduct', { id: 'product-a', name: 'Cemento actualizado', unit: 'Saco', warehouse: main, stock: 5, warehouseStock: { [main]: 5 } });
    expect((await balance()).stock).toBe(7);
    expect((await balance()).warehouseStock[main]).toBe(7);
    expect((await balance()).name).toBe('Cemento actualizado');
  });

  it('creates initial balances with ledger entries and canonical categoryId', async () => {
    await db.doc('invCategories/materials').set({ tenantId: 'company-a', name: 'Materiales' });
    const result = await run('saveProduct', { name: 'Acero nuevo', category: 'Materiales', stock: 12, warehouse: reserve });
    const product = (await db.doc(`invProducts/${result.id}`).get()).data()!;
    expect(product).toMatchObject({ categoryId: 'materials', stock: 12, warehouseStock: { [reserve]: 12 } });
    expect(await movements()).toHaveLength(1);
    expect((await movements())[0].data()).toMatchObject({ reason: 'Saldo inicial', quantity: 12 });
  });

  it('compensates reversals without deleting the original', async () => {
    const original = await run('movement', { productId: 'product-a', type: 'Salida', quantity: 2, warehouse: main });
    const reversal = await run('reverseMovement', { id: original.id });
    expect((await balance()).stock).toBe(5);
    expect((await db.doc(`invMovements/${original.id}`).get()).data()?.reversedAt).toBeTruthy();
    expect((await db.doc(`invMovements/${reversal.id}`).get()).data()?.reversalOf).toBe(original.id);
    await expect(run('reverseMovement', { id: original.id })).rejects.toThrow('ya está anulado');
    expect(await movements()).toHaveLength(2);
  });

  it('reverses transfers, but refuses reversals after destination stock was consumed', async () => {
    const transfer = await run('transfer', { productId: 'product-a', quantity: 3, fromWarehouse: main, toWarehouse: reserve });
    await run('movement', { productId: 'product-a', quantity: 2, type: 'Salida', warehouse: reserve });
    await expect(run('reverseTransfer', { id: transfer.id })).rejects.toThrow('Stock insuficiente');
    expect((await db.doc(`invTransfers/${transfer.id}`).get()).data()?.reversedAt).toBeUndefined();
    await run('movement', { productId: 'product-a', quantity: 2, type: 'Entrada', warehouse: reserve });
    await run('reverseTransfer', { id: transfer.id });
    expect((await balance()).warehouseStock).toEqual({ [main]: 5, [reserve]: 0 });
  });

  it('archives only empty products and preserves historical references', async () => {
    await expect(run('archiveProduct', { id: 'product-a' })).rejects.toThrow('existencias');
    await run('movement', { productId: 'product-a', type: 'Salida', quantity: 5, warehouse: main });
    await run('archiveProduct', { id: 'product-a' });
    expect((await balance()).archived).toBe(true);
    expect(await movements()).toHaveLength(1);
    await expect(run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main })).rejects.toThrow('archivado');
  });

  it('rejects legacy reversals and inconsistent products until reconciliation', async () => {
    await db.doc('invMovements/legacy').set({ tenantId: 'company-a', productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main });
    await expect(run('reverseMovement', { id: 'legacy' })).rejects.toThrow('conciliación');
    await db.doc('invProducts/product-a').update({ stock: 20 });
    await expect(run('movement', { productId: 'product-a', type: 'Entrada', quantity: 2, warehouse: main })).rejects.toThrow('conciliación');
    expect((await balance()).stock).toBe(20);
  });

  it('keeps category references valid when archiving', async () => {
    await db.doc('invCategories/materials').set({ tenantId: 'company-a', name: 'Materiales' });
    await db.doc('invProducts/product-a').update({ categoryId: 'materials' });
    await expect(run('archiveCategory', { id: 'materials' })).rejects.toThrow('Reasigna');
    await db.doc('invProducts/product-a').update({ categoryId: '' });
    await run('archiveCategory', { id: 'materials' });
    expect((await db.doc('invCategories/materials').get()).data()?.archived).toBe(true);
    await expect(run('saveProduct', { name: 'Nuevo', categoryId: 'materials' })).rejects.toThrow('archivado');
  });

  it('AI uses the same balances and cannot mutate a foreign product ID', async () => {
    const actions: any[] = [];
    const response = await executeToolCall('create_inventory_movement', { product_id: 'product-b', quantity: 3, type: 'Entrada', warehouse: main }, db, 'director', actions, 'company-a', 'Director');
    expect(response).toContain('no encontrado');
    expect(actions[0].success).toBe(false);
    expect((await db.doc('invProducts/product-b').get()).data()?.stock).toBe(30);
    await executeToolCall('create_inventory_movement', { product_id: 'product-a', quantity: 3, type: 'Entrada', warehouse: reserve }, db, 'director', actions, 'company-a', 'Director');
    expect((await balance()).stock).toBe(8);
    expect((await balance()).warehouseStock[reserve]).toBe(3);
    expect(await movements()).toHaveLength(1);
  });

  it('Firestore rules allow tenant reads but deny direct client writes and cross-tenant reads', async () => {
    const token = (uid: string) => {
      const now = Math.floor(Date.now() / 1000);
      return [Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ aud: projectId, iss: `https://securetoken.google.com/${projectId}`, sub: uid, user_id: uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'custom', identities: {} } })).toString('base64url'), ''].join('.');
    };
    const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { Authorization: `Bearer ${token('director')}`, 'Content-Type': 'application/json' };
    expect((await fetch(`${base}/invProducts/product-a`, { headers })).status).toBe(200);
    expect((await fetch(`${base}/invProducts/product-b`, { headers })).status).toBe(403);
    for (const collection of ['invProducts', 'invCategories', 'invMovements', 'invTransfers']) {
      await db.doc(`${collection}/rule-test`).set({ tenantId: 'company-a' });
      expect((await fetch(`${base}/${collection}/rule-test`, { method: 'PATCH', headers, body: JSON.stringify({ fields: { tenantId: { stringValue: 'company-a' }, stock: { integerValue: '999' } } }) })).status).toBe(403);
      expect((await fetch(`${base}/${collection}/rule-test`, { method: 'DELETE', headers })).status).toBe(403);
      expect((await fetch(`${base}/${collection}/new-client-doc`, { method: 'PATCH', headers, body: JSON.stringify({ fields: { tenantId: { stringValue: 'company-a' } } }) })).status).toBe(403);
    }
  });
});
