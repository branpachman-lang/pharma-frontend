export const TAMANIOS_PAGINA = [5, 10, 20, 50, 100] as const;

export function numeroPagina(valor: unknown): number {
  const numero = typeof valor === 'string' || typeof valor === 'number' ? Number(valor) : 0;
  return Number.isSafeInteger(numero) && numero >= 0 && numero <= 2147483647 ? numero : 0;
}

export function tamanioPagina(valor: unknown, defecto: number): number {
  const numero = numeroPagina(valor);
  return TAMANIOS_PAGINA.some(tamanio => tamanio === numero) ? numero : defecto;
}

export function idPositivo(valor: unknown): number | null {
  const numero = typeof valor === 'string' || typeof valor === 'number' ? Number(valor) : 0;
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
