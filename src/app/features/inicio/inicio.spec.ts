import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { Permiso } from '../../core/auth/auth.model';
import { Inicio } from './inicio';

describe('Inicio', () => {
  let http: HttpTestingController;
  let verReportes = false;

  beforeEach(async () => {
    verReportes = false;
    await TestBed.configureTestingModule({
      imports: [Inicio],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: {
          tienePermiso: (permiso: Permiso) => permiso === 'REPORTES_VER' && verReportes,
        } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('no crea el bloque diferido ni consulta el reporte sin REPORTES_VER', async () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();

    expect(await fixture.getDeferBlocks()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toContain('Productos más vendidos');
    http.expectNone(req => req.url.endsWith('/reportes/productos-mas-vendidos'));
  });

  it('consulta el API solo al activar el bloque y muestra los campos reales del backend', async () => {
    verReportes = true;
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const [bloque] = await fixture.getDeferBlocks();

    expect(fixture.nativeElement.textContent).toContain('Productos más vendidos');
    http.expectNone(req => req.url.endsWith('/reportes/productos-mas-vendidos'));
    await bloque.render(DeferBlockState.Loading);
    expect(fixture.nativeElement.textContent).toContain('Cargando reporte');
    http.expectNone(req => req.url.endsWith('/reportes/productos-mas-vendidos'));

    await bloque.render(DeferBlockState.Complete);
    const solicitud = http.expectOne(req => req.url.endsWith('/reportes/productos-mas-vendidos'));
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([{ id: 12, name: 'Paracetamol', categoria: 'Analgésicos', cantidad: 3, total: 24.5 }]);
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('tbody tr');
    expect(fila.textContent).toContain('Paracetamol');
    expect(fila.textContent).toContain('Analgésicos');
    expect(fila.textContent).toContain('3');
    expect(fila.textContent).toContain('S/ 24.50');
    http.expectNone(req => req.url.endsWith('/reportes/productos-mas-vendidos'));
  });

  it('muestra una alerta si no se puede cargar el archivo diferido', async () => {
    verReportes = true;
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const [bloque] = await fixture.getDeferBlocks();
    await bloque.render(DeferBlockState.Error);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toContain('No se pudo cargar el reporte');
    http.expectNone(req => req.url.endsWith('/reportes/productos-mas-vendidos'));
  });
});
