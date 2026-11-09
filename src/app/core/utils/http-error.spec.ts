import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { mensajeError } from './http-error';

describe('mensajeError', () => {
  it('muestra el identificador del cuerpo para soporte', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 409,
      error: { message: 'Stock insuficiente.', requestId: 'a1b2c3d4' } })))
      .toBe('Stock insuficiente. Código de seguimiento: a1b2c3d4');
  });
  it('usa la cabecera cuando el cuerpo no tiene identificador', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 403, error: { message: 'Sin permiso.' },
      headers: new HttpHeaders({ 'X-Request-Id': '1234abcd' }) })))
      .toContain('Código de seguimiento: 1234abcd');
  });
  it('conserva los errores de conexión y los errores sin identificador', () => {
    expect(mensajeError(new HttpErrorResponse({ status: 0 }))).toContain('No se pudo conectar');
    expect(mensajeError(new HttpErrorResponse({ status: 404, error: { message: 'No existe.' } })))
      .toBe('No existe.');
  });
});
