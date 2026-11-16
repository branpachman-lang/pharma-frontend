import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { randomInt, randomUUID } from 'node:crypto';
import { autorizar, evidencia, iniciarSesion, usuarios } from './apoyo';

function datosCliente(marca: string) {
  return {
    dni: String(randomInt(10_000_000, 100_000_000)),
    nombres: 'Cliente ensayo',
    apellidos: `Autónoma ${marca}`,
    email: `s14-${marca}@example.invalid`,
    estado: true,
  };
}

async function crearCliente(request: APIRequestContext, headers: Record<string, string>, marca: string) {
  const cliente = datosCliente(marca);
  const respuesta = await request.post('/api/v1/clientes', { headers, data: cliente });
  expect(respuesta.status()).toBe(201);
  const { id } = await respuesta.json();
  return { ...cliente, id };
}

async function crearProducto(request: APIRequestContext, headers: Record<string, string>, marca: string) {
  const categoria = await request.post('/api/v1/categorias', {
    headers, data: { nombre: `S14 autónoma ${marca}`, estado: true },
  });
  expect(categoria.status()).toBe(201);
  const producto = {
    nombre: `Producto ensayo ${marca}`, categoriaId: (await categoria.json()).id,
    precio: 12.5, stock: 3, estado: true,
  };
  const respuesta = await request.post('/api/v1/productos', { headers, data: producto });
  expect(respuesta.status()).toBe(201);
  const { id } = await respuesta.json();
  return { id, producto };
}

async function elegirCliente(page: Page, apellido: string) {
  await page.getByTestId('buscar-cliente').fill(apellido);
  await page.getByTestId('opcion-cliente').filter({ hasText: apellido }).click();
}

async function elegirProducto(page: Page, nombre: string, cantidad: string) {
  await page.getByTestId('buscar-producto').fill(nombre);
  await page.getByTestId('opcion-producto').filter({ hasText: nombre }).click();
  await page.getByTestId('cantidad').fill(cantidad);
}

