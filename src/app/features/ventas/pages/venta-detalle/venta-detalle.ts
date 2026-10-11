import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { Cliente } from '../../../clientes/models/cliente.model';
import { ClienteService } from '../../../clientes/services/cliente-service';
import { Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta-service';

@Component({
  selector: 'app-venta-detalle',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './venta-detalle.html',
  styleUrl: './venta-detalle.css',
})
export class VentaDetalle implements OnInit {
  private readonly ventas = inject(VentaService);
  private readonly clientes = inject(ClienteService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);
  private impresionProgramada?: ReturnType<typeof setTimeout>;

  readonly id = input.required<string>();
  readonly nueva = input<string>();
  readonly imprimir = input<string>();

  protected readonly venta = signal<Venta | null>(null);
  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly fechaImpresion = signal(new Date());
  protected readonly numero = computed(() => String(this.venta()?.id ?? '').padStart(6, '0'));
  protected readonly unidades = computed(() =>
    (this.venta()?.detalles ?? []).reduce((suma, detalle) => suma + detalle.cantidad, 0));

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.impresionProgramada));
  }

  ngOnInit(): void { this.cargar(); }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.ventas.obtener(Number(this.id())).pipe(
      switchMap(venta => this.clientes.obtener(venta.clienteId).pipe(
        catchError(() => of(null)),
        map(cliente => ({ venta, cliente })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ venta, cliente }) => {
        this.venta.set(venta);
        this.cliente.set(cliente);
        this.cargando.set(false);
        if (this.nueva()) this.avisos.mostrar('Venta registrada correctamente.');
        if (this.imprimir()) {
          this.impresionProgramada = setTimeout(() => this.imprimirComprobante(), 300);
        }
      },
      error: (err: HttpErrorResponse) => {
        const mensaje = mensajeError(err);
        this.error.set(mensaje);
        this.avisos.mostrar(mensaje, 'error');
        this.cargando.set(false);
      },
    });
  }

  protected imprimirComprobante(): void {
    this.fechaImpresion.set(new Date());
    window.print();
  }
}
