import { expect, test } from '@playwright/test';
import { evidencia, iniciarSesion } from './apoyo';

test('Productos pagina en el servidor y conserva la URL, y Ventas reinicia la página al filtrar', async ({ page }, info) => {
  await iniciarSesion(page, 'admin', '/productos');
  const tabla = page.getByTestId('tabla-productos');
  await expect(tabla.locator('tbody tr')).toHaveCount(20);
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 1 de \d+/);

  const segunda = page.waitForResponse(r => {
    const url = new URL(r.url());
    return url.pathname === '/api/v1/productos' && url.searchParams.get('pagina') === '1';
  });
  await page.getByRole('button', { name: 'Página siguiente' }).click();
  expect((await segunda).status()).toBe(200);
  await expect(page).toHaveURL(/pagina=1/);
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 2 de/);
  await page.reload();
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 2 de/);

  await page.goto('/ventas?pagina=4');
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 5 de/);
  await page.getByLabel('Desde', { exact: true }).fill('2026-11-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-11-12');
  const filtro = page.waitForResponse(r => {
    const url = new URL(r.url());
    return url.pathname === '/api/v1/ventas/buscar' && url.searchParams.get('desde') === '2026-11-01';
  });
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  expect((await filtro).status()).toBe(200);
  await expect(page.getByTestId('pagina-actual')).toHaveText(/Página 1 de/);
  expect(new URL(page.url()).searchParams.get('pagina')).toBe('0');
  await evidencia(info, 'I-08', { paginaInicial: 5, paginaConFiltro: 1, url: new URL(page.url()).search });
});
