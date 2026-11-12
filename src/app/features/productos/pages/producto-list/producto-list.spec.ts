import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Permiso } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { ProductoService } from '../../services/producto-service';
import { ProductoList } from './producto-list';

describe('ProductoList', () => {
  let fixture: ComponentFixture<ProductoList>;
  let solicitud: number[];
  let permisos: WritableSignal<Permiso[]>;

  beforeEach(async () => {
    solicitud = [];
    permisos = signal<Permiso[]>(['CATALOGO_LEER']);
    await TestBed.configureTestingModule({
      imports: [ProductoList],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { tienePermiso: (permiso: Permiso) => permisos().includes(permiso) } },
        { provide: CategoriaService, useValue: {
          listarTodas: () => of([{
            id: 4, nombre: 'Abarrotes', descripcion: null, estado: true,
            fechaCreacion: '2026-01-01', fechaModificacion: null,
          }]),
        } },
        { provide: ProductoService, useValue: {
          bajaLogicaDisponible: signal(true),
          listarPagina: ({ pagina, tamanio }: { pagina: number; tamanio: number }, categoriaId: number) => {
            solicitud = [pagina, tamanio, categoriaId];
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

  it('envía la categoría al servidor y muestra la página recibida', () => {
    const contenido: HTMLElement = fixture.nativeElement;
    const selector = contenido.querySelector<HTMLSelectElement>('#categoria-filtro');
    const tamanio = contenido.querySelector<HTMLSelectElement>('app-paginador select');

    expect(solicitud).toEqual([0, 20, 4]);
    expect(selector?.value).toBe('4');
    expect(tamanio?.value).toBe('20');
    expect(contenido.querySelector('[data-testid="resumen-paginacion"]')?.textContent).toContain('1–1 de 1');
    expect(contenido.textContent).toContain('Azúcar');
  });

  it('oculta edición al vendedor y la muestra al obtener permiso de escritura', async () => {
    const contenido: HTMLElement = fixture.nativeElement;
    expect(contenido.textContent).not.toContain('Nuevo producto');
    expect(contenido.querySelectorAll('.acciones').length).toBe(0);

    permisos.set(['CATALOGO_LEER', 'CATALOGO_ESCRIBIR']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(contenido.textContent).toContain('Nuevo producto');
    expect(contenido.querySelectorAll('.acciones').length).toBe(1);
  });
});
