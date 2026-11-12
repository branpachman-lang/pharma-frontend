import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export const usuarios = { admin: 'admin_s14', vendedor: 'vendedor_s14', almacen: 'almacen_s14' } as const;
type Rol = keyof typeof usuarios;

function clave(): string {
  const valor = process.env['S14_LAB_LOGIN'];
  if (!valor) throw new Error('Configura S14_LAB_LOGIN con la contraseña de las cuentas sintéticas.');
  return valor;
}

export async function ingresar(page: Page, rol: Rol): Promise<void> {
  await page.getByLabel('Usuario', { exact: true }).fill(usuarios[rol]);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave());
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

export async function iniciarSesion(page: Page, rol: Rol, ruta = '/inicio'): Promise<void> {
  await page.goto(ruta);
  await expect(page).toHaveURL(/\/login/);
  await ingresar(page, rol);
}

export async function autorizar(request: APIRequestContext, rol: Rol): Promise<Record<string, string>> {
  const respuesta = await request.post('/api/v1/auth/login', {
    data: { username: usuarios[rol], password: clave() },
  });
  expect(respuesta.status()).toBe(200);
  const { token } = await respuesta.json();
  return { Authorization: `Bearer ${token}` };
}

export async function evidencia(info: TestInfo, nombre: string, datos: unknown): Promise<void> {
  const archivo = info.outputPath(`${nombre}.json`);
  await writeFile(archivo, JSON.stringify(datos, null, 2), 'utf8');
  await info.attach(nombre, { path: archivo, contentType: 'application/json' });
}
