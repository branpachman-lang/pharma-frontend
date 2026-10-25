/** Permisos que devuelve PharmaBackend al iniciar sesión. */
export type Permiso =
  | 'CATALOGO_LEER'
  | 'CATALOGO_ESCRIBIR'
  | 'CLIENTES_LEER'
  | 'CLIENTES_ESCRIBIR'
  | 'VENTAS_LEER'
  | 'VENTAS_REGISTRAR'
  | 'REPORTES_VER'
  | 'USUARIOS_ADMINISTRAR';

export interface LoginRequest {
  username: string;
  password: string;
}

/** Contrato de POST /auth/login. */
export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  username: string;
  nombreCompleto: string;
  roles: string[];
  permisos: Permiso[];
}

/** Datos que se mantienen mientras la sesión sigue vigente. */
export interface Sesion {
  token: string;
  expiraEn: number;
  username: string;
  nombreCompleto: string;
  roles: string[];
  permisos: Permiso[];
}

/** Respuesta real de GET /auth/me en PharmaBackend. */
export interface PerfilUsuario {
  id: number;
  username: string;
  empleadoId: number;
  empleadoNombre: string;
  cargo: string;
  roles: string[];
  permisos: Permiso[];
  estado: boolean;
  fechaCreacion: string;
}
