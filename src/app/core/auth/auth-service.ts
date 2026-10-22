import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Permiso, Sesion } from './auth.model';

const CLAVE_SESION = 'pharmasoft.sesion';

/** Fuente única de la sesión para las vistas, guards e interceptores. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;
  private readonly sesionActual = signal<Sesion | null>(this.leerSesionGuardada());
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly sesion = this.sesionActual.asReadonly();
  readonly autenticado = computed(() => this.sesionActual() !== null);

  constructor() {
    const sesion = this.sesionActual();
    if (sesion) this.programarExpiracion(sesion);
  }

  login(credenciales: LoginRequest): Observable<Sesion> {
    return this.http.post<LoginResponse>(`${this.url}/login`, credenciales).pipe(
      map(respuesta => ({
        token: respuesta.token,
        expiraEn: Date.now() + respuesta.expiraEnSegundos * 1000,
        username: respuesta.username,
        nombreCompleto: respuesta.nombreCompleto,
        roles: respuesta.roles,
        permisos: respuesta.permisos,
      })),
      tap(sesion => this.iniciar(sesion)),
    );
  }

  cerrarSesion(motivo?: 'expirada', volverA?: string): void {
    clearTimeout(this.temporizador);
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesionActual.set(null);

    const queryParams: Record<string, string> = {};
    if (motivo) queryParams['expirada'] = '1';
    if (volverA && volverA !== '/login') queryParams['returnUrl'] = volverA;
    void this.router.navigate(['/login'], { queryParams });
  }

  token(): string | null {
    const sesion = this.sesionActual();
    return sesion && Date.now() < sesion.expiraEn ? sesion.token : null;
  }

  tienePermiso(permiso: Permiso): boolean {
    return this.sesionActual()?.permisos.includes(permiso) ?? false;
  }

  private iniciar(sesion: Sesion): void {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesionActual.set(sesion);
    this.programarExpiracion(sesion);
  }

  private programarExpiracion(sesion: Sesion): void {
    clearTimeout(this.temporizador);
    const restante = sesion.expiraEn - Date.now();
    this.temporizador = setTimeout(
      () => this.cerrarSesion('expirada', this.router.url),
      Math.max(restante, 0),
    );
  }

  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion: Sesion = JSON.parse(texto);
      if (
        typeof sesion.token !== 'string' || !sesion.token ||
        typeof sesion.username !== 'string' || typeof sesion.nombreCompleto !== 'string' ||
        !Number.isFinite(sesion.expiraEn) || Date.now() >= sesion.expiraEn ||
        !Array.isArray(sesion.roles) || !sesion.roles.every(rol => typeof rol === 'string') ||
        !Array.isArray(sesion.permisos) || !sesion.permisos.every(permiso => typeof permiso === 'string')
      ) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }
}
