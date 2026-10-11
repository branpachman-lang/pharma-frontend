export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

/** Cada palabra buscada debe aparecer en alguno de los campos. */
export function coincide(busqueda: string, ...campos: string[]): boolean {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const contenido = normalizar(campos.join(' '));
  return palabras.every(palabra => contenido.includes(palabra));
}
