import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <section>
      <h2>Bienvenido a PharmaSoft</h2>
      <p>Selecciona un módulo del menú para comenzar.</p>
      <a routerLink="/categorias">Ir a Categorías</a>
    </section>
  `,
})
export class Inicio {}
