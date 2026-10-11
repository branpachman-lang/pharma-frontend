export type EstadoVenta = 'REGISTRADA' | 'ANULADA';
export type OrdenVenta = 'id' | 'fecha' | 'total' | 'estado';
export type DireccionVenta = 'asc' | 'desc';

export interface DetalleVenta {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string;
  clienteId: number;
  clienteNombre: string;
  estado: EstadoVenta;
  total: number;
  detalles: DetalleVenta[];
}

/** El servidor consulta precios vigentes, calcula importes y descuenta stock. */
export interface VentaRequest {
  clienteId: number;
  detalles: { productoId: number; cantidad: number }[];
}

export interface FiltroVentas {
  clienteId: number | null;
  estado: EstadoVenta | null;
  desde: string | null;
  hasta: string | null;
}
