import { expect, test } from '@playwright/test';
import { autorizar, evidencia, ingresar, iniciarSesion, usuarios } from './apoyo';

test('una ruta protegida sin sesión lleva al login con returnUrl', async ({ page }) => {
  await page.goto('/ventas');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fventas$/);
});

test('credenciales incorrectas muestran el mensaje y dejan un evento', async ({ page, request }, info) => {
  await page.goto('/login');
  const usuario = `s14_inexistente_${Date.now()}`;
  await page.getByLabel('Usuario', { exact: true }).fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill('intento-incorrecto-s14');
  const peticion = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const fallo = await peticion;
  expect(fallo.status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText(/usuario o contraseña incorrectos/i);
  const headers = await autorizar(request, 'admin');
  const bitacora = await request.get('/api/v1/auditoria', {
    headers, params: { usuario, accion: 'LOGIN_FALLIDO', tamanio: 1 },
  });
  expect(bitacora.status()).toBe(200);
  const { contenido } = await bitacora.json();
  expect(contenido[0]).toMatchObject({ usuario, accion: 'LOGIN_FALLIDO', requestId: fallo.headers()['x-request-id'] });
  await evidencia(info, 'login-fallido', { http: 401, accion: contenido[0].accion, requestId: contenido[0].requestId });
});

test('al iniciar sesión vuelve a Ventas y la expiración conserva la ruta de la venta', async ({ page }, info) => {
  await page.clock.install();
  await iniciarSesion(page, 'vendedor', '/ventas');
  await expect(page).toHaveURL(/\/ventas$/);
  await page.getByRole('link', { name: 'Nueva venta' }).click();
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
  await expect(page.getByTestId('buscar-cliente')).toBeVisible();
  await page.getByTestId('buscar-cliente').fill('Borrador S14');
  const restante = await page.evaluate(() => {
    const sesion = JSON.parse(sessionStorage.getItem('pharmasoft.sesion') ?? '{}');
    return sesion.expiraEn - Date.now();
  });
  expect(restante).toBeGreaterThan(0);
  await page.clock.fastForward(restante + 1000);
  await expect(page).toHaveURL(/\/login\?expirada=1&returnUrl=%2Fventas%2Fnueva$/);
  await ingresar(page, 'vendedor');
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
  await evidencia(info, 'I-07', { usuario: usuarios.vendedor, ruta: '/ventas/nueva', reloj: 'Playwright Clock' });
});
