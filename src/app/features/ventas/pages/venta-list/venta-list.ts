import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { listarTodasPaginas } from '../../../../core/utils/listar-todas-paginas';
import { mensajeError } from '../../../../core/utils/http-error';
import { idPositivo, numeroPagina, tamanioPagina, TAMANIOS_PAGINA } from '../../../../core/utils/parametros-pagina';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { DireccionVenta, EstadoVenta, FiltroVentas, OrdenVenta, Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

@Component({
  selector: 'app-venta-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, SiPermiso, Paginador],
  templateUrl: './venta-list.html',
  styleUrl: './venta-list.css',
})
export class VentaList implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ventas = inject(VentaService);
  private readonly clientesService = inject(ClienteService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly pagina = input(0, { transform: numeroPagina });
  readonly tamanio = input(10, { transform: (valor: unknown) => tamanioPagina(valor, 10) });
  readonly orden = input('fecha', {
    transform: (valor: unknown): OrdenVenta => valor === 'id' || valor === 'total' || valor === 'estado'
      ? valor : 'fecha',
  });
  readonly dir = input('desc', { transform: (valor: unknown): DireccionVenta => valor === 'asc' ? 'asc' : 'desc' });
  readonly clienteId = input(null, { transform: idPositivo });
  readonly estado = input(null, {
    transform: (valor: unknown): EstadoVenta | null => valor === 'REGISTRADA' || valor === 'ANULADA' ? valor : null,
  });
  readonly desde = input<string>();
  readonly hasta = input<string>();

  protected readonly form = this.fb.group({
    clienteId: this.fb.control(''),
    estado: this.fb.control(''),
    desde: this.fb.control(''),
    hasta: this.fb.control(''),
  });
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly tamanios = TAMANIOS_PAGINA;
  protected readonly aplicado = computed<FiltroVentas>(() => ({
    clienteId: this.clienteId(),
    estado: this.estado(),
    desde: this.desde() || null,
    hasta: this.hasta() || null,
  }));
  protected readonly filtroError = signal<string | null>(null);
  protected readonly fechaImpresion = signal(new Date());
  private readonly carga = rxResource({
    params: () => ({
      filtros: this.aplicado(),
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      orden: this.orden(),
      dir: this.dir(),
    }),
    stream: ({ params }) => this.ventas.buscar(params.filtros, params.pagina, params.tamanio, params.orden, params.dir),
  });
  protected readonly cargando = this.carga.isLoading;
  protected readonly error = computed(() => {
    const error = this.carga.error();
    return error ? mensajeError(error as HttpErrorResponse) : null;
  });
  protected readonly respuesta = linkedSignal<PaginaResponse<Venta> | undefined, PaginaResponse<Venta> | undefined>({
    source: () => this.carga.hasValue() ? this.carga.value() : undefined,
    computation: (pagina, anterior) => pagina ?? anterior?.value,
  });

  constructor() {
    effect(() => {
      const { clienteId, estado, desde, hasta } = this.aplicado();
      this.form.setValue({
        clienteId: clienteId === null ? '' : String(clienteId),
        estado: estado ?? '', desde: desde ?? '', hasta: hasta ?? '',
      });
      this.filtroError.set(null);
    });
  }

  ngOnInit(): void {
    listarTodasPaginas(pagina => this.clientesService.listar(pagina, 100))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: clientes => this.clientes.set(clientes),
        error: (err: HttpErrorResponse) => this.avisos.mostrar(mensajeError(err), 'error'),
      });
  }

  protected aplicarFiltros(): void {
    const { clienteId, estado, desde, hasta } = this.form.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.filtroError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.filtroError.set(null);
    this.navegar({ clienteId: idPositivo(clienteId), estado: estado || null,
      desde: desde || null, hasta: hasta || null, pagina: 0 });
  }

  protected limpiarFiltros(): void {
    this.form.reset();
    this.filtroError.set(null);
    this.navegar({ clienteId: null, estado: null, desde: null, hasta: null, pagina: 0 });
  }

  protected cargar(): void {
    this.carga.reload();
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  protected ordenar(campo: OrdenVenta): void {
    const dir = this.orden() === campo
      ? (this.dir() === 'asc' ? 'desc' : 'asc')
      : (campo === 'fecha' || campo === 'id' ? 'desc' : 'asc');
    this.navegar({ orden: campo, dir, pagina: 0 });
  }

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  private navegar(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams, queryParamsHandling: 'merge' });
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
