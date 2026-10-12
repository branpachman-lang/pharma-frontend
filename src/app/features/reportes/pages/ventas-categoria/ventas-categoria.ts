import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { redondear } from '../../../../core/utils/numeros';
import { VentaPorCategoria } from '../../models/reporte.model';
import { ReporteService } from '../../services/reporte-service';

@Component({
  selector: 'app-ventas-categoria',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './ventas-categoria.html',
  styleUrl: './ventas-categoria.css',
})
export class VentasCategoria implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reportes = inject(ReporteService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly form = this.fb.group({
    desde: this.fb.control(''),
    hasta: this.fb.control(''),
  });
  protected readonly filas = signal<VentaPorCategoria[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtroError = signal<string | null>(null);
  protected readonly periodo = signal({ desde: '', hasta: '' });

  protected readonly totalUnidades = computed(() =>
    this.filas().reduce((suma, fila) => suma + Number(fila.cantidadVendida), 0));
  protected readonly montoGeneral = computed(() =>
    redondear(this.filas().reduce((suma, fila) => suma + Number(fila.montoTotal), 0)));
  protected readonly montoMayor = computed(() =>
    Math.max(0, ...this.filas().map(fila => Number(fila.montoTotal))));

  constructor() { this.destroyRef.onDestroy(() => this.solicitud?.unsubscribe()); }

  ngOnInit(): void { this.generar(); }

  protected generar(): void {
    const { desde, hasta } = this.form.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.filtroError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    this.filtroError.set(null);
    this.periodo.set({ desde, hasta });
    this.solicitud?.unsubscribe();
    this.filas.set([]);
    this.error.set(null);
    this.cargando.set(true);
    this.solicitud = this.reportes.ventasPorCategoria(desde || null, hasta || null).subscribe({
      next: filas => {
        this.filas.set(filas);
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

  protected limpiar(): void {
    this.form.reset();
    this.generar();
  }

  protected porcentaje(fila: VentaPorCategoria): number {
    return this.montoMayor() ? Math.min(100, Number(fila.montoTotal) / this.montoMayor() * 100) : 0;
  }
}
