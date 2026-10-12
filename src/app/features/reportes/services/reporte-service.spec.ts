import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VentaPorCategoria } from '../models/reporte.model';
import { ReporteService } from './reporte-service';

describe('ReporteService', () => {
  let service: ReporteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReporteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía únicamente las fechas informadas', () => {
    service.ventasPorCategoria('2026-10-01', null).subscribe();
    const peticion = http.expectOne(req => req.url.endsWith('/reportes/ventas-por-categoria'));
    expect(peticion.request.params.get('desde')).toBe('2026-10-01');
    expect(peticion.request.params.has('hasta')).toBe(false);
    peticion.flush([]);
  });

  it('adapta la respuesta anterior del backend sin perder los importes', () => {
    let filas: VentaPorCategoria[] = [];
    service.ventasPorCategoria(null, null).subscribe(datos => filas = datos);
    const peticion = http.expectOne(req => req.url.endsWith('/reportes/ventas-por-categoria'));
    expect(peticion.request.params.keys()).toEqual([]);
    peticion.flush([{ categoriaId: 1, categoria: 'Analgésicos', cantidad: 3, total: 56.70 }]);
    expect(filas).toEqual([{
      categoriaId: 1, categoriaNombre: 'Analgésicos', cantidadVendida: 3, montoTotal: 56.70,
    }]);
  });
});
