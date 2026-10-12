import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VentaPorCategoria } from '../models/reporte.model';

interface RespuestaAnterior {
  categoriaId: number;
  categoria: string;
  cantidad: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reportes/ventas-por-categoria`;

  ventasPorCategoria(desde: string | null, hasta: string | null): Observable<VentaPorCategoria[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);

    return this.http.get<Array<VentaPorCategoria | RespuestaAnterior>>(this.url, { params }).pipe(
      map(filas => filas.map(fila => 'categoriaNombre' in fila ? fila : {
        categoriaId: fila.categoriaId,
        categoriaNombre: fila.categoria,
        cantidadVendida: fila.cantidad,
        montoTotal: fila.total,
      })),
    );
  }
}
