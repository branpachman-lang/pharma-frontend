import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CategoriaService } from '../../services/categoria-service';
import { CategoriaList } from './categoria-list';

describe('CategoriaList', () => {
  let component: CategoriaList;
  let fixture: ComponentFixture<CategoriaList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaList],
      providers: [
        provideRouter([]),
        { provide: CategoriaService, useValue: { listar: () => of({
          contenido: [{ id: 4, nombre: 'Abarrotes', descripcion: null, estado: true,
            fechaCreacion: '2026-01-01', fechaModificacion: null }],
          pagina: 0, tamanio: 10, totalElementos: 1, totalPaginas: 1, ultima: true,
        }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriaList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('enlaza los productos de la categoría con el parámetro categoriaId', () => {
    const contenido: HTMLElement = fixture.nativeElement;
    const enlace = [...contenido.querySelectorAll<HTMLAnchorElement>('a')]
      .find(elemento => elemento.textContent?.includes('Ver productos'));

    expect(enlace?.getAttribute('href')).toBe('/productos?categoriaId=4');
  });
});
