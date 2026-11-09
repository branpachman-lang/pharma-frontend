import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse } from '../models/error-response';

export function mensajeError(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'No se pudo conectar con PharmaBackend. Comprueba que esté iniciado y revisa CORS.';
  }

  const respuesta = err.error as Partial<ErrorResponse> | null;
  const mensaje = respuesta?.message || `Error ${err.status}: ${err.statusText}`;
  const requestId = respuesta?.requestId || err.headers.get('X-Request-Id');
  return requestId ? `${mensaje} Código de seguimiento: ${requestId}` : mensaje;
}

export function erroresDeValidacion(err: HttpErrorResponse): Record<string, string> {
  const respuesta = err.error as Partial<ErrorResponse> | null;
  return respuesta?.validationErrors ?? {};
}
