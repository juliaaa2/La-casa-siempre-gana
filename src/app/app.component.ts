import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { JugadorService } from './servicios/jugador.service';
import { PesosPipe } from './compartido/formato.pipes';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PesosPipe],
  template: `
    <header class="barra">
      <a routerLink="/" class="marca">🎲 La casa siempre gana</a>
      <nav>
        <a routerLink="/dados" routerLinkActive="activo">Dados</a>
        <a routerLink="/ruleta" routerLinkActive="activo">Ruleta</a>
        <a routerLink="/estadisticas" routerLinkActive="activo">Estadísticas</a>
      </nav>
      @if (jugador.nombre()) {
        <div class="saldo">
          <span>{{ jugador.nombre() }}</span>
          <strong>{{ jugador.saldo() | pesos }}</strong>
        </div>
      }
    </header>
    <main class="contenedor">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .barra {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 14px 24px;
        padding: 12px 20px;
        background: var(--fondo);
        color: #fff;
      }
      .marca { color: var(--dorado); font-weight: 800; font-size: 1.15rem; text-decoration: none; }
      nav { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; }
      nav a { color: #d9e2ec; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-weight: 600; }
      nav a.activo, nav a:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
      .saldo { display: flex; gap: 10px; align-items: baseline; }
      .saldo strong { color: var(--dorado); font-size: 1.1rem; }
    `,
  ],
})
export class AppComponent {
  readonly jugador = inject(JugadorService);
}
