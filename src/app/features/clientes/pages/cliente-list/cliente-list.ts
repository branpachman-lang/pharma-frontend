import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { mensajeError } from '../../../../core/utils/http-error';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente-service';

@Component({
  selector: 'app-cliente-list',
  imports: [RouterLink],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly servicio = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);
  private solicitud?: Subscription;

  protected readonly respuesta = signal<PaginaResponse<Cliente> | null>(null);
  protected readonly pagina = signal(0);
  protected readonly tamanio = signal(10);
  protected readonly ordenarPor = signal<'id' | 'dni' | 'apellidos'>('id');
  protected readonly direccion = signal<'asc' | 'desc'>('asc');
  protected readonly filtro = signal('');
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtrados = computed(() => {
    const texto = this.filtro().trim().toLocaleLowerCase();
    return (this.respuesta()?.contenido ?? []).filter((cliente) => {
      const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.toLocaleLowerCase();
      const apellidoPrimero = `${cliente.apellidos} ${cliente.nombres}`.toLocaleLowerCase();
      return cliente.dni.includes(texto) || nombreCompleto.includes(texto) || apellidoPrimero.includes(texto);
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.solicitud?.unsubscribe());
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.solicitud?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.solicitud = this.servicio
      .listar(this.pagina(), this.tamanio(), this.ordenarPor(), this.direccion())
      .subscribe({
        next: (datos) => {
          this.respuesta.set(datos);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(mensajeError(err));
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

  ordenar(campo: 'dni' | 'apellidos'): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update((actual) => (actual === 'asc' ? 'desc' : 'asc'));
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set('asc');
    }
    this.pagina.set(0);
    this.cargar();
  }

  cambiarPagina(desplazamiento: number): void {
    const destino = this.pagina() + desplazamiento;
    const total = this.respuesta()?.totalPaginas ?? 0;
    if (destino < 0 || destino >= total) return;
    this.pagina.set(destino);
    this.cargar();
  }

  eliminar(cliente: Cliente): void {
    if (!confirm(`¿Dar de baja a ${cliente.nombres} ${cliente.apellidos}?`)) return;
    this.error.set(null);
    this.servicio.eliminar(cliente.id).subscribe({
      next: () => this.cargar(),
      error: (err: HttpErrorResponse) => this.error.set(mensajeError(err)),
    });
  }
}
