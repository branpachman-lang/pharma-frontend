import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { Direccion, OrdenProducto, Producto } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';

@Component({
  selector: 'app-producto-list',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList implements OnInit {
  protected readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<OrdenProducto>('nombre');
  protected readonly direccion = signal<Direccion>('asc');
  protected readonly resultado = signal<PaginaResponse<Producto> | null>(null);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly categoriaFiltro = signal<number | null>(null);
  protected readonly cargando = signal(false);
  protected readonly errorCategorias = signal<string | null>(null);
  protected readonly errorProductos = signal<string | null>(null);
  protected readonly pendiente = signal<Producto | null>(null);
  protected readonly eliminando = signal(false);

  protected readonly productos = computed(() => {
    const filtro = this.categoriaFiltro();
    const lista = this.resultado()?.contenido ?? [];
    return filtro === null ? lista : lista.filter(producto => producto.categoriaId === filtro);
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.solicitud?.unsubscribe());
  }

  ngOnInit(): void {
    this.categoriaService.listarTodas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: categorias => this.categorias.set(categorias),
      error: (err: HttpErrorResponse) => this.errorCategorias.set(mensajeError(err)),
    });
    this.cargar();
  }

  cargar(): void {
    this.solicitud?.unsubscribe();
    this.cargando.set(true);
    this.errorProductos.set(null);
    this.solicitud = this.productoService
      .listar(this.pagina(), this.tamanio(), this.ordenarPor(), this.direccion())
      .subscribe({
        next: datos => {
          this.resultado.set(datos);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorProductos.set(mensajeError(err));
          this.cargando.set(false);
        },
      });
  }

  cambiarTamanio(event: Event): void {
    const valor = Number((event.target as HTMLSelectElement).value);
    if (![5, 10, 20].includes(valor)) return;
    this.tamanio.set(valor);
    this.pagina.set(0);
    this.cargar();
  }

  ordenar(campo: OrdenProducto): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update(actual => actual === 'asc' ? 'desc' : 'asc');
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set('asc');
    }
    this.pagina.set(0);
    this.cargar();
  }

  cambiarPagina(desplazamiento: number): void {
    const destino = this.pagina() + desplazamiento;
    if (destino < 0 || destino >= (this.resultado()?.totalPaginas ?? 0)) return;
    this.pagina.set(destino);
    this.cargar();
  }

  filtrarPorCategoria(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.categoriaFiltro.set(valor ? Number(valor) : null);
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
