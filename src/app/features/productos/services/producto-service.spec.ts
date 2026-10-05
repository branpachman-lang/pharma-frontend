import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { Producto } from '../models/producto.model';
import { ProductoService } from './producto-service';

describe('ProductoService', () => {
  let service: ProductoService;
  let http: HttpTestingController;

  const producto = (id: number, nombre: string): Producto => ({
    id, nombre, descripcion: null, precio: 12, stock: 5, estado: true,
    categoriaId: 1, categoriaNombre: 'Analgésicos',
    fechaCreacion: '2026-01-01T00:00:00', fechaModificacion: null,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía paginación y reconoce la respuesta paginada', () => {
    let resultado: PaginaResponse<Producto> | undefined;
    service.listar(1, 5, 'precio', 'desc').subscribe(datos => resultado = datos);
    const peticion = http.expectOne(req => req.url.endsWith('/productos'));
    expect(peticion.request.params.get('pagina')).toBe('1');
    expect(peticion.request.params.get('tamanio')).toBe('5');
    expect(peticion.request.params.get('ordenarPor')).toBe('precio');
    expect(peticion.request.params.get('direccion')).toBe('desc');
    const pagina: PaginaResponse<Producto> = {
      contenido: [producto(2, 'Ibuprofeno')], pagina: 1, tamanio: 5,
      totalElementos: 6, totalPaginas: 2, ultima: true,
    };
    peticion.flush(pagina);
    expect(resultado).toEqual(pagina);
    expect(service.bajaLogicaDisponible()).toBe(true);
  });

  it('pagina el arreglo anterior y bloquea su eliminación física', () => {
    let resultado: PaginaResponse<Producto> | undefined;
    service.listar(0, 1, 'nombre', 'asc').subscribe(datos => resultado = datos);
    http.expectOne(req => req.url.endsWith('/productos'))
      .flush([producto(2, 'Zinc'), producto(1, 'Aspirina')]);

    expect(resultado?.contenido.map(p => p.nombre)).toEqual(['Aspirina']);
    expect(resultado?.totalPaginas).toBe(2);
    expect(service.bajaLogicaDisponible()).toBe(false);
    let mensaje = '';
    service.darDeBaja(1).subscribe({ error: err => mensaje = err.error.message });
    expect(mensaje).toContain('Reinicia el backend');
  });
});
