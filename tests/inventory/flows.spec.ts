import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

async function login(page: Page, email = 'inventory-e2e@example.test', destination = 'Inventario') {
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
  if (destination === 'Facturas') await page.getByRole('button', { name: /Administraci.*expandir/ }).filter({ visible: true }).first().click();
  const inventory = page.getByText(destination, { exact: true }).filter({ visible: true }).first();

  await inventory.click();
  if (destination === 'Inventario') await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();
}

function responseFor(page: Page, action: string) {
  return page.waitForResponse(response => response.url().endsWith('/api/inventory') && response.request().postDataJSON()?.action === action);
}

test('invoices preserve zero tax, export actual tax amounts and record overdue payment', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'inventory-e2e@example.test', 'Facturas');
  const number = `QA-${testInfo.project.name}-${Date.now()}`;
  const card = page.locator(`[data-invoice-number="${number}"]`);
  const mobile = testInfo.project.name === 'android-emulated';
  const action = async (target: typeof card, desktopLabel: string, mobileLabel: string) => {
    if (mobile) {
      await target.getByRole('button', { name: /M.s opciones/ }).click();
      await page.getByRole('menuitem', { name: mobileLabel, exact: true }).click();
    } else await target.getByRole('button', { name: desktopLabel, exact: true }).click();
  };
  const fillInvoice = async (invoiceNumber: string) => {
    await page.getByRole('button', { name: 'Nueva Factura', exact: true }).click();
    await page.getByLabel('Proyecto de la factura', { exact: true }).selectOption('project-files-e2e');
    await page.getByPlaceholder('Numero de factura').fill(invoiceNumber);
    await page.getByPlaceholder('Concepto', { exact: true }).fill('Revisión ficticia QA');
    await page.getByLabel('Horas del concepto 1', { exact: true }).fill('2');
    await page.getByLabel('Tarifa del concepto 1', { exact: true }).fill('100000');
  };
  const downloadPdf = async (target: typeof card) => {
    const pending = page.waitForEvent('download');
    await action(target, 'Descargar PDF', 'Descargar PDF');
    const downloaded = await pending;
    const bytes = await readFile((await downloaded.path())!);
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    return bytes.toString('latin1');
  };

  await fillInvoice(number);
  await page.getByLabel('IVA (%)', { exact: true }).fill('101');
  await page.getByRole('button', { name: 'Crear Factura', exact: true }).click();
  await expect(page.getByText('El IVA debe estar entre 0 y 100', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear Factura', exact: true })).toBeVisible();
  await page.getByLabel('IVA (%)', { exact: true }).fill('0');
  await expect(page.getByText('Total', { exact: true }).locator('..')).toContainText('200.000');
  expect(await page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Crear Factura', exact: true }).click({ clickCount: 2 });
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Borrador', { exact: true })).toBeVisible();
  await expect(card).toContainText('200.000');
  expect(await downloadPdf(card)).toContain('0%');
  await action(card, 'Enviar', 'Enviar factura');
  await expect(card.getByText('Enviada', { exact: true })).toBeVisible();
  await action(card, 'Vencer', 'Marcar como vencida');
  await expect(card.getByText('Vencida', { exact: true })).toBeVisible();
  await action(card, 'Pagar', 'Marcar como pagada');
  await expect(card.getByText('Pagada', { exact: true })).toBeVisible();

  await fillInvoice(`${number}-19`);
  await expect(page.getByLabel('IVA (%)', { exact: true })).toHaveValue('19');
  await expect(page.getByText('Total', { exact: true }).locator('..')).toContainText('238.000');
  await page.getByRole('button', { name: 'Crear Factura', exact: true }).click();
  const taxedCard = page.locator(`[data-invoice-number="${number}-19"]`);
  await expect(taxedCard).toContainText('238.000');
  const taxedPdf = await downloadPdf(taxedCard);
  expect(taxedPdf).toContain('19%');
  expect(taxedPdf).toContain('($38.000) Tj');

  await page.reload();
  if (mobile) await page.getByRole('button', { name: /Abrir men/ }).click();
  const category = page.getByRole('button', { name: /Administraci.*expandir/ }).filter({ visible: true }).first();
  if (await category.count()) await category.click();
  await page.getByText('Facturas', { exact: true }).filter({ visible: true }).first().click();
  await expect(card).toHaveCount(1);
  await expect(card.getByText('Pagada', { exact: true })).toBeVisible();
  await expect(card).toContainText('200.000');
  await expect(taxedCard).toContainText('238.000');
  await page.screenshot({ path: testInfo.outputPath('invoice-lifecycle.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('project files round-trip and daily logs persist after reload', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'inventory-e2e@example.test', 'Planos y archivos');
  const openProject = async () => {
    await page.getByRole('button', { name: /Proyecto ficticio de archivos/ }).click();
    await expect(page.locator('#file-upload-input')).toBeAttached();
    expect(await page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  };
  await openProject();
  const filename = `plano-${testInfo.project.name}-${Date.now()}.txt`;
  const contents = Buffer.from('Plano ficticio QA. Sin datos reales.');
  await page.locator('#file-upload-input').setInputFiles({ name: filename, mimeType: 'text/plain', buffer: contents });
  await expect(page.getByText(filename, { exact: true })).toBeVisible();
  const fileCard = page.getByText(filename, { exact: true }).locator('..');
  const downloadPromise = page.waitForEvent('download');
  await fileCard.getByRole('link', { name: 'Descargar archivo', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(filename);
  expect(await readFile((await download.path())!)).toEqual(contents);

  await page.getByRole('button', { name: 'Obra', exact: true }).click();
  await page.getByRole('button', { name: /Bit.cora/ }).click();
  await page.getByRole('button', { name: 'Nuevo Registro', exact: true }).click();
  const activity = `Replanteo ficticio ${testInfo.project.name} ${Date.now()}`;
  await page.getByPlaceholder('Nombre del supervisor').fill('Supervisor QA');
  await page.getByPlaceholder('Actividad 1', { exact: true }).fill(activity);
  expect(await page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Guardar Registro', exact: true }).click();
  await expect(page.getByText(activity, { exact: true })).toBeVisible();

  await page.reload();
  const filesNav = page.getByText('Planos y archivos', { exact: true }).filter({ visible: true }).first();
  if ((page.viewportSize()?.width || 1440) < 768) await page.getByRole('button', { name: /Abrir men/ }).click();
  await filesNav.click();
  await openProject();
  await expect(page.getByText(filename, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Obra', exact: true }).click();
  await page.getByRole('button', { name: /Bit.cora/ }).click();
  await expect(page.getByText(activity, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('project-daily-log.png'), fullPage: true });
  expect(errors).toEqual([]);
});

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
