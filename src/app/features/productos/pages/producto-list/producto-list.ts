import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { idPositivo, numeroPagina, tamanioPagina, TAMANIOS_PAGINA } from '../../../../core/utils/parametros-pagina';
import { Paginador } from '../../../../shared/components/paginador/paginador';
import { SiPermiso } from '../../../../shared/directives/si-permiso';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { Direccion, OrdenProducto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';

@Component({
  selector: 'app-producto-list',
  imports: [RouterLink, CurrencyPipe, SiPermiso, Paginador],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList implements OnInit {
  readonly categoriaId = input(null, { transform: idPositivo });
  readonly pagina = input(0, { transform: numeroPagina });
  readonly tamanio = input(20, { transform: (valor: unknown) => tamanioPagina(valor, 20) });
  readonly orden = input('nombre', {
    transform: (valor: unknown): OrdenProducto => valor === 'precio' || valor === 'stock' || valor === 'id'
      ? valor : 'nombre',
  });
  readonly dir = input('asc', { transform: (valor: unknown): Direccion => valor === 'desc' ? 'desc' : 'asc' });

  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly tamanios = TAMANIOS_PAGINA;
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly errorCategorias = signal<string | null>(null);
  protected readonly pendiente = signal<Producto | null>(null);
  protected readonly eliminando = signal(false);

  private readonly carga = rxResource({
    params: () => ({
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      ordenarPor: this.orden(),
      direccion: this.dir(),
      categoriaId: this.categoriaId(),
    }),
    stream: ({ params: { categoriaId, ...consulta } }) => this.productoService.listarPagina(consulta, categoriaId),
  });
  protected readonly cargando = this.carga.isLoading;
  protected readonly errorProductos = computed(() => {
    const error = this.carga.error();
    return error ? mensajeError(error as HttpErrorResponse) : null;
  });
  protected readonly resultado = linkedSignal<PaginaResponse<Producto> | undefined, PaginaResponse<Producto> | undefined>({
    source: () => this.carga.hasValue() ? this.carga.value() : undefined,
    computation: (pagina, anterior) => pagina ?? anterior?.value,
  });

  ngOnInit(): void {
    this.categoriaService.listarTodas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: categorias => this.categorias.set(categorias),
      error: (err: HttpErrorResponse) => this.errorCategorias.set(mensajeError(err)),
    });
  }

  protected cargar(): void {
    this.carga.reload();
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  protected ordenar(campo: OrdenProducto): void {
    const dir = this.orden() === campo && this.dir() === 'asc' ? 'desc' : 'asc';
    this.navegar({ orden: campo, dir, pagina: 0 });
  }

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  protected filtrarPorCategoria(valor: string): void {
    this.navegar({ categoriaId: idPositivo(valor), pagina: 0 });
  }

  private navegar(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams, queryParamsHandling: 'merge' });
  }

  darDeBaja(producto: Producto): void {
    if (producto.estado && this.productoService.bajaLogicaDisponible()) this.pendiente.set(producto);
  }

  confirmarBaja(): void {
    const producto = this.pendiente();
    if (!producto || this.eliminando()) return;
    this.eliminando.set(true);
    this.productoService.darDeBaja(producto.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.pendiente.set(null);
        this.eliminando.set(false);
        this.avisos.mostrar(`El producto «${producto.nombre}» se dio de baja correctamente.`);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.pendiente.set(null);
        this.eliminando.set(false);
        this.avisos.mostrar(mensajeError(err), 'error');
      },
    });
  }
}
