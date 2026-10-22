import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('guarda el token, los permisos y el vencimiento devueltos por el login', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const antes = Date.now();

    auth.login({ username: 'vendedor', password: 'clave' }).subscribe();
    const peticion = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({
      token: 'jwt-de-prueba', tipo: 'Bearer', expiraEnSegundos: 3600,
      username: 'vendedor', nombreCompleto: 'Vendedor de prueba',
      roles: ['VENDEDOR'], permisos: ['CATALOGO_LEER', 'VENTAS_LEER'],
    });

    expect(auth.token()).toBe('jwt-de-prueba');
    expect(auth.tienePermiso('VENTAS_LEER')).toBe(true);
    expect(auth.tienePermiso('CATALOGO_ESCRIBIR')).toBe(false);
    const guardada = JSON.parse(sessionStorage.getItem('pharmasoft.sesion')!);
    expect(guardada.expiraEn).toBeGreaterThanOrEqual(antes + 3_600_000);
    expect(guardada.permisos).toEqual(['CATALOGO_LEER', 'VENTAS_LEER']);
  });

  it('descarta una sesión vencida al recuperar el almacenamiento', () => {
    sessionStorage.setItem('pharmasoft.sesion', JSON.stringify({
      token: 'vencido', expiraEn: Date.now() - 1000,
      username: 'vendedor', nombreCompleto: 'Prueba',
      roles: ['VENDEDOR'], permisos: ['VENTAS_LEER'],
    }));
    const auth = TestBed.inject(AuthService);
    expect(auth.autenticado()).toBe(false);
    expect(sessionStorage.getItem('pharmasoft.sesion')).toBeNull();
  });

  it('recupera una sesión vigente tras una recarga', () => {
    sessionStorage.setItem('pharmasoft.sesion', JSON.stringify({
      token: 'vigente', expiraEn: Date.now() + 60_000,
      username: 'almacen', nombreCompleto: 'Almacenero de prueba',
      roles: ['ALMACENERO'], permisos: ['CATALOGO_LEER', 'CATALOGO_ESCRIBIR'],
    }));
    const auth = TestBed.inject(AuthService);
    expect(auth.autenticado()).toBe(true);
    expect(auth.token()).toBe('vigente');
    expect(auth.tienePermiso('CATALOGO_ESCRIBIR')).toBe(true);
  });

  it('descarta datos de sesión dañados aunque no hayan vencido', () => {
    sessionStorage.setItem('pharmasoft.sesion', JSON.stringify({
      token: 42, expiraEn: Date.now() + 60_000,
      username: 'admin', nombreCompleto: 'Prueba', roles: ['ADMIN'], permisos: [],
    }));
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(sessionStorage.getItem('pharmasoft.sesion')).toBeNull();
  });
});
