export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  estado: boolean;
  categoriaId: number;
  categoriaNombre: string;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface ProductoRequest {
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  estado: boolean;
  categoriaId: number;
}

export type OrdenProducto = 'id' | 'nombre' | 'precio' | 'stock';
export type Direccion = 'asc' | 'desc';
