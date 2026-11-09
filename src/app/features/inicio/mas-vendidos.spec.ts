import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MasVendidos } from './mas-vendidos';

describe('MasVendidos', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasVendidos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra el estado vacío solo después de recibir una lista vacía', () => {
    const fixture = TestBed.createComponent(MasVendidos);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando datos del reporte');
    expect(fixture.nativeElement.textContent).not.toContain('Aún no hay ventas');

    http.expectOne(req => req.url.endsWith('/reportes/productos-mas-vendidos')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay ventas registradas');
  });

  it('informa una falla del API sin confundirla con ausencia de ventas', () => {
    const fixture = TestBed.createComponent(MasVendidos);
    fixture.detectChanges();
    http.expectOne(req => req.url.endsWith('/reportes/productos-mas-vendidos'))
      .flush({}, { status: 500, statusText: 'Error interno' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toContain('No se pudo obtener el reporte');
    expect(fixture.nativeElement.textContent).not.toContain('Aún no hay ventas');
  });
});
