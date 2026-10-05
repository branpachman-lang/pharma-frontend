import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { Categoria } from '../../models/categoria.model';
import { CategoriaService } from '../../services/categoria-service';

@Component({
  selector: 'app-categoria-list',
  imports: [RouterLink],
  templateUrl: './categoria-list.html',
  styleUrl: './categoria-list.css',
})
export class CategoriaList implements OnInit {
  private readonly servicio = inject(CategoriaService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly respuesta = signal<PaginaResponse<Categoria> | null>(null);
  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<'id' | 'nombre' | 'estado'>('nombre');
  protected readonly direccion = signal<'asc' | 'desc'>('asc');
  protected readonly filtro = signal('');
  protected readonly cargando = signal(false);
  protected readonly pendiente = signal<Categoria | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly filtradas = computed(() => {
    const texto = this.filtro().trim().toLocaleLowerCase();
    return (this.respuesta()?.contenido ?? []).filter(c => c.nombre.toLocaleLowerCase().includes(texto));
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.solicitud?.unsubscribe());
  }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.solicitud?.unsubscribe();
    this.cargando.set(true);
    this.solicitud = this.servicio.listar(this.pagina(), this.tamanio(), this.ordenarPor(), this.direccion())
      .subscribe({
        next: datos => { this.respuesta.set(datos); this.cargando.set(false); },
        error: (err: HttpErrorResponse) => {
          this.avisos.mostrar(mensajeError(err), 'error');
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

  ordenar(campo: 'id' | 'nombre' | 'estado'): void {
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
    if (destino < 0 || destino >= (this.respuesta()?.totalPaginas ?? 0)) return;
    this.pagina.set(destino);
    this.cargar();
  }

  eliminar(categoria: Categoria): void { this.pendiente.set(categoria); }

  confirmarBaja(): void {
    const categoria = this.pendiente();
    if (!categoria || this.eliminando()) return;
    this.eliminando.set(true);
    this.servicio.eliminar(categoria.id).subscribe({
      next: () => {
        this.pendiente.set(null);
        this.eliminando.set(false);
        this.avisos.mostrar(`La categoría «${categoria.nombre}» se dio de baja correctamente.`);
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
