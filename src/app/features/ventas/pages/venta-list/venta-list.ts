import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { listarTodasPaginas } from '../../../../core/utils/listar-todas-paginas';
import { mensajeError } from '../../../../core/utils/http-error';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { DireccionVenta, EstadoVenta, FiltroVentas, OrdenVenta, Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

const FILTRO_VACIO: FiltroVentas = { clienteId: null, estado: null, desde: null, hasta: null };

@Component({
  selector: 'app-venta-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, SiPermiso],
  templateUrl: './venta-list.html',
  styleUrl: './venta-list.css',
})
export class VentaList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ventas = inject(VentaService);
  private readonly clientesService = inject(ClienteService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly form = this.fb.group({
    clienteId: this.fb.control(''),
    estado: this.fb.control(''),
    desde: this.fb.control(''),
    hasta: this.fb.control(''),
  });
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly respuesta = signal<PaginaResponse<Venta> | null>(null);
  protected readonly aplicado = signal<FiltroVentas>({ ...FILTRO_VACIO });
  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<OrdenVenta>('fecha');
  protected readonly direccion = signal<DireccionVenta>('desc');
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtroError = signal<string | null>(null);
  protected readonly fechaImpresion = signal(new Date());

  constructor() { this.destroyRef.onDestroy(() => this.solicitud?.unsubscribe()); }

  ngOnInit(): void {
    listarTodasPaginas(pagina => this.clientesService.listar(pagina, 100))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: clientes => this.clientes.set(clientes),
        error: (err: HttpErrorResponse) => this.avisos.mostrar(mensajeError(err), 'error'),
      });
    this.cargar();
  }

  protected aplicarFiltros(): void {
    const { clienteId, estado, desde, hasta } = this.form.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.filtroError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.filtroError.set(null);
    this.aplicado.set({
      clienteId: clienteId ? Number(clienteId) : null,
      estado: estado ? estado as EstadoVenta : null,
      desde: desde || null,
      hasta: hasta || null,
    });
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.form.reset();
    this.filtroError.set(null);
    this.aplicado.set({ ...FILTRO_VACIO });
    this.pagina.set(0);
    this.cargar();
  }

  protected cargar(): void {
    this.solicitud?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.respuesta.set(null);
    this.solicitud = this.ventas.buscar(this.aplicado(), this.pagina(), this.tamanio(),
      this.ordenarPor(), this.direccion()).subscribe({
      next: respuesta => {
        this.respuesta.set(respuesta);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const mensaje = mensajeError(err);
        this.error.set(mensaje);
        this.avisos.mostrar(mensaje, 'error');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarTamanio(evento: Event): void {
    const tamanio = Number((evento.target as HTMLSelectElement).value);
    if (![5, 10, 20].includes(tamanio)) return;
    this.tamanio.set(tamanio);
    this.pagina.set(0);
    this.cargar();
  }

  protected ordenar(campo: OrdenVenta): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update(actual => actual === 'asc' ? 'desc' : 'asc');
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set(campo === 'fecha' || campo === 'id' ? 'desc' : 'asc');
    }
    this.pagina.set(0);
    this.cargar();
  }

  protected cambiarPagina(paso: number): void {
    const destino = this.pagina() + paso;
    if (destino < 0 || destino >= (this.respuesta()?.totalPaginas ?? 0)) return;
    this.pagina.set(destino);
    this.cargar();
  }

  protected totalPagina(): number {
    return (this.respuesta()?.contenido ?? [])
      .filter(venta => venta.estado === 'REGISTRADA')
      .reduce((total, venta) => total + Number(venta.total), 0);
  }

  protected nombreCliente(): string {
    const id = this.aplicado().clienteId;
    if (id === null) return 'Todos';
    const cliente = this.clientes().find(c => c.id === id);
    return cliente ? `${cliente.apellidos}, ${cliente.nombres}` : `ID ${id}`;
  }

  protected imprimirListado(): void {
    this.fechaImpresion.set(new Date());
    window.print();
  }
}
