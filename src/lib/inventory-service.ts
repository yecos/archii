import { createHash } from 'node:crypto';
import type { DocumentData, Firestore, Transaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { INV_UNITS, INV_WAREHOUSES } from '@/lib/types';
import { InventoryError, inventoryNumber, inventoryWarehouse, inventoryTotal, checkedInventoryStock, changeInventoryStock } from '@/lib/inventory-stock';

export type InventoryAction = 'saveProduct' | 'saveCategory' | 'movement' | 'transfer' | 'archiveProduct' | 'archiveCategory' | 'reverseMovement' | 'reverseTransfer';
export type InventoryResult = { id: string; stock?: number };
const WRITE_ROLES = new Set(['Director', 'Contratista']);

function text(value: unknown, label: string, max = 500, required = false): string {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new InventoryError(`${label}: valor inválido`);
  }
  return value.trim();
}

function docId(value: unknown): string {
  const id = text(value, 'Identificador', 128, true);
  if (id.includes('/') || id === '.' || id === '..') throw new InventoryError('Identificador inválido');
  return id;
}

function date(value: unknown): string {
  const result = value ? text(value, 'Fecha', 10) : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) {
    throw new InventoryError('Fecha inválida');
  }
  return result;
}

function owned(data: DocumentData | undefined, tenantId: string): DocumentData {
  if (!data || data.tenantId !== tenantId) throw new InventoryError('Registro no encontrado en este espacio de trabajo', 404);
  return data;
}

function active(data: DocumentData): void {
  if (data.archived) throw new InventoryError('El registro está archivado', 409);
}

async function authorize(tx: Transaction, db: Firestore, tenantId: string, uid: string) {
  const tenant = (await tx.get(db.collection('tenants').doc(tenantId))).data();
  if (!tenant) throw new InventoryError('Espacio de trabajo no encontrado', 404);
  const admin = tenant.createdBy === uid || (tenant.superAdmins || []).includes(uid);
  if (!admin && !(tenant.members || []).includes(uid)) throw new InventoryError('No perteneces a este espacio de trabajo', 403);
  const profile = (await tx.get(db.collection('users').doc(uid))).data();
  const role = tenant.memberRoles?.[uid] || profile?.role || 'Miembro';
  if (!admin && !WRITE_ROLES.has(role)) throw new InventoryError('Tu rol no permite administrar inventario', 403);
}

