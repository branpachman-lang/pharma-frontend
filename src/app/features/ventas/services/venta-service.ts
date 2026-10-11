import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { DireccionVenta, FiltroVentas, OrdenVenta, Venta, VentaRequest } from '../models/venta.model';

@Service()
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/ventas`;

  registrar(dto: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(this.url, dto);
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.url}/${id}`);
  }

  buscar(filtro: FiltroVentas, pagina = 0, tamanio = 10,
    ordenarPor: OrdenVenta = 'fecha', direccion: DireccionVenta = 'desc'): Observable<PaginaResponse<Venta>> {
    let params = new HttpParams()
      .set('pagina', pagina).set('tamanio', tamanio)
      .set('ordenarPor', ordenarPor).set('direccion', direccion);
    if (filtro.clienteId !== null) params = params.set('clienteId', filtro.clienteId);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    return this.http.get<PaginaResponse<Venta> | Venta[]>(`${this.url}/buscar`, { params }).pipe(
      map(respuesta => {
        // Versiones anteriores de /buscar devolvían una lista completa.
        if (!Array.isArray(respuesta)) return respuesta;
        const totalElementos = respuesta.length;
        const totalPaginas = Math.ceil(totalElementos / tamanio);
        return {
          contenido: respuesta.slice(pagina * tamanio, (pagina + 1) * tamanio),
          pagina, tamanio, totalElementos, totalPaginas,
          ultima: pagina + 1 >= totalPaginas,
        };
      }),
    );
  }
}
