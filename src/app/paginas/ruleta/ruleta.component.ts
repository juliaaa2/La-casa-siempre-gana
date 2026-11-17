import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JugadasService } from '../../servicios/jugadas.service';
import { JugadorService } from '../../servicios/jugador.service';
import { GraficaComponent } from '../../compartido/grafica.component';
import { PanelTeoriaComponent } from '../../compartido/panel-teoria.component';
import { NumPipe, PctPipe, PesosPipe, ValorPPipe } from '../../compartido/formato.pipes';
import { COLOR, SerieXY, graficaBarras, graficaLineas, puntosRecta } from '../../compartido/graficas';
import { APUESTAS_RULETA, ColorRuleta, apuestaRuleta, colorDe, ganaRuleta, girarRuleta, resolverRuleta } from '../../core/juegos/ruleta';
import { binomialCdf, binomialPmf } from '../../core/estadistica/distribuciones';
import { media, regresionLineal } from '../../core/estadistica/estadistica';
import { ordenarPorFecha } from '../../core/estadistica/analisis';
import { valorEsperado, varianzaGanancia } from '../../core/modelos';
import { aleatorio } from '../../core/juegos/azar';

/** Orden real de los números en una ruleta europea, en el sentido de las agujas del reloj desde el 0. */
const ORDEN_RUEDA = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const PASO = 360 / 37;
const COLOR_SVG: Record<ColorRuleta, string> = { rojo: '#c62828', negro: '#1c1c1c', verde: '#2e7d32' };
const RADIO_PISTA = 136;
const RADIO_CASILLA = 101;
const DURACION_GIRO = 5200;

function punto(r: number, grados: number): string {
  const t = (grados * Math.PI) / 180;
  return `${(r * Math.sin(t)).toFixed(2)} ${(-r * Math.cos(t)).toFixed(2)}`;
}

/** Sectores de la rueda dibujados en SVG. */
const SECTORES = ORDEN_RUEDA.map((n, i) => {
  const a0 = (i - 0.5) * PASO;
  const a1 = (i + 0.5) * PASO;
  const ext = 124;
  const int = 92;
  return {
    n,
    angulo: i * PASO,
    color: COLOR_SVG[colorDe(n)],
    d: `M ${punto(int, a0)} L ${punto(ext, a0)} A ${ext} ${ext} 0 0 1 ${punto(ext, a1)} L ${punto(int, a1)} A ${int} ${int} 0 0 0 ${punto(int, a0)} Z`,
  };
});

/** Separadores metálicos entre casillas y rombos decorativos de la pista. */
const RAYOS = Array.from({ length: 8 }, (_, i) => i * 45);

@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [FormsModule, GraficaComponent, PanelTeoriaComponent, NumPipe, PctPipe, PesosPipe, ValorPPipe],
  templateUrl: './ruleta.component.html',
  styles: [
    `
      .rueda-caja { position: relative; width: 100%; max-width: 330px; margin: 6px auto 0; }
      .rueda-caja svg { width: 100%; height: auto; display: block; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45)); }
      .giro { transition: transform 5s cubic-bezier(0.12, 0.6, 0.22, 1); }
      .giro-bola { transition: transform 5s cubic-bezier(0.08, 0.55, 0.2, 1); }
      .caida { transition: transform 1.4s cubic-bezier(0.55, 0, 0.75, 1) 3.1s; }
      .sin-trans, .sin-trans * { transition: none !important; }
      .num-casilla { fill: #fff; font-size: 9px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; }
      .casilla-svg { stroke: #c9a227; stroke-width: 0.6; }
      .casilla-svg.ganadora { stroke: #fff; stroke-width: 2.2; }
      .bola {
        width: 92px;
        height: 92px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.3rem;
        font-weight: 800;
        color: #fff;
        margin: 10px auto;
        border: 4px solid var(--dorado);
        animation: aparecer 0.45s ease-out;
      }
      @keyframes aparecer { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .estado { text-align: center; font-weight: 700; color: var(--dorado); min-height: 1.4em; margin-top: 6px; }
      .tablero { display: grid; grid-template-columns: repeat(13, 1fr); gap: 3px; margin-top: 12px; }
      .casilla { color: #fff; text-align: center; font-size: 0.75rem; font-weight: 700; padding: 5px 0; border-radius: 4px; opacity: 0.85; }
      .casilla.marcada { outline: 3px solid var(--dorado); opacity: 1; }
      .rojo { background: #c62828; }
      .negro { background: #212121; }
      .verde { background: #2e7d32; }
    `,
  ],
})
export class RuletaComponent {
  private readonly registro = inject(JugadasService);
  readonly jugador = inject(JugadorService);