/** All callers, including AI, share tenant checks, validation, ledger and balances. */
export async function executeInventory(
  db: Firestore, uid: string, tenantId: string, requestId: string,
  action: InventoryAction, input: Record<string, unknown>,
): Promise<InventoryResult> {
  docId(uid); docId(tenantId);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(requestId)) throw new InventoryError('Identificador de operación inválido');
  // Fingerprint binds retries to exactly one actor, action and payload.
  const fingerprint = createHash('sha256').update(JSON.stringify({ action, input })).digest('hex');
  const receiptRef = db.collection('tenants').doc(tenantId).collection('inventoryRequests').doc(`${uid}_${requestId}`);
  // References are allocated outside the callback: transaction retries reuse them.
  const productRef = input.id && action === 'saveProduct' ? db.collection('invProducts').doc(docId(input.id)) : db.collection('invProducts').doc();
  const categoryRef = input.id && action === 'saveCategory' ? db.collection('invCategories').doc(docId(input.id)) : db.collection('invCategories').doc();
  const movementRef = db.collection('invMovements').doc();
  const transferRef = db.collection('invTransfers').doc();
  const initialRefs = INV_WAREHOUSES.map(() => db.collection('invMovements').doc());

  return db.runTransaction(async tx => {
    await authorize(tx, db, tenantId, uid);
    const receipt = (await tx.get(receiptRef)).data();
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw new InventoryError('La operación ya existe con otros datos', 409);
      return receipt.result as InventoryResult;
    }
    const ts = FieldValue.serverTimestamp();
    const audit = { inventoryVersion: 1, tenantId, createdBy: uid, createdAt: ts, requestId };
    let result: InventoryResult;

    if (action === 'saveProduct') {
      const previous = input.id ? owned((await tx.get(productRef)).data(), tenantId) : null;
      if (previous) active(previous);
      let categoryId = text(input.categoryId, 'Categoría', 128);
      // Older AI tools supply category names; resolve them to the same categoryId used by the UI.
      if (!categoryId && input.category) {
        const name = text(input.category, 'Categoría', 120, true);
        const categories = await tx.get(db.collection('invCategories').where('tenantId', '==', tenantId).where('name', '==', name));
        const matches = categories.docs.filter(d => !d.data().archived);
        if (matches.length !== 1) throw new InventoryError('Selecciona una categoría existente y sin ambigüedad');
        categoryId = matches[0].id;
      }
      if (categoryId) {
        const category = owned((await tx.get(db.collection('invCategories').doc(docId(categoryId)))).data(), tenantId);
        if (categoryId !== previous?.categoryId) active(category);
      }
      const warehouse = inventoryWarehouse(input.warehouse || INV_WAREHOUSES[0]);
      const unit = text(input.unit || 'Unidad', 'Unidad', 30);
      if (!(INV_UNITS as readonly string[]).includes(unit)) throw new InventoryError('Unidad inválida');
      const metadata = {
        name: text(input.name, 'Nombre', 200, true), sku: text(input.sku, 'SKU', 100), categoryId, unit, warehouse,
        price: inventoryNumber(input.price ?? 0, 'Precio'), minStock: inventoryNumber(input.minStock ?? 0, 'Stock mínimo'),
        description: text(input.description, 'Descripción', 4000), imageData: text(input.imageData, 'Imagen', 600_000),
        updatedAt: ts, updatedBy: uid,
      };
      if (previous) {
        if (metadata.unit !== previous.unit && inventoryTotal(previous) !== 0) throw new InventoryError('No puedes cambiar la unidad de un producto con existencias', 409);
        // Metadata edits never replace balances captured when the form was opened.
        tx.update(productRef, metadata);
        result = { id: productRef.id, stock: inventoryTotal(previous) };
      } else {
        let ws: Record<string, number>;
        if (input.warehouseStock !== undefined) {
          if (!input.warehouseStock || typeof input.warehouseStock !== 'object' || Array.isArray(input.warehouseStock)) throw new InventoryError('Existencias inválidas');
          ws = { ...(input.warehouseStock as Record<string, number>) };
          Object.entries(ws).forEach(([w, qty]) => { inventoryWarehouse(w); inventoryNumber(qty, 'Existencias iniciales'); });
        } else {
          ws = { [warehouse]: inventoryNumber(input.stock ?? 0, 'Existencias iniciales') };
        }
        const stock = inventoryNumber(inventoryTotal({ warehouseStock: ws }), 'Stock total');
        tx.create(productRef, { ...metadata, ...audit, stock, warehouseStock: ws });
        INV_WAREHOUSES.forEach((w, i) => {
          if (ws[w] > 0) tx.create(initialRefs[i], { ...audit, productId: productRef.id, productName: metadata.name, unit, type: 'Entrada', quantity: ws[w], warehouse: w, reason: 'Saldo inicial', reference: '', date: date(input.date), source: 'initial' });
        });
        result = { id: productRef.id, stock };
      }
    } else if (action === 'saveCategory') {
      if (input.id) active(owned((await tx.get(categoryRef)).data(), tenantId));
      const data = { name: text(input.name, 'Nombre', 120, true), description: text(input.description, 'Descripción', 4000), color: text(input.color || '#6b7280', 'Color', 7), updatedAt: ts, updatedBy: uid };
      if (!/^#[0-9a-f]{6}$/i.test(data.color)) throw new InventoryError('Color inválido');
      if (input.id) tx.update(categoryRef, data);
      else tx.create(categoryRef, { ...data, ...audit });
      result = { id: categoryRef.id };
    } else if (action === 'movement' || action === 'transfer') {
      const ref = db.collection('invProducts').doc(docId(input.productId));
      const product = owned((await tx.get(ref)).data(), tenantId);
      active(product);
      let ws = checkedInventoryStock(product);
      const quantity = inventoryNumber(input.quantity, 'Cantidad', true);
      if (action === 'movement') {
        if (input.type !== 'Entrada' && input.type !== 'Salida') throw new InventoryError('Tipo de movimiento inválido');
        const warehouse = inventoryWarehouse(input.warehouse);
        ws = changeInventoryStock(ws, warehouse, input.type === 'Entrada' ? quantity : -quantity);
        tx.create(movementRef, { ...audit, productId: ref.id, productName: product.name, unit: product.unit, type: input.type, quantity, warehouse, reason: text(input.reason, 'Motivo', 1000), reference: text(input.reference, 'Referencia', 200), date: date(input.date) });
        result = { id: movementRef.id, stock: inventoryTotal({ warehouseStock: ws }) };
      } else {
        const fromWarehouse = inventoryWarehouse(input.fromWarehouse);
        const toWarehouse = inventoryWarehouse(input.toWarehouse);
        if (fromWarehouse === toWarehouse) throw new InventoryError('Selecciona almacenes diferentes');
        ws = changeInventoryStock(changeInventoryStock(ws, fromWarehouse, -quantity), toWarehouse, quantity);
        tx.create(transferRef, { ...audit, productId: ref.id, productName: product.name, unit: product.unit, fromWarehouse, toWarehouse, quantity, status: 'Completada', completedAt: ts, notes: text(input.notes, 'Notas', 1000), date: date(input.date) });
        result = { id: transferRef.id, stock: inventoryTotal({ warehouseStock: ws }) };
      }
      inventoryNumber(result.stock, 'Stock total');
      tx.update(ref, { stock: result.stock, warehouseStock: ws, updatedAt: ts, updatedBy: uid });
    } else if (action === 'archiveProduct' || action === 'archiveCategory') {
      const ref = db.collection(action === 'archiveProduct' ? 'invProducts' : 'invCategories').doc(docId(input.id));
      const record = owned((await tx.get(ref)).data(), tenantId);
      if (action === 'archiveProduct') checkedInventoryStock(record);
      if (action === 'archiveProduct' && inventoryTotal(record) !== 0) throw new InventoryError('Registra la salida o el ajuste de las existencias antes de archivar el producto', 409);
      if (action === 'archiveCategory') {
        const products = await tx.get(db.collection('invProducts').where('tenantId', '==', tenantId).where('categoryId', '==', ref.id));
        if (products.docs.some(d => !d.data().archived)) throw new InventoryError('Reasigna los productos activos antes de archivar la categoría', 409);
      }
      // Archive keeps historical references and category names intact.
      tx.update(ref, { archived: true, archivedAt: ts, archivedBy: uid });
      result = { id: ref.id };
    } else if (action === 'reverseMovement' || action === 'reverseTransfer') {
      const isMovement = action === 'reverseMovement';
      const ref = db.collection(isMovement ? 'invMovements' : 'invTransfers').doc(docId(input.id));
      const record = owned((await tx.get(ref)).data(), tenantId);
      if (record.inventoryVersion !== 1) throw new InventoryError('Este registro antiguo requiere conciliación antes de anularlo', 409);
      if (record.reversedAt || record.reversalOf) throw new InventoryError('El registro ya está anulado o es una compensación', 409);
      if (!isMovement && record.status !== 'Completada') throw new InventoryError('Solo puedes anular transferencias completadas', 409);
      if (isMovement && !['Entrada', 'Salida'].includes(record.type)) throw new InventoryError('Movimiento antiguo inválido; requiere conciliación', 409);
      const pRef = db.collection('invProducts').doc(docId(record.productId));
      const product = owned((await tx.get(pRef)).data(), tenantId);
      active(product);
      let ws = checkedInventoryStock(product);
      const quantity = inventoryNumber(record.quantity, 'Cantidad', true);
      if (isMovement) {
        const warehouse = inventoryWarehouse(record.warehouse);
        const type = record.type === 'Entrada' ? 'Salida' : 'Entrada';
        ws = changeInventoryStock(ws, warehouse, type === 'Entrada' ? quantity : -quantity);
        tx.create(movementRef, { ...audit, productId: pRef.id, productName: product.name, unit: product.unit, type, quantity, warehouse, reason: 'Anulación de movimiento', reference: ref.id, reversalOf: ref.id, date: date(undefined) });
      } else {
        const fromWarehouse = inventoryWarehouse(record.toWarehouse);
        const toWarehouse = inventoryWarehouse(record.fromWarehouse);
        if (fromWarehouse === toWarehouse) throw new InventoryError('Transferencia antigua inválida; requiere conciliación', 409);
        ws = changeInventoryStock(changeInventoryStock(ws, fromWarehouse, -quantity), toWarehouse, quantity);
        tx.create(transferRef, { ...audit, productId: pRef.id, productName: product.name, unit: product.unit, fromWarehouse, toWarehouse, quantity, status: 'Completada', completedAt: ts, notes: 'Anulación de transferencia', reversalOf: ref.id, date: date(undefined) });
      }
      const stock = inventoryNumber(inventoryTotal({ warehouseStock: ws }), 'Stock total');
      tx.update(ref, { reversedAt: ts, reversedBy: uid });
      tx.update(pRef, { stock, warehouseStock: ws, updatedAt: ts, updatedBy: uid });
      result = { id: isMovement ? movementRef.id : transferRef.id, stock };
    } else {
      throw new InventoryError('Operación de inventario no soportada');
    }

    tx.create(receiptRef, { fingerprint, result, createdAt: ts, createdBy: uid });
    return result;
  });
}
