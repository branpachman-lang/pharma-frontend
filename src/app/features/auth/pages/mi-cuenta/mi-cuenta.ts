import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/auth/auth-service';
import { PerfilUsuario, Permiso } from '../../../../core/auth/auth.model';
import { mensajeError } from '../../../../core/utils/http-error';

interface PermisoMostrado {
  clave: Permiso;
  etiqueta: string;
}

@Component({
  selector: 'app-mi-cuenta',
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly perfil = signal<PerfilUsuario | null>(null);
  protected readonly modulos: { nombre: string; permisos: PermisoMostrado[] }[] = [
    { nombre: 'Catálogo', permisos: [
      { clave: 'CATALOGO_LEER', etiqueta: 'Consultar' },
      { clave: 'CATALOGO_ESCRIBIR', etiqueta: 'Crear y modificar' },
    ] },
    { nombre: 'Clientes', permisos: [
      { clave: 'CLIENTES_LEER', etiqueta: 'Consultar' },
      { clave: 'CLIENTES_ESCRIBIR', etiqueta: 'Crear y modificar' },
    ] },
    { nombre: 'Ventas', permisos: [
      { clave: 'VENTAS_LEER', etiqueta: 'Consultar' },
      { clave: 'VENTAS_REGISTRAR', etiqueta: 'Registrar' },
    ] },
    { nombre: 'Reportes', permisos: [
      { clave: 'REPORTES_VER', etiqueta: 'Ver reportes' },
    ] },
    { nombre: 'Usuarios', permisos: [
      { clave: 'USUARIOS_ADMINISTRAR', etiqueta: 'Administrar' },
    ] },
  ];
  protected readonly permisosCambiaron = computed(() => {
    const perfil = this.perfil();
    const sesion = this.auth.sesion();
    if (!perfil || !sesion) return false;
    const actuales = [...new Set(perfil.permisos)].sort().join('|');
    const guardados = [...new Set(sesion.permisos)].sort().join('|');
    return actuales !== guardados;
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected tienePermiso(perfil: PerfilUsuario, permiso: Permiso): boolean {
    return perfil.permisos.includes(permiso);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.auth.obtenerPerfil().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }
}
