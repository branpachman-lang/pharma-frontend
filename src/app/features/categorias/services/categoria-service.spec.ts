import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaginaResponse } from '../../../core/models/pagina-response';
import { Categoria } from '../models/categoria.model';
import { CategoriaService } from './categoria-service';

describe('CategoriaService', () => {
  let service: CategoriaService;
  let http: HttpTestingController;

  const categoria = (id: number, nombre: string): Categoria => ({
    id, nombre, descripcion: null, estado: true,
    fechaCreacion: '2026-01-01T00:00:00', fechaModificacion: null,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pagina y ordena el arreglo devuelto por la API anterior', () => {
    let resultado: PaginaResponse<Categoria> | undefined;
    service.listar(0, 2, 'nombre', 'asc').subscribe(datos => resultado = datos);

    const peticion = http.expectOne(req => req.url.endsWith('/categorias'));
    expect(peticion.request.params.get('tamanio')).toBe('2');
    peticion.flush([categoria(3, 'Zinc'), categoria(1, 'Analgésicos'), categoria(2, 'Bebidas')]);

    expect(resultado?.contenido.map(c => c.id)).toEqual([1, 2]);
    expect(resultado?.totalElementos).toBe(3);
    expect(resultado?.totalPaginas).toBe(2);
    expect(resultado?.ultima).toBe(false);
  });

  it('conserva la página devuelta por la API actual', () => {
    let resultado: PaginaResponse<Categoria> | undefined;
    service.listar(1, 2).subscribe(datos => resultado = datos);

    const peticion = http.expectOne(req => req.url.endsWith('/categorias'));
    const pagina: PaginaResponse<Categoria> = {
      contenido: [categoria(3, 'Zinc')], pagina: 1, tamanio: 2,
      totalElementos: 3, totalPaginas: 2, ultima: true,
    };
    peticion.flush(pagina);

    expect(resultado).toEqual(pagina);
  });

  it('reúne todas las páginas para el selector de productos', () => {
    let nombres: string[] = [];
    service.listarTodas().subscribe(categorias => nombres = categorias.map(c => c.nombre));

    const primera = http.expectOne(req => req.url.endsWith('/categorias') && req.params.get('pagina') === '0');
    primera.flush({ contenido: [categoria(1, 'Analgésicos')], pagina: 0, tamanio: 100,
      totalElementos: 2, totalPaginas: 2, ultima: false });
    const segunda = http.expectOne(req => req.url.endsWith('/categorias') && req.params.get('pagina') === '1');
    segunda.flush({ contenido: [categoria(2, 'Bebidas')], pagina: 1, tamanio: 100,
      totalElementos: 2, totalPaginas: 2, ultima: true });

    expect(nombres).toEqual(['Analgésicos', 'Bebidas']);
  });
});
