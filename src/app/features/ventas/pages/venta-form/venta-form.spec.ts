import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { ProductoService } from '../../../productos/services/producto-service';
import { VentaService } from '../../services/venta-service';
import { VentaForm } from './venta-form';

@Component({ template: '' })
class PantallaVacia {}

describe('VentaForm', () => {
  const registrar = vi.fn();

  beforeEach(async () => {
    registrar.mockReset();
    registrar.mockReturnValue(of({ id: 30 }));
    await TestBed.configureTestingModule({
      imports: [VentaForm],
      providers: [
        provideRouter([{ path: 'ventas/:id', component: PantallaVacia }]),
        { provide: ClienteService, useValue: { listar: () => of({
          contenido: [{ id: 1, dni: '12345678', nombres: 'Ana', apellidos: 'Pacho',
            email: 'ana@example.com', telefono: null, direccion: null, estado: true,
            fechaCreacion: '2026-10-01', fechaModificacion: null }],
          pagina: 0, tamanio: 100, totalElementos: 1, totalPaginas: 1, ultima: true,
        }) } },
        { provide: ProductoService, useValue: { listar: () => of({
          contenido: [{ id: 2, nombre: 'Paracetamol', descripcion: null, precio: 5.5,
            stock: 10, estado: true, categoriaId: 3, categoriaNombre: 'Analgésicos',
            fechaCreacion: '2026-10-01', fechaModificacion: null }],
          pagina: 0, tamanio: 100, totalElementos: 1, totalPaginas: 1, ultima: true,
        }) } },
        { provide: VentaService, useValue: { registrar } },
      ],
    }).compileComponents();
  });

  it('calcula el total y solo registra al confirmar', () => {
    const fixture = TestBed.createComponent(VentaForm);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    const cliente = componente['clientes']()[0];
    const producto = componente['productos']()[0];
    componente['elegirCliente'](cliente);
    componente['agregarProducto'](producto);
    componente.detalles.at(0).controls.cantidad.setValue(3);

    expect(componente['total']()).toBe(16.5);
    componente['revisar']();
    expect(componente['confirmando']()).toBe(true);
    expect(registrar).not.toHaveBeenCalled();

    componente['confirmar']();
    expect(registrar).toHaveBeenCalledExactlyOnceWith({
      clienteId: 1, detalles: [{ productoId: 2, cantidad: 3 }],
    });
  });

  it('impide confirmar cantidades que exceden el stock', () => {
    const fixture = TestBed.createComponent(VentaForm);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente['elegirCliente'](componente['clientes']()[0]);
    componente['agregarProducto'](componente['productos']()[0]);
    componente.detalles.at(0).controls.cantidad.setValue(11);

    componente['revisar']();

    expect(componente['hayExcesoDeStock']()).toBe(true);
    expect(componente['confirmando']()).toBe(false);
    expect(registrar).not.toHaveBeenCalled();
  });
});