async function confirmarVenta(page: Page) {
  await page.getByRole('button', { name: 'Revisar venta' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByRole('checkbox', { name: /imprimir comprobante/i }).uncheck();
  const respuesta = page.waitForResponse(r =>
    new URL(r.url()).pathname === '/api/v1/ventas' && r.request().method() === 'POST',
  );
  await dialogo.getByRole('button', { name: 'Confirmar venta' }).click();
  return respuesta;
}

async function capturar(
  page: Page,
  info: TestInfo,
  nombre: string,
  mask = [page.locator('.seleccionado span').filter({ hasText: /^DNI / })],
) {
  if (info.repeatEachIndex !== 0) return;
  const archivo = info.outputPath(`${nombre}.png`);
  await page.screenshot({ path: archivo, mask });
  await info.attach(nombre, { path: archivo, contentType: 'image/png' });
}

test('E2E-08 muestra 409 si el stock baja antes de confirmar la venta', async ({ page, request }, info) => {
  const marca = randomUUID().slice(0, 8);
  const admin = await autorizar(request, 'admin');
  const vendedor = await autorizar(request, 'vendedor');
  const cliente = await crearCliente(request, vendedor, marca);
  const { id, producto } = await crearProducto(request, admin, marca);
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await elegirCliente(page, cliente.apellidos);
  await elegirProducto(page, producto.nombre, '2');

  const cambio = await request.put(`/api/v1/productos/${id}`, { headers: admin, data: { ...producto, stock: 1 } });
  expect(cambio.status()).toBe(200);
  const respuesta = await confirmarVenta(page);
  expect(respuesta.status()).toBe(409);
  await expect(page.getByRole('alert')).toContainText(/stock insuficiente/i);
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
  await capturar(page, info, 'E2E-08-stock-409');

  const stock = await request.get(`/api/v1/productos/${id}`, { headers: admin });
  expect(stock.status()).toBe(200);
  expect(await stock.json()).toMatchObject({ stock: 1 });
  const ventas = await request.get('/api/v1/ventas/buscar', { headers: vendedor, params: { clienteId: cliente.id } });
  expect(ventas.status()).toBe(200);
  expect(await ventas.json()).toMatchObject({ totalElementos: 0 });
});

test('E2E-09 una venta sin productos no puede confirmarse', async ({ page, request }, info) => {
  const vendedor = await autorizar(request, 'vendedor');
  const cliente = await crearCliente(request, vendedor, randomUUID().slice(0, 8));
  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await elegirCliente(page, cliente.apellidos);
  await page.getByRole('button', { name: 'Revisar venta' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/ventas\/nueva$/);
  await expect(page.getByText('Aún no hay productos.', { exact: false })).toBeVisible();
  const respuesta = await request.post('/api/v1/ventas', {
    headers: vendedor, data: { clienteId: cliente.id, detalles: [] },
  });
  expect(respuesta.status()).toBe(400);
  expect(await respuesta.json()).toHaveProperty('validationErrors.detalles');
  await capturar(page, info, 'E2E-09-sin-productos');
});

test('E2E-10 registra un cliente en la SPA y vende de inmediato', async ({ page, request }, info) => {
  const marca = randomUUID().slice(0, 8);
  const admin = await autorizar(request, 'admin');
  const { producto } = await crearProducto(request, admin, marca);
  const cliente = datosCliente(marca);
  await iniciarSesion(page, 'vendedor', '/clientes/nuevo');
  await page.getByLabel('DNI', { exact: true }).fill(cliente.dni);
  await page.getByLabel('Nombres', { exact: true }).fill(cliente.nombres);
  await page.getByLabel('Apellidos', { exact: true }).fill(cliente.apellidos);
  await page.getByLabel('Correo', { exact: true }).fill(cliente.email);
  await page.getByLabel('Activo', { exact: true }).check();
  const alta = page.waitForResponse(r =>
    new URL(r.url()).pathname === '/api/v1/clientes' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  const registro = await alta;
  expect(registro.status()).toBe(201);
  const { id: clienteId } = await registro.json();
  await expect(page).toHaveURL(/\/clientes$/);
  await page.getByRole('link', { name: 'Ventas', exact: true }).click();
  await page.getByRole('link', { name: /nueva venta/i }).click();
  await elegirCliente(page, cliente.apellidos);
  await elegirProducto(page, producto.nombre, '1');
  const respuesta = await confirmarVenta(page);
  expect(respuesta.status()).toBe(201);
  const venta = await respuesta.json();
  expect(venta).toMatchObject({ clienteId, creadoPor: usuarios.vendedor });
  await expect(page).toHaveURL(url => url.pathname === `/ventas/${venta.id}`);

  await test.step('Verificar y capturar el comprobante de venta', async () => {
    const comprobante = page.getByRole('article').filter({
      has: page.getByText('Comprobante de venta', { exact: true }),
    });
    const numero = String(venta.id).padStart(6, '0');
    await expect(comprobante.getByText(`N.º ${numero}`, { exact: true })).toBeVisible();
    await expect(comprobante.getByRole('cell', { name: producto.nombre, exact: true })).toBeVisible();
    await capturar(page, info, 'E2E-10-comprobante', [comprobante.getByText(cliente.dni, { exact: true })]);
  });

  await evidencia(info, 'E2E-10-alta-y-venta', { clienteId, ventaId: venta.id, altaHttp: 201, ventaHttp: 201 });
});

test('E2E-12 Auditoría muestra al administrador el evento de una venta', async ({ page, request }, info) => {
  const marca = randomUUID().slice(0, 8);
  const admin = await autorizar(request, 'admin');
  const vendedor = await autorizar(request, 'vendedor');
  const cliente = await crearCliente(request, vendedor, marca);
  const { id: productoId } = await crearProducto(request, admin, marca);
  const respuesta = await request.post('/api/v1/ventas', {
    headers: vendedor, data: { clienteId: cliente.id, detalles: [{ productoId, cantidad: 1 }] },
  });
  expect(respuesta.status()).toBe(201);
  const { id: ventaId, fecha } = await respuesta.json();
  const requestId = respuesta.headers()['x-request-id'];
  expect(requestId).toMatch(/^[\da-f]{8}$/);
  const dia = fecha.slice(0, 10);

  await iniciarSesion(page, 'admin');
  await page.getByRole('link', { name: 'Auditoría', exact: true }).click();
  await page.getByLabel('Usuario', { exact: true }).fill(usuarios.vendedor);
  await page.getByLabel('Acción', { exact: true }).fill('VENTA_REGISTRADA');
  await page.getByLabel('Desde', { exact: true }).fill(dia);
  await page.getByLabel('Hasta', { exact: true }).fill(dia);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(url => {
    const q = url.searchParams;
    return url.pathname === '/auditoria' && q.get('pagina') === '0' && q.get('usuario') === usuarios.vendedor
      && q.get('accion') === 'VENTA_REGISTRADA' && q.get('desde') === dia && q.get('hasta') === dia;
  });
  const fila = page.getByTestId('tabla-auditoria').getByRole('row').filter({
    has: page.getByRole('cell', { name: requestId, exact: true }),
  });
  await expect(fila.getByRole('cell', { name: String(ventaId), exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: usuarios.vendedor, exact: true })).toBeVisible();
  await expect(fila.getByRole('cell', { name: 'VENTA_REGISTRADA', exact: true })).toBeVisible();
  await capturar(page, info, 'E2E-12-evento-venta');
});

test('E2E-13 Auditoría está oculta y denegada para el vendedor', async ({ page, request }, info) => {
  await iniciarSesion(page, 'vendedor');
  await expect(page.getByRole('link', { name: 'Ventas', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Auditoría', exact: true })).toHaveCount(0);
  await page.goto('/auditoria');
  await expect(page.getByRole('heading', { name: 'Acceso denegado', exact: true })).toBeVisible();
  const vendedor = await autorizar(request, 'vendedor');
  expect((await request.get('/api/v1/auditoria', { headers: vendedor })).status()).toBe(403);
  await capturar(page, info, 'E2E-13-auditoria-denegada');
});
