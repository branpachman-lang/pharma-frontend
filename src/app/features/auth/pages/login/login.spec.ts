import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth-service';
import { Login } from './login';

describe('Login', () => {
  const login = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    }).compileComponents();
  });

  it('no envía una petición si faltan usuario y contraseña', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const contenido: HTMLElement = fixture.nativeElement;
    contenido.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(login).not.toHaveBeenCalled();
    expect(contenido.textContent).toContain('Ingrese su usuario.');
    expect(contenido.textContent).toContain('Ingrese su contraseña.');
  });

  it('muestra el 401 genérico y permanece en el formulario', () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 401,
      error: { message: 'Usuario o contraseña incorrectos' },
    })));
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const contenido: HTMLElement = fixture.nativeElement;
    const usuario = contenido.querySelector<HTMLInputElement>('#usuario')!;
    const clave = contenido.querySelector<HTMLInputElement>('#clave')!;
    usuario.value = 'admin';
    usuario.dispatchEvent(new Event('input'));
    clave.value = 'equivocada';
    clave.dispatchEvent(new Event('input'));
    contenido.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(login).toHaveBeenCalledOnce();
    expect(contenido.querySelector('[role="alert"]')?.textContent)
      .toContain('Usuario o contraseña incorrectos');
    expect(contenido.querySelector<HTMLInputElement>('#clave')?.value).toBe('');
  });
});