  readonly apuestas = APUESTAS_RULETA;
  readonly numeros = Array.from({ length: 37 }, (_, i) => i);
  readonly apuestaId = signal('rojo');
  readonly numeroElegido = signal(17);
  monto = 1000;
  readonly ultimo = signal<{ n: number; color: ColorRuleta; ganancia: number } | null>(null);
  readonly mensaje = signal('');

  readonly apuesta = computed(() => apuestaRuleta(this.apuestaId()));
  readonly valorEsperado1000 = computed(() => valorEsperado(this.apuesta(), 1000));
  readonly desviacion1000 = computed(() => Math.sqrt(varianzaGanancia(this.apuesta(), 1000)));

  /** Mis jugadas de ruleta en orden. */
  readonly giros = computed(() =>
    ordenarPorFecha(this.registro.misJugadas().filter((j) => j.juego === 'ruleta' && j.numero !== undefined)),
  );

  /** Frecuencia relativa del evento elegido en todos mis giros. */
  readonly frecuenciaEvento = computed(() => {
    const g = this.giros();
    if (!g.length) return 0;
    return g.filter((j) => ganaRuleta(this.apuestaId(), j.numero as number, this.numeroElegido())).length / g.length;
  });

  readonly gananciaPor1000 = computed(() => {
    const g = this.giros().filter((j) => j.apuesta === this.apuestaId() && j.monto > 0);
    return g.length ? media(g.map((j) => (j.ganancia / j.monto) * 1000)) : 0;
  });

  /** Regresión de la ganancia acumulada contra el número de jugada. */
  readonly analisisSaldo = computed(() => {
    const g = this.giros();
    const x: number[] = [];
    const y: number[] = [];
    const esperada: { x: number; y: number }[] = [];
    let acumulada = 0;
    let acumuladaEsperada = 0;
    g.forEach((j, i) => {
      acumulada += j.ganancia;
      acumuladaEsperada += -j.monto / 37;
      x.push(i + 1);
      y.push(acumulada);
      esperada.push({ x: i + 1, y: acumuladaEsperada });
    });
    const reg = g.length >= 3 ? regresionLineal(x, y) : null;
    const evPromedio = g.length ? media(g.map((j) => -j.monto / 37)) : 0;
    const series: SerieXY[] = [
      { nombre: 'Ganancia acumulada real', puntos: x.map((xi, i) => ({ x: xi, y: y[i] })), color: COLOR.azul },
      { nombre: 'Esperada según la teoría (−monto/37 por jugada)', puntos: esperada, color: COLOR.gris, punteada: true },
    ];
    if (reg) {
      series.push({ nombre: 'Recta de regresión', puntos: puntosRecta(reg.b0, reg.b1, 1, g.length), color: COLOR.rojo, punteada: false });
    }
    return { reg, evPromedio, n: g.length, grafica: graficaLineas(series, 'Número de jugada', 'Ganancia acumulada ($)') };
  });

