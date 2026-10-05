import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { erroresDeValidacion, mensajeError } from '../../../../core/utils/http-error';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { ClienteRequest } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente-service';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.css',
})
export class ClienteForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly servicio = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionService);

  readonly id = input<string>();
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly erroresServidor = signal<Record<string, string>>({});
  protected readonly form = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.pattern(/^\d{9}$/)]],
    direccion: ['', [Validators.maxLength(250)]],
    estado: [true],
  });

  protected esEdicion(): boolean {
    return this.id() !== undefined;
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.cargando.set(true);
    this.servicio.obtener(Number(id)).subscribe({
      next: (cliente) => {
        this.form.setValue({
          dni: cliente.dni,
          nombres: cliente.nombres,
          apellidos: cliente.apellidos,
          email: cliente.email,
          telefono: cliente.telefono ?? '',
          direccion: cliente.direccion ?? '',
          estado: cliente.estado,
        });
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  guardar(): void {
    for (const nombre of ['dni', 'nombres', 'apellidos', 'email', 'telefono', 'direccion'] as const) {
      const control = this.form.controls[nombre];
      control.setValue(control.value.trim());
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos: ClienteRequest = {
      dni: v.dni,
      nombres: v.nombres,
      apellidos: v.apellidos,
      email: v.email,
      telefono: v.telefono || null,
      direccion: v.direccion || null,
      estado: v.estado,
    };
    const id = this.id();
    const peticion = id ? this.servicio.actualizar(Number(id), datos) : this.servicio.crear(datos);
    this.error.set(null);
    this.erroresServidor.set({});
    this.guardando.set(true);
    peticion.subscribe({
      next: () => {
        this.avisos.mostrar(id ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.');
        void this.router.navigate(['/clientes']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(mensajeError(err));
        this.erroresServidor.set(erroresDeValidacion(err));
      },
    });
  }
}
