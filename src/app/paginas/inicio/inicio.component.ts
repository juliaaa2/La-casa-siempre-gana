import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JugadorService } from '../../servicios/jugador.service';
import { JugadasService } from '../../servicios/jugadas.service';
import { PesosPipe } from '../../compartido/formato.pipes';
import { SALDO_INICIAL } from '../../core/modelos';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [FormsModule, RouterLink, PesosPipe],
  templateUrl: './inicio.component.html',
  styles: [
    `
      .integrantes { text-align: center; margin-top: 2rem; font-size: 0.85rem; opacity: 0.7; }
      .portada { text-align: center; padding: 34px 22px; }
      .portada h1 { font-size: 2.2rem; color: var(--dorado); }
      .portada p { max-width: 700px; margin: 0 auto 12px; }
      .juego { text-decoration: none; color: inherit; display: block; }
      .juego:hover { border-color: var(--dorado); }
      .icono { font-size: 2rem; }
    `,
  ],
})
export class InicioComponent {
  readonly jugador = inject(JugadorService);
  readonly jugadas = inject(JugadasService);
  readonly saldoInicial = SALDO_INICIAL;
  nombre = '';

  entrar(): void {
    this.jugador.entrar(this.nombre);
    this.nombre = '';
  }
}
