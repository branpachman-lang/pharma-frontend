import { Observable, EMPTY, expand, map, reduce } from 'rxjs';
import { PaginaResponse } from '../models/pagina-response';

/** Recorre las páginas del catálogo para que el buscador no ignore registros posteriores. */
export function listarTodasPaginas<T>(
  obtener: (pagina: number) => Observable<PaginaResponse<T>>,
): Observable<T[]> {
  return obtener(0).pipe(
    expand(respuesta => respuesta.ultima ? EMPTY : obtener(respuesta.pagina + 1)),
    map(respuesta => respuesta.contenido),
    reduce((acumulado, contenido) => acumulado.concat(contenido), [] as T[]),
  );
}
