import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { ProductoService } from '../../services/producto-service';
import { ProductoList } from './producto-list';

describe('ProductoList', () => {
  let fixture: ComponentFixture<ProductoList>;
  let solicitud: number[];

  beforeEach(async () => {
    solicitud = [];
    await TestBed.configureTestingModule({
      imports: [ProductoList],
      providers: [
        provideRouter([]),
        { provide: CategoriaService, useValue: {
          listarTodas: () => of([{
            id: 4, nombre: 'Abarrotes', descripcion: null, estado: true,
            fechaCreacion: '2026-01-01', fechaModificacion: null,
          }]),
        } },
        { provide: ProductoService, useValue: {
          bajaLogicaDisponible: signal(true),
          listar: (pagina: number, tamanio: number) => {
            solicitud = [pagina, tamanio];
            return of({ contenido: [{
              id: 19, nombre: 'Azúcar', descripcion: null, precio: 23.5, stock: 15,
              estado: true, categoriaId: 4, categoriaNombre: 'Abarrotes',
              fechaCreacion: '2026-01-01', fechaModificacion: null,
            }], pagina, tamanio, totalElementos: 1, totalPaginas: 1, ultima: true });
          },
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductoList);
    fixture.componentRef.setInput('categoriaId', '4');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('abre la categoría elegida con los primeros 100 productos cargados', () => {
    const contenido: HTMLElement = fixture.nativeElement;
    const selector = contenido.querySelector<HTMLSelectElement>('#categoria-filtro');
    const tamanio = contenido.querySelector<HTMLSelectElement>('#tamanio-productos');

    expect(solicitud).toEqual([0, 100]);
    expect(selector?.value).toBe('4');
    expect(tamanio?.value).toBe('100');
    expect(contenido.textContent).toContain('Mostrando productos de la categoría Abarrotes en los primeros 100 registros');
    expect(contenido.textContent).toContain('Azúcar');
  });
});