  /** Ley de los grandes números: frecuencia relativa acumulada del evento elegido. */
  readonly graficaFrecuencia = computed(() => {
    const g = this.giros();
    const p = this.apuesta().probabilidad;
    let exitos = 0;
    const puntos = g.map((j, i) => {
      if (ganaRuleta(this.apuestaId(), j.numero as number, this.numeroElegido())) exitos++;
      return { x: i + 1, y: exitos / (i + 1) };
    });
    return graficaLineas(
      [
        { nombre: 'Frecuencia relativa observada', puntos, color: COLOR.verde },
        { nombre: 'Probabilidad teórica', puntos: [{ x: 1, y: p }, { x: Math.max(2, g.length), y: p }], color: COLOR.rojo, punteada: true },
      ],
      'Número de jugada',
      'Frecuencia relativa',
      { yMin: 0, yMax: 1 },
    );
  });

  /* ---------- Binomial y geométrica ---------- */
  readonly nBinomial = signal(20);
  readonly binomial = computed(() => {
    const n = Math.max(1, Math.min(100, Math.round(this.nBinomial())));
    const p = this.apuesta().probabilidad;
    const ks = Array.from({ length: n + 1 }, (_, k) => k);
    const mitad = Math.ceil(n / 2);
    return {
      n,
      p,
      esperanza: n * p,
      varianza: n * p * (1 - p),
      mitad,
      pMitadOMas: 1 - binomialCdf(mitad - 1, n, p),
      grafica: graficaBarras(
        ks.map(String),
        [{ nombre: `P(X = k), X ~ B(${n}; ${p.toFixed(4)})`, valores: ks.map((k) => binomialPmf(k, n, p)), color: COLOR.azul }],
        'k = número de aciertos',
        'Probabilidad',
      ),
    };
  });

  readonly geometrica = computed(() => {
    const p = this.apuesta().probabilidad;
    return { esperanza: 1 / p, pEn10: 1 - Math.pow(1 - p, 10) };
  });

  colorDe(n: number): ColorRuleta {
    return colorDe(n);
  }

  /* ---------- Animación de la rueda ---------- */
  readonly sectores = SECTORES;
  readonly rayos = RAYOS;
  readonly girando = signal(false);
  readonly sinTransicion = signal(false);
  readonly rotRueda = signal(0);
  readonly rotBola = signal(0);
  readonly radioBola = signal(RADIO_CASILLA);
  readonly ganadora = signal<number | null>(null);

  girar(): void {
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
    const elegido = Math.round(Number(this.numeroElegido()));
    if (this.apuestaId() === 'numero' && !(elegido >= 0 && elegido <= 36)) {
      this.mensaje.set('Elige un número entre 0 y 36.');
      return;
    }
    const n = girarRuleta();
    const apuestaId = this.apuestaId();
    const ganancia = resolverRuleta(apuestaId, monto, n, elegido);
    this.girando.set(true);
    this.ganadora.set(null);
    this.ultimo.set(null);

    // La bola vuelve a la pista exterior sin animación...
    this.sinTransicion.set(true);
    this.radioBola.set(RADIO_PISTA);
    setTimeout(() => {
      // ...y luego la rueda gira a la derecha, la bola a la izquierda y cae en la casilla que salió.
      this.sinTransicion.set(false);
      const rueda = this.rotRueda() + 720 + aleatorio() * 360;
      const destino = ORDEN_RUEDA.indexOf(n) * PASO + rueda;
      const base = this.rotBola() - 360 * 5;
      const bola = base - (((base - destino) % 360) + 360) % 360;
      this.rotRueda.set(rueda);
      this.rotBola.set(bola);
      this.radioBola.set(RADIO_CASILLA);
    }, 40);

    setTimeout(() => {
      this.registro.registrar({
        juego: 'ruleta',
        apuesta: apuestaId,
        monto,
        resultado: `${n} ${colorDe(n)}` + (apuestaId === 'numero' ? ` (apostó al ${elegido})` : ''),
        gano: ganancia > 0,
        ganancia,
        numero: n,
      });
      this.ganadora.set(n);
      this.ultimo.set({ n, color: colorDe(n), ganancia });
      this.girando.set(false);
    }, DURACION_GIRO + 40);
  }
}
