import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { Direccion, OrdenProducto, Producto, ProductoRequest } from '../models/producto.model';

@Service()
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  // La API anterior devuelve un arreglo y elimina físicamente. Solo la nueva permite la baja lógica.
  readonly bajaLogicaDisponible = signal(false);

  listar(pagina = 0, tamanio = 10, ordenarPor: OrdenProducto = 'nombre',
    direccion: Direccion = 'asc'): Observable<PaginaResponse<Producto>> {
    const params = new HttpParams().set('pagina', pagina).set('tamanio', tamanio)
      .set('ordenarPor', ordenarPor).set('direccion', direccion);
    return this.http.get<PaginaResponse<Producto> | Producto[]>(this.url, { params }).pipe(
      map(respuesta => {
        if (!Array.isArray(respuesta)) {
          if (Array.isArray(respuesta?.contenido)) {
            this.bajaLogicaDisponible.set(true);
            return respuesta;
          }
          throw new HttpErrorResponse({ status: 502, statusText: 'Respuesta inválida',
            error: { message: 'La API devolvió un formato de productos no válido.' } });
        }

        this.bajaLogicaDisponible.set(false);
        const sentido = direccion === 'asc' ? 1 : -1;
        const productos = [...respuesta].sort((a, b) => {
          const diferencia = ordenarPor === 'nombre'
            ? a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            : Number(a[ordenarPor]) - Number(b[ordenarPor]);
          return diferencia ? diferencia * sentido : a.id - b.id;
        });
        const totalPaginas = Math.ceil(productos.length / tamanio);
        return {
          contenido: productos.slice(pagina * tamanio, (pagina + 1) * tamanio),
          pagina, tamanio, totalElementos: productos.length, totalPaginas,
          ultima: pagina >= totalPaginas - 1,
        };
      }),
    );
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  crear(dto: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.url, dto);
  }

  actualizar(id: number, dto: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/${id}`, dto);
  }

  darDeBaja(id: number): Observable<void> {
    if (!this.bajaLogicaDisponible()) {
      return throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Backend desactualizado',
        error: { message: 'Reinicia el backend actualizado antes de dar de baja productos.' } }));
    }
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
