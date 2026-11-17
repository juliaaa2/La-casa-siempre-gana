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

@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [FormsModule, GraficaComponent, PanelTeoriaComponent, NumPipe, PctPipe, PesosPipe, ValorPPipe],
  templateUrl: './ruleta.component.html',
  styles: [
    `
      .bola {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.6rem;
        font-weight: 800;
        color: #fff;
        margin: 10px auto;
        border: 4px solid var(--dorado);
      }
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
    const ganancia = resolverRuleta(this.apuestaId(), monto, n, elegido);
    this.registro.registrar({
      juego: 'ruleta',
      apuesta: this.apuestaId(),
      monto,
      resultado: `${n} ${colorDe(n)}` + (this.apuestaId() === 'numero' ? ` (apostó al ${elegido})` : ''),
      gano: ganancia > 0,
      ganancia,
      numero: n,
    });
    this.ultimo.set({ n, color: colorDe(n), ganancia });
  }
}
