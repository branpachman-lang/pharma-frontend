/** Redondea importes mostrados en la SPA; el total definitivo lo calcula el servidor. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
