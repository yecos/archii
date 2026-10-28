// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkedInventoryStock, changeInventoryStock, inventoryNumber, inventoryTotal } from './inventory-stock';

const warehouse = 'Almacén Principal';
describe('inventory balance rules', () => {
  it('reads legacy balances with missing or empty warehouse maps', () => {
    expect(inventoryTotal({ stock: 8, warehouse })).toBe(8);
    expect(inventoryTotal({ stock: 8, warehouse, warehouseStock: {} })).toBe(8);
    expect(checkedInventoryStock({ stock: 8, warehouse, warehouseStock: {} })).toEqual({ [warehouse]: 8 });
  });
  it('blocks inconsistent old balances instead of discarding the difference', () => {
    expect(() => checkedInventoryStock({ stock: 8, warehouseStock: { [warehouse]: 5 } })).toThrow('conciliación');
  });
  it('rejects insufficient stock without changing the input map', () => {
    const stock = { [warehouse]: 5 };
    expect(() => changeInventoryStock(stock, warehouse, -10)).toThrow('Stock insuficiente');
    expect(stock[warehouse]).toBe(5);
  });
  it('supports fractional units without floating point drift', () => {
    expect(changeInventoryStock({ [warehouse]: 0.3 }, warehouse, -0.1)[warehouse]).toBe(0.2);
  });
  it.each([-1, NaN, Infinity, -Infinity, '5', null, 1e13, 0.0000001])('rejects invalid quantity %s', value => {
    expect(() => inventoryNumber(value, 'Cantidad', true)).toThrow();
  });
  it('rejects zero operations and unknown warehouses', () => {
    expect(() => inventoryNumber(0, 'Cantidad', true)).toThrow();
    expect(() => checkedInventoryStock({ stock: 5, warehouse: 'Otra empresa' })).toThrow('almacén válido');
  });
});
