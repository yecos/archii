import { INV_WAREHOUSES } from '@/lib/types';

export type StockData = {
  stock?: number;
  warehouse?: string;
  warehouseStock?: Record<string, number>;
};

export class InventoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'InventoryError';
  }
}

export function inventoryNumber(value: unknown, label: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12 || (positive && value === 0)) {
    throw new InventoryError(`${label}: ingresa un número ${positive ? 'mayor que cero' : 'no negativo'} válido`);
  }
  if (Math.abs(value * 1e6 - Math.round(value * 1e6)) > 0.001) {
    throw new InventoryError(`${label}: se permiten hasta seis decimales`);
  }
  return value;
}

export function inventoryWarehouse(value: unknown): string {
  if (typeof value !== 'string' || !(INV_WAREHOUSES as readonly string[]).includes(value)) {
    throw new InventoryError('Selecciona un almacén válido');
  }
  return value;
}

export const roundStock = (value: number) => Math.round(value * 1e6) / 1e6;

/** A populated warehouse map is authoritative; empty maps are legacy single-warehouse data. */
export function inventoryStock(data: StockData): Record<string, number> {
  const map = data.warehouseStock;
  if (map && Object.keys(map).length > 0) return { ...map };
  return { [data.warehouse || INV_WAREHOUSES[0]]: Number(data.stock) || 0 };
}

export function inventoryTotal(data: StockData): number {
  return roundStock(Object.values(inventoryStock(data)).reduce((sum, qty) => sum + qty, 0));
}

/** Refuse to silently erase pre-existing divergence from old writers. */
export function checkedInventoryStock(data: StockData): Record<string, number> {
  const map = inventoryStock(data);
  for (const [warehouse, qty] of Object.entries(map)) {
    inventoryWarehouse(warehouse);
    inventoryNumber(qty, 'Existencias');
  }
  if (data.stock !== undefined) inventoryNumber(data.stock, 'Stock total');
  const total = inventoryTotal(data);
  inventoryNumber(total, 'Stock total');
  if (data.stock !== undefined && Math.abs(data.stock - total) > 0.000001) {
    throw new InventoryError('El producto tiene saldos inconsistentes. Requiere conciliación antes de registrar movimientos.', 409);
  }
  return map;
}

export function changeInventoryStock(map: Record<string, number>, warehouse: string, delta: number): Record<string, number> {
  inventoryWarehouse(warehouse);
  const next = roundStock((map[warehouse] || 0) + delta);
  if (next < 0) throw new InventoryError(`Stock insuficiente en ${warehouse}. Disponible: ${map[warehouse] || 0}`, 409);
  inventoryNumber(next, 'Existencias');
  return { ...map, [warehouse]: next };
}
