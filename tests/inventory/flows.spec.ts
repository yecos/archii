import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

async function login(page: Page, email = 'inventory-e2e@example.test') {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem('archii-onboarding', JSON.stringify({ state: { completedSteps: ['welcome', 'create-project', 'explore-dashboard', 'invite-team', 'try-ai', 'complete'], completedAt: new Date().toISOString(), spotlightTips: [] }, version: 0 }));
    localStorage.setItem('archii-install-dismissed', String(Date.now()));
  });
  await page.goto('/');
  await page.getByPlaceholder('tu@correo.com').fill(email);
  await page.locator('input[type="password"]').first().fill('LocalInventory123!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).not.toBeVisible();
  if ((page.viewportSize()?.width || 1440) < 768) await page.getByRole('button', { name: 'Abrir menú' }).click();
  const inventory = page.getByText('Inventario', { exact: true }).filter({ visible: true }).first();

  await inventory.click();
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
}

function responseFor(page: Page, action: string) {
  return page.waitForResponse(response => response.url().endsWith('/api/inventory') && response.request().postDataJSON()?.action === action);
}

async function movement(page: Page, productId: string, type: 'Entrada' | 'Salida', qty: string) {
  await page.getByRole('button', { name: /Movimientos/ }).click();
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: new RegExp(type) }).click();
  await dialog.getByLabel('Producto', { exact: true }).selectOption(productId);
  await dialog.getByLabel('Cantidad', { exact: true }).fill(qty);
  return dialog;
}

test('authenticated UI preserves stock, rejects overselling, transfers, reverses, retries and exports', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await page.getByRole('button', { name: /Productos/ }).click();
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const name = `Material ${testInfo.project.name} ${Date.now()}`;
  await dialog.getByPlaceholder('Ej: Cemento Portland').fill(name);
  await dialog.getByLabel('Existencias en Almacén Principal', { exact: true }).fill('5');
  await dialog.getByPlaceholder('50000').fill('12000');
  await page.screenshot({ path: testInfo.outputPath('product-form.png'), fullPage: true });
  const createResponse = responseFor(page, 'saveProduct');
  await dialog.getByRole('button', { name: 'Crear producto', exact: true }).click();
  const created = await (await createResponse).json();
  expect(created).toMatchObject({ success: true, stock: 5 });
  const productId = created.id as string;
  await expect(dialog).not.toBeVisible();
  const card = page.locator(`[data-inventory-product="${productId}"]`);
  await expect(card).toContainText(name);
  await page.screenshot({ path: testInfo.outputPath('products.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await movement(page, productId, 'Entrada', '2');
  const entryResponse = responseFor(page, 'movement');
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  expect(await (await entryResponse).json()).toMatchObject({ success: true, stock: 7 });
  await expect(dialog).not.toBeVisible();

  await movement(page, productId, 'Salida', '10');
  await expect(dialog.getByText(/Excede stock disponible/)).toBeVisible();
  const denied = responseFor(page, 'movement');
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  expect((await denied).status()).toBe(409);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Cantidad', { exact: true }).fill('2');
  const exitResponse = responseFor(page, 'movement');
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  expect(await (await exitResponse).json()).toMatchObject({ success: true, stock: 5 });
  await expect(dialog).not.toBeVisible();

  await page.getByRole('button', { name: /Transferencias/ }).click();
  await page.getByRole('button', { name: 'Nueva transferencia', exact: true }).click();
  await dialog.getByLabel('Producto', { exact: true }).selectOption(productId);
  await dialog.getByLabel('Desde', { exact: true }).selectOption('Almacén Principal');
  await dialog.getByLabel('Hasta', { exact: true }).selectOption('Bodega Reserva');
  await dialog.getByLabel('Cantidad', { exact: true }).fill('3');
  const transferResponse = responseFor(page, 'transfer');
  await dialog.getByRole('button', { name: 'Transferir', exact: true }).click();
  const transfer = await (await transferResponse).json();
  expect(transfer).toMatchObject({ success: true, stock: 5 });
  await expect(dialog).not.toBeVisible();
  const transferCard = page.locator(`[data-inventory-transfer="${transfer.id}"]`);
  if (testInfo.project.name === 'desktop') await transferCard.getByRole('button', { name: 'Anular', exact: true }).click();
  else {
    await transferCard.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('menuitem', { name: 'Anular transferencia' }).click();
  }
  const reverseResponse = responseFor(page, 'reverseTransfer');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  expect(await (await reverseResponse).json()).toMatchObject({ success: true, stock: 5 });
  await expect(transferCard.getByText('Anulado · compensación registrada')).toBeVisible();

  await movement(page, productId, 'Entrada', '1');
  await page.route('**/api/inventory', async route => {
    await route.fetch(); // The real transaction commits; its response is deliberately lost.
    await route.abort('failed');
  }, { times: 1 });
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText(/Sin confirmación del servidor/)).toBeVisible();
  const retryResponse = responseFor(page, 'movement');
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click();
  expect(await (await retryResponse).json()).toMatchObject({ success: true, stock: 6 });
  await expect(dialog).not.toBeVisible();

  await page.getByRole('button', { name: /Reportes/ }).filter({ hasText: '📊 Reportes' }).last().click();
  await expect(page.getByRole('button', { name: /Exportar Excel/ })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar Excel/ }).click();
  const download = await downloadPromise;
  const workbook = XLSX.read(await readFile((await download.path())!), { type: 'buffer' });
  const products = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Productos);
  expect(products.find(p => p.Producto === name)?.['Stock Total']).toBe(6);
  expect(workbook.SheetNames).toContain('Transferencias');
  await page.screenshot({ path: testInfo.outputPath('reports.png'), fullPage: true });
  expect(errors).toEqual([]);
});
