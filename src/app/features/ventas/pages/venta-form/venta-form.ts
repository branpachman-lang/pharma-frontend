import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { listarTodasPaginas } from '../../../../core/utils/listar-todas-paginas';
import { mensajeError } from '../../../../core/utils/http-error';
import { redondear } from '../../../../core/utils/numeros';
import { coincide } from '../../../../core/utils/texto';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { Producto } from '../../../productos/models/producto.model';
import { ProductoService } from '../../../productos/services/producto-service';
import { VentaRequest } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

interface LineaForm {
  productoId: FormControl<number | null>;
  cantidad: FormControl<number>;
}

@Component({
  selector: 'app-venta-form',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  templateUrl: './venta-form.html',
  styleUrl: './venta-form.css',
})
export class VentaForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ventas = inject(VentaService);
  private readonly clientesService = inject(ClienteService);
  private readonly productosService = inject(ProductoService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly imprimirAlRegistrar = signal(true);

  protected readonly form = this.fb.group({
    clienteId: this.fb.control<number | null>(null, Validators.required),
    detalles: this.fb.array<FormGroup<LineaForm>>([], Validators.required),
  });

  get detalles() { return this.form.controls.detalles; }

  protected readonly buscarCliente = new FormControl('', { nonNullable: true });
  protected readonly buscarProducto = new FormControl('', { nonNullable: true });
  private readonly textoCliente = toSignal(this.buscarCliente.valueChanges, { initialValue: '' });
  private readonly textoProducto = toSignal(this.buscarProducto.valueChanges, { initialValue: '' });
  private readonly valor = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  private readonly productoPorId = computed(() => new Map(this.productos().map(p => [p.id, p])));

  protected readonly clienteElegido = computed(() =>
    this.clientes().find(c => c.id === this.valor().clienteId));
  protected readonly clientesEncontrados = computed(() => {
    const busqueda = this.textoCliente().trim();
    return busqueda ? this.clientes().filter(c => c.estado &&
      coincide(busqueda, c.nombres, c.apellidos, c.dni)).slice(0, 6) : [];
  });
  protected readonly productosEncontrados = computed(() => {
    const busqueda = this.textoProducto().trim();
    return busqueda ? this.productos().filter(p => p.estado && p.stock > 0 &&
      coincide(busqueda, p.nombre, p.categoriaNombre)).slice(0, 6) : [];
  });
  protected readonly lineas = computed(() => (this.valor().detalles ?? []).map(detalle => {
    const producto = detalle.productoId ? this.productoPorId().get(detalle.productoId) : undefined;
    const cantidad = Number(detalle.cantidad) || 0;
    const precio = producto?.precio ?? 0;
    return { producto, precio, cantidad, subtotal: redondear(precio * cantidad),
      excedeStock: !!producto && cantidad > producto.stock };
  }));
  protected readonly total = computed(() =>
    redondear(this.lineas().reduce((suma, linea) => suma + linea.subtotal, 0)));
  protected readonly hayExcesoDeStock = computed(() => this.lineas().some(l => l.excedeStock));

  ngOnInit(): void { this.cargarCatalogos(); }

  protected cargarCatalogos(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    forkJoin({
      clientes: listarTodasPaginas(pagina => this.clientesService.listar(pagina, 100)),
      productos: listarTodasPaginas(pagina => this.productosService.listar(pagina, 100)),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ clientes, productos }) => {
        this.clientes.set(clientes);
        this.productos.set(productos);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const mensaje = mensajeError(err);
        this.errorCarga.set(mensaje);
        this.avisos.mostrar(mensaje, 'error');
        this.cargando.set(false);
      },
    });
  }

  protected elegirCliente(cliente: Cliente): void {
    this.form.controls.clienteId.setValue(cliente.id);
    this.buscarCliente.setValue('');
  }

  protected cambiarCliente(): void {
    this.form.controls.clienteId.setValue(null);
  }

  protected agregarProducto(producto: Producto): void {
    const existente = this.detalles.controls.find(linea => linea.controls.productoId.value === producto.id);
    if (existente) {
      existente.controls.cantidad.setValue(Number(existente.controls.cantidad.value) + 1);
    } else {
      this.detalles.push(this.fb.group({
        productoId: this.fb.control<number | null>(producto.id, Validators.required),
        cantidad: this.fb.control(1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      }));
    }
    this.buscarProducto.setValue('');
  }

  protected agregarPrimero(evento: Event): void {
    evento.preventDefault();
    const primero = this.productosEncontrados()[0];
    if (primero) this.agregarProducto(primero);
  }

  protected quitarLinea(indice: number): void { this.detalles.removeAt(indice); }

  protected cantidadEnDetalle(productoId: number): number {
    return Number(this.valor().detalles?.find(d => d.productoId === productoId)?.cantidad ?? 0);
  }

  protected revisar(): void {
    if (this.form.invalid || this.hayExcesoDeStock()) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmando.set(true);
  }

  protected volver(): void {
    if (!this.guardando()) this.confirmando.set(false);
  }

  protected confirmar(): void {
    if (this.guardando()) return;
    if (this.form.invalid || this.hayExcesoDeStock()) {
      this.confirmando.set(false);
      this.form.markAllAsTouched();
      return;
    }
    const datos = this.form.getRawValue();
    const solicitud: VentaRequest = {
      clienteId: Number(datos.clienteId),
      detalles: datos.detalles.map(d => ({ productoId: Number(d.productoId), cantidad: Number(d.cantidad) })),
    };
    this.guardando.set(true);
    this.ventas.registrar(solicitud).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: venta => {
        void this.router.navigate(['/ventas', venta.id], {
          queryParams: this.imprimirAlRegistrar() ? { nueva: 1, imprimir: 1 } : { nueva: 1 },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.confirmando.set(false);
        this.avisos.mostrar(mensajeError(err), 'error');
      },
    });
  }
}
