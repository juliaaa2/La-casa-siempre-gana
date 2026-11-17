import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JugadasService } from '../../servicios/jugadas.service';
import { JugadorService } from '../../servicios/jugador.service';
import { GraficaComponent } from '../../compartido/grafica.component';
import { PanelTeoriaComponent } from '../../compartido/panel-teoria.component';
import { NumPipe, PctPipe, PesosPipe } from '../../compartido/formato.pipes';
import { COLOR, graficaBarras } from '../../compartido/graficas';
import {
  ApuestaCartas,
  Baraja,
  Carta,
  VALORES,
  bayesBajaDadoGanaMayor,
  corazonesEnMano,
  esRoja,
  ganaCartas,
  nombreCarta,
  nombreValor,
  pagoCartas,
  probabilidadesCondicionales,
  resolverCartas,
  valorEsperadoCartas,
} from '../../core/juegos/cartas';
import { media } from '../../core/estadistica/estadistica';

interface UltimaJugada {
  anterior: Carta;
  siguiente: Carta;
  eleccion: ApuestaCartas;
  probabilidad: number;
  ganancia: number;
  gano: boolean;
}

@Component({
  selector: 'app-cartas',
  standalone: true,
  imports: [FormsModule, GraficaComponent, PanelTeoriaComponent, NumPipe, PctPipe, PesosPipe],
  templateUrl: './cartas.component.html',
  styles: [
    `
      .cartas-mesa { display: flex; justify-content: center; align-items: center; gap: 18px; flex-wrap: wrap; }
      .carta {
        width: 96px;
        height: 136px;
        background: #fff;
        border-radius: 10px;
        border: 2px solid #cfd8dc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 2.2rem;
        font-weight: 800;
        color: #212121;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      }
      .carta.roja { color: #c62828; }
      .carta.reverso { background: repeating-linear-gradient(45deg, #1565c0, #1565c0 8px, #0d47a1 8px, #0d47a1 16px); }
      .flecha { font-size: 2rem; color: var(--dorado); }
      .apuestas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
      .apuesta-caja { background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 12px; }
    `,
  ],
})
export class CartasComponent {
  private readonly registro = inject(JugadasService);
  readonly jugador = inject(JugadorService);

  private readonly baraja = new Baraja();
  readonly actual = signal<Carta>(this.baraja.robar());
  readonly restantes = signal<readonly Carta[]>([...this.baraja.restantes]);
  readonly ultimo = signal<UltimaJugada | null>(null);
  readonly mensaje = signal('');
  monto = 1000;

  readonly nombreCarta = nombreCarta;
  readonly esRoja = esRoja;

  /** P(mayor), P(menor) y P(igual) dada la carta actual y las cartas que quedan. */
  readonly probs = computed(() => probabilidadesCondicionales(this.actual(), this.restantes()));
  readonly pagoMayor = computed(() => pagoCartas(this.probs().mayor));
  readonly pagoMenor = computed(() => pagoCartas(this.probs().menor));
  readonly evMayor = computed(() => valorEsperadoCartas(this.probs().mayor, 1000));
  readonly evMenor = computed(() => valorEsperadoCartas(this.probs().menor, 1000));

  /** Mis jugadas de cartas, para el panel Teoría vs. Realidad. */
  readonly misCartas = computed(() =>
    this.registro.misJugadas().filter((j) => j.juego === 'cartas' && j.probabilidad !== undefined && j.monto > 0),
  );
  readonly panel = computed(() => {
    const l = this.misCartas();
    if (!l.length) {
      const p = Math.max(this.probs().mayor, this.probs().menor);
      return { n: 0, probabilidad: p, frecuencia: 0, ev: valorEsperadoCartas(p, 1000), real: 0 };
    }
    const ps = l.map((j) => j.probabilidad as number);
    return {
      n: l.length,
      probabilidad: media(ps),
      frecuencia: l.filter((j) => j.gano).length / l.length,
      ev: media(ps.map((p) => valorEsperadoCartas(p, 1000))),
      real: media(l.map((j) => (j.ganancia / j.monto) * 1000)),
    };
  });

  /** Hipergeométrica (sin reposición) vs. binomial (con reposición): corazones en las próximas 5 cartas. */
  readonly mano = computed(() => {
    const r = this.restantes();
    const filas = corazonesEnMano(r, 5);
    const corazones = r.filter((c) => c.palo === '♥').length;
    return {
      N: r.length,
      K: corazones,
      filas,
      grafica: graficaBarras(
        filas.map((f) => String(f.k)),
        [
          { nombre: 'Hipergeométrica (sin reposición)', valores: filas.map((f) => f.hiper), color: COLOR.verde },
          { nombre: 'Binomial (con reposición)', valores: filas.map((f) => f.binom), color: COLOR.gris },
        ],
        'k = número de corazones en 5 cartas',
        'Probabilidad',
      ),
    };
  });

  /** Composición de la baraja que queda, por valor. */
  readonly graficaComposicion = computed(() => {
    const r = this.restantes();
    return graficaBarras(
      VALORES.map(nombreValor),
      [{ nombre: 'Cartas que quedan de cada valor', valores: VALORES.map((v) => r.filter((c) => c.valor === v).length), color: COLOR.azul }],
      'Valor',
      'Cantidad',
    );
  });

  readonly bayes = bayesBajaDadoGanaMayor();

  apostar(eleccion: ApuestaCartas): void {
    this.mensaje.set('');
    const monto = Number(this.monto);
    if (!(monto > 0)) {
      this.mensaje.set('Escribe un monto mayor que cero.');
      return;
    }
    if (monto > this.jugador.saldo()) {
      this.mensaje.set('No tienes saldo suficiente. Puedes reiniciarlo en la página de inicio.');
      return;
    }
    if (this.baraja.cantidad === 0) {
      this.mensaje.set('Se acabó la baraja. Empieza una nueva.');
      return;
    }
    const p = eleccion === 'mayor' ? this.probs().mayor : this.probs().menor;
    if (p === 0) {
      this.mensaje.set(`Con la baraja que queda es imposible que la siguiente carta sea ${eleccion}. Elige la otra opción.`);
      return;
    }
    const anterior = this.actual();
    const siguiente = this.baraja.robar();
    const gano = ganaCartas(eleccion, anterior, siguiente);
    const ganancia = Math.round(resolverCartas(eleccion, monto, anterior, siguiente, p) * 100) / 100;
    this.registro.registrar({
      juego: 'cartas',
      apuesta: eleccion,
      monto,
      resultado: `${nombreCarta(anterior)} → ${nombreCarta(siguiente)}`,
      gano,
      ganancia,
      probabilidad: p,
    });
    this.ultimo.set({ anterior, siguiente, eleccion, probabilidad: p, ganancia, gano });
    this.actual.set(siguiente);
    this.restantes.set([...this.baraja.restantes]);
    if (this.baraja.cantidad === 0) this.mensaje.set('Esa era la última carta. Empieza una nueva baraja.');
  }

  nuevaBaraja(): void {
    this.baraja.reiniciar();
    this.actual.set(this.baraja.robar());
    this.restantes.set([...this.baraja.restantes]);
    this.ultimo.set(null);
    this.mensaje.set('');
  }
}
