import { expect, test } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { autorizar, evidencia, iniciarSesion, usuarios } from './apoyo';

test('venta, stock, reporte y auditoría se actualizan al confirmar', async ({ page, request }, info) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  page.on('console', mensaje => {
    if (mensaje.type() === 'error') errores.push(mensaje.text());
  });

  const admin = await autorizar(request, 'admin');
  const vendedor = await autorizar(request, 'vendedor');
  const marca = `${Date.now()}-${info.repeatEachIndex}`;
  const apellido = `Ensayo ${marca}`;
  const cliente = await request.post('/api/v1/clientes', { headers: vendedor, data: {
    dni: String(randomInt(10000000, 99999999)), nombres: 'Cliente S14', apellidos: apellido,
    email: `cliente-${marca}@example.invalid`, estado: true,
  } });
  expect(cliente.status()).toBe(201);
  const datosCliente = await cliente.json();
  expect(datosCliente.creadoPor).toBe(usuarios.vendedor);

  const categoria = await request.post('/api/v1/categorias', {
    headers: admin, data: { nombre: `E2E S14 ${marca}`, estado: true },
  });
  expect(categoria.status()).toBe(201);
  const categoriaId = (await categoria.json()).id;
  const producto = { nombre: `Venta S14 ${marca} activo`, categoriaId, precio: 12.5, stock: 10, estado: true };
  const variantes = [
    producto,
    { ...producto, nombre: `Venta S14 ${marca} baja`, estado: false },
    { ...producto, nombre: `Venta S14 ${marca} sin stock`, stock: 0 },
  ];
  const ids = [];
  for (const data of variantes) {
    const alta = await request.post('/api/v1/productos', { headers: admin, data });
    expect(alta.status()).toBe(201);
    ids.push((await alta.json()).id);
  }
  const productoId = ids[0];
  const stock = async (): Promise<number> => {
    const respuesta = await request.get(`/api/v1/productos/${productoId}`, { headers: admin });
    expect(respuesta.status()).toBe(200);
    return (await respuesta.json()).stock;
  };
  const stockInicial = await stock();
  const reporteAntes = await request.get('/api/v1/reportes/productos-mas-vendidos', { headers: admin });
  expect(reporteAntes.status()).toBe(200);
  const unidadesAntes = (await reporteAntes.json()).find((fila: { id: number }) => fila.id === productoId)?.cantidad ?? 0;

  const buscarEventos = (accion: string) =>
    request.get('/api/v1/auditoria', { headers: admin, params: { accion, tamanio: 100 } });
  const registrosAntes = await buscarEventos('VENTA_REGISTRADA');
  expect(registrosAntes.status()).toBe(200);
  const totalAntes = (await registrosAntes.json()).totalElementos;
  const rechazo = await request.post('/api/v1/ventas', { headers: vendedor, data: {
    clienteId: datosCliente.id,
    detalles: [{ productoId, cantidad: 1 }, { productoId: ids[2], cantidad: 1 }],
  } });
  expect(rechazo.status()).toBe(409);
  expect(await stock()).toBe(stockInicial);
  expect((await (await buscarEventos('VENTA_REGISTRADA')).json()).totalElementos).toBe(totalAntes);

  await iniciarSesion(page, 'vendedor', '/ventas/nueva');
  await page.getByTestId('buscar-cliente').fill(apellido);
  const opcionCliente = page.getByTestId('opcion-cliente').filter({ hasText: apellido });
  await expect(opcionCliente).toHaveCount(1);
  await opcionCliente.click();

  await page.getByTestId('buscar-producto').fill(`Venta S14 ${marca}`);
  const opciones = page.getByTestId('opcion-producto');
  await expect(opciones).toHaveCount(1);
  await expect(opciones.first()).toContainText(producto.nombre);
  await expect(opciones.first()).toContainText(/12\.50/);
  await expect(opciones.first()).toHaveAttribute('data-stock', String(stockInicial));
  await opciones.first().click();
  await page.getByTestId('cantidad').fill('2');
  await expect(page.getByTestId('total-venta')).toContainText(/25\.00/);

  await page.getByRole('button', { name: 'Revisar venta' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByRole('checkbox', { name: /imprimir comprobante/i }).uncheck();
  const registro = page.waitForResponse(r => r.url().endsWith('/api/v1/ventas') && r.request().method() === 'POST');
  await dialogo.getByRole('button', { name: 'Confirmar venta' }).click();
  const confirmacion = await registro;
  expect(confirmacion.status()).toBe(201);
  const venta = await confirmacion.json();
  expect(venta.creadoPor).toBe(usuarios.vendedor);
  expect(venta.total).toBe(25);
  await expect(page).toHaveURL(url => url.pathname === `/ventas/${venta.id}` && url.searchParams.get('nueva') === '1');
  await expect(page.getByText('Registrada por')).toBeVisible();

  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await page.getByLabel('Categoría', { exact: true }).selectOption(String(categoriaId));
  const tabla = page.getByTestId('tabla-productos');
  const fila = tabla.getByRole('row').filter({ hasText: producto.nombre });
  await expect(fila.getByTestId('stock-producto')).toHaveText(String(stockInicial - 2));
  expect(await stock()).toBe(stockInicial - 2);

  const reporte = await request.get('/api/v1/reportes/productos-mas-vendidos', { headers: admin });
  expect(reporte.status()).toBe(200);
  const filaReporte = (await reporte.json()).find((item: { id: number }) => item.id === productoId);
  expect(filaReporte).toMatchObject({ cantidad: unidadesAntes + 2, total: 25 });

  const auditoria = await buscarEventos('VENTA_REGISTRADA');
  expect(auditoria.status()).toBe(200);
  const evento = (await auditoria.json()).contenido.find((item: { entidadId: number }) => item.entidadId === venta.id);
  expect(evento).toMatchObject({ usuario: usuarios.vendedor, accion: 'VENTA_REGISTRADA',
    requestId: confirmacion.headers()['x-request-id'], entidadId: venta.id });
  expect((await request.get('/api/v1/auditoria', { headers: vendedor })).status()).toBe(403);

  const editado = await request.put(`/api/v1/productos/${productoId}`, {
    headers: admin, data: { ...producto, precio: 15, stock: stockInicial - 2 },
  });
  expect(editado.status()).toBe(200);
  expect(await editado.json()).toMatchObject({ modificadoPor: usuarios.admin, precio: 15 });
  const eventosPrecio = await buscarEventos('PRECIO_MODIFICADO');
  expect(eventosPrecio.status()).toBe(200);
  const precio = (await eventosPrecio.json()).contenido.find((item: { entidadId: number }) => item.entidadId === productoId);
  expect(precio).toMatchObject({ usuario: usuarios.admin, accion: 'PRECIO_MODIFICADO',
    requestId: editado.headers()['x-request-id'] });
  expect(precio.detalle).toMatch(/^12\.5\d* -> 15(?:\.0+)?$/);

  if (info.repeatEachIndex === 0) {
    const captura = info.outputPath('stock-despues.png');
    await tabla.screenshot({ path: captura });
    await info.attach('Stock después de la venta', { path: captura, contentType: 'image/png' });
  }
  expect(errores).toEqual([]);
  await evidencia(info, 'I-01-a-I-06', { casos: ['I-01', 'I-02', 'I-03', 'I-04', 'I-05', 'I-06'],
    ventaId: venta.id, productoId, stockInicial, stockFinal: stockInicial - 2, total: venta.total,
    unidadesReporte: filaReporte.cantidad, evento, precio, rollbackHttp: rechazo.status(), erroresConsola: errores.length });
});
