import { expect, test } from '@playwright/test';
import { iniciarSesion } from './apoyo';

test('el almacenero no ve Ventas y el acceso directo está denegado', async ({ page }) => {
  await iniciarSesion(page, 'almacen');
  await expect(page.getByRole('link', { name: 'Ventas', exact: true })).toHaveCount(0);
  await page.goto('/ventas');
  await expect(page.getByRole('heading', { name: /acceso denegado/i })).toBeVisible();
});

test('el vendedor consulta Productos sin permisos de edición', async ({ page }) => {
  await iniciarSesion(page, 'vendedor', '/productos');
  await expect(page.getByTestId('tabla-productos')).toBeVisible();
  await expect(page.getByRole('link', { name: /nuevo producto/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
});
