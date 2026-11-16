import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PaginaResponse } from '../../core/models/pagina-response';
import { mensajeError } from '../../core/utils/http-error';
import { numeroPagina, tamanioPagina, TAMANIOS_PAGINA } from '../../core/utils/parametros-pagina';
import { Paginador } from '../../shared/components/paginador/paginador';

interface EventoAuditoria {
  id: number;
  fecha: string;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: string | null;
  requestId: string | null;
}

const FILTROS_VACIOS = { usuario: '', accion: '', desde: '', hasta: '' };

@Component({
  selector: 'app-auditoria',
  imports: [DatePipe, ReactiveFormsModule, Paginador],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly usuario = input<string>();
  readonly accion = input<string>();
  readonly desde = input<string>();
  readonly hasta = input<string>();
  readonly pagina = input(0, { transform: numeroPagina });
  readonly tamanio = input(20, { transform: (valor: unknown) => tamanioPagina(valor, 20) });

  protected readonly tamanios = TAMANIOS_PAGINA;
  protected readonly form = this.fb.group(FILTROS_VACIOS);
  protected readonly errorFiltro = signal<string | null>(null);
  private readonly filtros = computed(() => ({
    usuario: this.usuario()?.trim() ?? '',
    accion: this.accion()?.trim() ?? '',
    desde: this.desde() ?? '',
    hasta: this.hasta() ?? '',
  }));
  private readonly carga = rxResource({
    params: () => ({ filtros: this.filtros(), pagina: this.pagina(), tamanio: this.tamanio() }),
    stream: ({ params: { filtros, pagina, tamanio } }) => {
      let params = new HttpParams().set('pagina', pagina).set('tamanio', tamanio);
      for (const [nombre, valor] of Object.entries(filtros)) {
        if (valor) params = params.set(nombre, valor);
      }
      return this.http.get<PaginaResponse<EventoAuditoria>>(`${environment.apiUrl}/auditoria`, { params });
    },
  });
  protected readonly cargando = this.carga.isLoading;
  protected readonly resultado = computed(() => this.carga.hasValue() ? this.carga.value() : undefined);
  protected readonly error = computed(() => {
    const error = this.carga.error();
    return error ? mensajeError(error as HttpErrorResponse) : null;
  });

  constructor() {
    effect(() => {
      this.form.reset(this.filtros());
      this.errorFiltro.set(null);
    });
  }

  protected aplicarFiltros(): void {
    const { usuario, accion, desde, hasta } = this.form.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.errorFiltro.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.errorFiltro.set(null);
    this.navegar({
      usuario: usuario.trim() || null, accion: accion.trim().toUpperCase() || null,
      desde: desde || null, hasta: hasta || null, pagina: 0,
    });
  }

  protected limpiarFiltros(): void {
    this.form.reset(FILTROS_VACIOS);
    this.errorFiltro.set(null);
    this.navegar({ usuario: null, accion: null, desde: null, hasta: null, pagina: 0 });
  }

  protected irAPagina(pagina: number): void {
    this.navegar({ pagina });
  }

  protected cambiarTamanio(tamanio: number): void {
    this.navegar({ tamanio, pagina: 0 });
  }

  protected cargar(): void {
    this.carga.reload();
  }

  private navegar(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams, queryParamsHandling: 'merge' });
  }
}
