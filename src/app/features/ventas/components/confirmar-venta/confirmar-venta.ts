import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmar-venta',
  imports: [CurrencyPipe],
  templateUrl: './confirmar-venta.html',
  styleUrl: './confirmar-venta.css',
})
export class ConfirmarVenta {
  readonly cliente = input.required<string>();
  readonly cantidadProductos = input.required<number>();
  readonly total = input.required<number>();
  readonly guardando = input(false);
  readonly imprimir = input(true);
  readonly imprimirChange = output<boolean>();
  readonly cancelar = output<void>();
  readonly confirmar = output<void>();
}
