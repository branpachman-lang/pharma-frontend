import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { erroresDeValidacion, mensajeError } from '../../../../core/utils/http-error';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { ProductoRequest } from '../../models/producto.model';
import { ProductoService } from '../../services/producto-service';

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
})
export class ProductoForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input<string>();
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly categoriaOriginal = signal<number | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly erroresServidor = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(200)]],
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    stock: this.fb.control<number | null>(0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]),
    estado: [true],
    categoriaId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  protected readonly opciones = computed(() =>
    this.categorias().filter(categoria => categoria.estado || categoria.id === this.categoriaOriginal()));
  protected readonly hayCategoriasActivas = computed(() => this.categorias().some(categoria => categoria.estado));
  private readonly categoriaElegida = toSignal(this.form.controls.categoriaId.valueChanges,
    { initialValue: this.form.controls.categoriaId.value });
  protected readonly categoriaInactiva = computed(() => {
    const elegida = this.categorias().find(categoria => categoria.id === this.categoriaElegida());
    return !!elegida && !elegida.estado;
  });

  protected esEdicion(): boolean { return this.id() !== undefined; }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      forkJoin({
        categorias: this.categoriaService.listarTodas(),
        producto: this.productoService.obtener(Number(id)),
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ categorias, producto }) => {
          this.categorias.set(categorias);
          this.categoriaOriginal.set(producto.categoriaId);
          this.form.setValue({
            nombre: producto.nombre,
            descripcion: producto.descripcion ?? '',
            precio: producto.precio,
            stock: producto.stock,
            estado: producto.estado,
            categoriaId: producto.categoriaId,
          });
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => this.fallarCarga(err),
      });
    } else {
      this.categoriaService.listarTodas().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: categorias => {
          this.categorias.set(categorias);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => this.fallarCarga(err),
      });
    }
  }

  guardar(): void {
    if (this.guardando()) return;
    this.form.controls.nombre.setValue(this.form.controls.nombre.value.trim());
    this.form.controls.descripcion.setValue(this.form.controls.descripcion.value.trim());
    const v = this.form.getRawValue();
    const categoria = this.categorias().find(item => item.id === v.categoriaId);
    if (this.form.invalid || !categoria || !categoria.estado) {
      this.form.markAllAsTouched();
      if (!categoria && v.categoriaId !== null) {
        this.avisos.mostrar('Seleccione una categoría existente y activa.', 'error');
      }
      return;
    }

    const dto: ProductoRequest = {
      nombre: v.nombre,
      descripcion: v.descripcion || null,
      precio: Number(v.precio),
      stock: Number(v.stock),
      estado: v.estado,
      categoriaId: categoria.id,
    };
    const id = this.id();
    const peticion = id
      ? this.productoService.actualizar(Number(id), dto)
      : this.productoService.crear(dto);

    this.error.set(null);
    this.erroresServidor.set({});
    this.guardando.set(true);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.avisos.mostrar(id ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
        void this.router.navigate(['/productos']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.avisos.mostrar(mensajeError(err), 'error');
        this.erroresServidor.set(erroresDeValidacion(err));
      },
    });
  }

  private fallarCarga(err: HttpErrorResponse): void {
    this.error.set(mensajeError(err));
    this.cargando.set(false);
  }
}
