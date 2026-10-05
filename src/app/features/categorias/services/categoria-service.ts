import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { Categoria, CategoriaRequest } from '../models/categoria.model';

@Service()
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/categorias`;

  listar(pagina = 0, tamanio = 10, ordenarPor: 'id' | 'nombre' | 'estado' = 'nombre',
    direccion: 'asc' | 'desc' = 'asc'): Observable<PaginaResponse<Categoria>> {
    const params = new HttpParams().set('pagina', pagina).set('tamanio', tamanio)
      .set('ordenarPor', ordenarPor).set('direccion', direccion);
    return this.http.get<PaginaResponse<Categoria> | Categoria[]>(this.url, { params }).pipe(
      map(respuesta => {
        if (!Array.isArray(respuesta)) {
          if (Array.isArray(respuesta?.contenido)) return respuesta;
          throw new HttpErrorResponse({
            status: 502,
            statusText: 'Respuesta inválida',
            error: { message: 'La API devolvió un formato de categorías no válido.' },
          });
        }

        // Compatibilidad con la API anterior, que ignora los parámetros y devuelve un arreglo.
        const sentido = direccion === 'asc' ? 1 : -1;
        const categorias = [...respuesta].sort((a, b) => {
          const diferencia = ordenarPor === 'nombre'
            ? a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            : Number(a[ordenarPor]) - Number(b[ordenarPor]);
          return diferencia ? diferencia * sentido : a.id - b.id;
        });
        const totalPaginas = Math.ceil(categorias.length / tamanio);
        return {
          contenido: categorias.slice(pagina * tamanio, (pagina + 1) * tamanio),
          pagina,
          tamanio,
          totalElementos: categorias.length,
          totalPaginas,
          ultima: pagina >= totalPaginas - 1,
        };
      }),
    );
  }

  listarTodas(): Observable<Categoria[]> {
    return this.listar(0, 100).pipe(
      expand(pagina => pagina.ultima ? EMPTY : this.listar(pagina.pagina + 1, 100)),
      reduce((categorias, pagina) => [...categorias, ...pagina.contenido], [] as Categoria[]),
    );
  }

  obtener(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.url}/${id}`);
  }

  crear(datos: CategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(this.url, datos);
  }

  actualizar(id: number, datos: CategoriaRequest): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.url}/${id}`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
