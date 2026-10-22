import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Permiso } from '../../core/auth/auth.model';
import { AuthService } from '../../core/auth/auth-service';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let permisos: WritableSignal<Permiso[]>;

  beforeEach(async () => {
    permisos = signal<Permiso[]>([]);
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideHttpClient(), provideRouter([]),
        { provide: AuthService, useValue: { tienePermiso: (permiso: Permiso) => permisos().includes(permiso) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra solo los módulos permitidos y reacciona al cambio de permisos', async () => {
    const contenido: HTMLElement = fixture.nativeElement;
    expect(contenido.textContent).toContain('Inicio');
    expect(contenido.textContent).not.toContain('Ventas');

    permisos.set(['CATALOGO_LEER', 'VENTAS_LEER', 'CLIENTES_LEER']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(contenido.textContent).toContain('Productos');
    expect(contenido.textContent).toContain('Ventas');
    expect(contenido.textContent).toContain('Clientes');
    expect(contenido.textContent).not.toContain('Reportes');

    permisos.set(['CATALOGO_LEER', 'CATALOGO_ESCRIBIR']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(contenido.textContent).toContain('Productos');
    expect(contenido.textContent).not.toContain('Ventas');
    expect(contenido.textContent).not.toContain('Clientes');
  });
});
