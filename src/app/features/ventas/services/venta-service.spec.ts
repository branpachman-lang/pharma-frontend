import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VentaService } from './venta-service';

describe('VentaService', () => {
  let servicio: VentaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(VentaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía solo cliente, productos y cantidades al registrar', () => {
    servicio.registrar({ clienteId: 4, detalles: [{ productoId: 9, cantidad: 2 }] }).subscribe();
    const peticion = http.expectOne(req => req.method === 'POST' && req.url.endsWith('/ventas'));
    expect(peticion.request.body).toEqual({
      clienteId: 4, detalles: [{ productoId: 9, cantidad: 2 }],
    });
    peticion.flush({ id: 1 });
  });

  it('aplica filtros y paginación en la consulta', () => {
    servicio.buscar({ clienteId: 4, estado: 'REGISTRADA', desde: '2026-10-01', hasta: null },
      2, 5, 'total', 'asc').subscribe();
    const peticion = http.expectOne(req => req.method === 'GET' && req.url.endsWith('/ventas/buscar'));
    expect(peticion.request.params.get('clienteId')).toBe('4');
    expect(peticion.request.params.get('estado')).toBe('REGISTRADA');
    expect(peticion.request.params.get('desde')).toBe('2026-10-01');
    expect(peticion.request.params.has('hasta')).toBe(false);
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.get('tamanio')).toBe('5');
    expect(peticion.request.params.get('ordenarPor')).toBe('total');
    expect(peticion.request.params.get('direccion')).toBe('asc');
    peticion.flush({ contenido: [], pagina: 2, tamanio: 5,
      totalElementos: 0, totalPaginas: 0, ultima: true });
  });
});
