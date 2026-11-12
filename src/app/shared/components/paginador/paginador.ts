import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.html',
  styleUrl: './paginador.css',
})
export class Paginador {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly totalElementos = input.required<number>();
  readonly tamanio = input.required<number>();
  readonly tamanios = input<readonly number[]>([10, 20, 50, 100]);
  readonly deshabilitado = input(false);

  readonly cambioPagina = output<number>();
  readonly cambioTamanio = output<number>();

  protected readonly ultimaPagina = computed(() => this.totalPaginas() - 1);
  protected readonly anterior = computed(() => Math.min(this.pagina() - 1, this.ultimaPagina()));
  protected readonly desde = computed(() => {
    const inicio = this.pagina() * this.tamanio();
    return inicio < this.totalElementos() ? inicio + 1 : 0;
  });
  protected readonly hasta = computed(() =>
    this.desde() ? Math.min((this.pagina() + 1) * this.tamanio(), this.totalElementos()) : 0);

  protected ir(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas() && pagina !== this.pagina()) {
      this.cambioPagina.emit(pagina);
    }
  }
}
