import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// Nombres del contrato actual de ProductoMasVendidoDTO en PharmaBackend.
interface ProductoMasVendido {
  id: number;
  name: string;
  categoria: string;
  cantidad: number;
  total: number;
}

type EstadoReporte =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; filas: ProductoMasVendido[] }
  | { tipo: 'error' };

@Component({
  selector: 'app-mas-vendidos',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './mas-vendidos.html',
  styleUrl: './mas-vendidos.css',
})
export class MasVendidos {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/reportes/productos-mas-vendidos`;

  protected readonly estado = toSignal(
    this.http.get<ProductoMasVendido[]>(this.url).pipe(
      map((filas): EstadoReporte => ({ tipo: 'listo', filas })),
      catchError(() => of<EstadoReporte>({ tipo: 'error' })),
    ),
    { initialValue: { tipo: 'cargando' } as EstadoReporte },
  );
}
