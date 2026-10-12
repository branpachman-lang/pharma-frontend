import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ReporteService } from '../../services/reporte-service';
import { VentasCategoria } from './ventas-categoria';

describe('VentasCategoria', () => {
  const ventasPorCategoria = vi.fn();

  beforeEach(async () => {
    ventasPorCategoria.mockReset();
    ventasPorCategoria.mockReturnValue(of([
      { categoriaId: 1, categoriaNombre: 'Analgésicos', cantidadVendida: 3, montoTotal: 56.70 },
      { categoriaId: 2, categoriaNombre: 'Abarrotes', cantidadVendida: 2, montoTotal: 18.90 },
    ]));
    await TestBed.configureTestingModule({
      imports: [VentasCategoria],
      providers: [{ provide: ReporteService, useValue: { ventasPorCategoria } }],
    }).compileComponents();
  });

  it('suma unidades e importes y compara cada barra con el monto mayor', () => {
    const fixture = TestBed.createComponent(VentasCategoria);
    fixture.detectChanges();
    const componente = fixture.componentInstance;

    expect(componente['totalUnidades']()).toBe(5);
    expect(componente['montoGeneral']()).toBeCloseTo(75.60);
    expect(componente['porcentaje'](componente['filas']()[0])).toBe(100);
    expect(componente['porcentaje'](componente['filas']()[1])).toBeCloseTo(100 / 3);
  });

  it('rechaza un rango invertido sin enviar una nueva petición', () => {
    const fixture = TestBed.createComponent(VentasCategoria);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente['form'].setValue({ desde: '2026-10-11', hasta: '2026-10-10' });
    componente['generar']();

    expect(componente['filtroError']()).toContain('posterior');
    expect(ventasPorCategoria).toHaveBeenCalledTimes(1);
  });
});
