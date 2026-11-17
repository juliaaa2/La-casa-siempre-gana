import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JugadasService } from '../../servicios/jugadas.service';
import { JugadorService } from '../../servicios/jugador.service';
import { GraficaComponent } from '../../compartido/grafica.component';
import { PanelTeoriaComponent } from '../../compartido/panel-teoria.component';
import { NumPipe, PctPipe, PesosPipe, ValorPPipe } from '../../compartido/formato.pipes';
import { COLOR, graficaBarras } from '../../compartido/graficas';
import {
  APUESTAS_DADOS,
  CARAS,
  DADO_CARGADO,
  DADO_JUSTO,
  apuestaDados,
  distribucionSuma,
  lanzarDado,
  lanzarDadoCargado,
  momentosTeoricos,
  resolverDados,
} from '../../core/juegos/dados';
import { aleatorio } from '../../core/juegos/azar';
import {
  chiCuadradoBondadAjuste,
  correlacion,
  covarianza,
  media,
  suma,
  tablaBidimensional,
  varianza,
} from '../../core/estadistica/estadistica';
import { valorEsperado, varianzaGanancia } from '../../core/modelos';

const CARAS_DIBUJO = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const CARAS_NUM: number[] = [1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-dados',
  standalone: true,
  imports: [FormsModule, GraficaComponent, PanelTeoriaComponent, NumPipe, PctPipe, PesosPipe, ValorPPipe],
  templateUrl: './dados.component.html',
  styles: [
    `
      .dado { font-size: 4.5rem; line-height: 1; margin: 0 6px; }
      .calor td { min-width: 52px; }
      .marginal { background: #fff8e1; font-weight: 600; }
    `,
  ],
})
export class DadosComponent {
  private readonly registro = inject(JugadasService);
  readonly jugador = inject(JugadorService);

  readonly apuestas = APUESTAS_DADOS;
  readonly caras = CARAS_NUM;
  readonly teoricos = momentosTeoricos();
  readonly sumaTeorica = distribucionSuma();
  readonly unoSobre36 = 1 / 36;

  readonly pestana = signal<'jugar' | 'detective'>('jugar');

  /* ---------------- Jugar ---------------- */
  readonly apuestaId = signal('mayor7');
  monto = 1000;
  readonly ultimo = signal<{ d1: number; d2: number; ganancia: number } | null>(null);
  readonly mensaje = signal('');

  readonly apuesta = computed(() => apuestaDados(this.apuestaId()));

  /** Todos mis lanzamientos de dados (pares (X₁, X₂)). */
  readonly lanzamientos = computed(() =>
    this.registro
      .misJugadas()
      .filter((j) => j.juego === 'dados' && j.dado1 !== undefined && j.dado2 !== undefined)
      .map((j) => ({ d1: j.dado1 as number, d2: j.dado2 as number, apuesta: j.apuesta, ganancia: j.ganancia, monto: j.monto })),
  );

  /** Frecuencia relativa del evento de la apuesta elegida en TODOS mis lanzamientos. */
  readonly frecuenciaEvento = computed(() => {
    const l = this.lanzamientos();
    if (!l.length) return 0;
    const a = this.apuesta();
    return l.filter((x) => a.gana(x.d1, x.d2)).length / l.length;
  });

  /** Ganancia promedio real por cada $1.000 en las jugadas hechas con esta apuesta. */
  readonly gananciaPor1000 = computed(() => {
    const l = this.lanzamientos().filter((x) => x.apuesta === this.apuestaId() && x.monto > 0);
    return l.length ? media(l.map((x) => (x.ganancia / x.monto) * 1000)) : 0;
  });

  readonly valorEsperado1000 = computed(() => valorEsperado(this.apuesta(), 1000));
  readonly desviacion1000 = computed(() => Math.sqrt(varianzaGanancia(this.apuesta(), 1000)));

  /** Tabla bidimensional observada dado 1 × dado 2. */
  readonly tabla = computed(() =>
    tablaBidimensional(
      this.lanzamientos().map((x) => ({ fila: x.d1, columna: x.d2 })),
      CARAS_NUM,
      CARAS_NUM,
    ),
  );

  readonly maxConjunta = computed(() => Math.max(1 / 36, ...this.tabla().conjunta.flat()));

  /** Momentos observados de X₁, X₂ y S = X₁ + X₂. */
  readonly momentos = computed(() => {
    const l = this.lanzamientos();
    const x1 = l.map((x) => x.d1);
    const x2 = l.map((x) => x.d2);
    const s = l.map((x) => x.d1 + x.d2);
    return {
      n: l.length,
      mediaS: media(s),
      varS: varianza(s),
      covX1X2: covarianza(x1, x2),
      covX1S: covarianza(x1, s),
      corrX1S: correlacion(x1, s),
    };
  });

  /** Distribución condicional de X₂ dado X₁ = k. */
  readonly condicionX1 = signal(6);
  readonly condicional = computed(() => {
    const k = this.condicionX1();
    const fila = this.tabla().condicionalDadaFila[k - 1];
    const l = this.lanzamientos().filter((x) => x.d1 === k);
    const mayor9 = l.length ? l.filter((x) => x.d1 + x.d2 > 9).length / l.length : 0;
    const mayor9Teorica = CARAS.filter((j) => k + j > 9).length / 6;
    return { fila, n: l.length, mayor9, mayor9Teorica };
  });

  readonly graficaSuma = computed(() => {
    const l = this.lanzamientos();
    const observada = this.sumaTeorica.map((t) => (l.length ? l.filter((x) => x.d1 + x.d2 === t.s).length / l.length : 0));
    return graficaBarras(
      this.sumaTeorica.map((t) => String(t.s)),
      [
        { nombre: 'Teórica', valores: this.sumaTeorica.map((t) => t.p), color: COLOR.gris },
        { nombre: `Observada (${l.length} lanzamientos)`, valores: observada, color: COLOR.verde },
      ],
      'Suma S = X₁ + X₂',
      'Probabilidad / frecuencia relativa',
    );
  });

  dibujo(cara: number): string {
    return CARAS_DIBUJO[cara - 1];
  }

  /** Intensidad del color de una celda del mapa de calor. */
  colorCelda(valor: number): string {
    const intensidad = Math.min(1, valor / this.maxConjunta());
    return `rgba(46, 125, 50, ${(0.08 + 0.75 * intensidad).toFixed(2)})`;
  }

  lanzar(): void {
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
    const d1 = lanzarDado();
    const d2 = lanzarDado();
    const ganancia = resolverDados(this.apuestaId(), monto, d1, d2);
    this.registro.registrar({
      juego: 'dados',
      apuesta: this.apuestaId(),
      monto,
      resultado: `${d1} + ${d2} = ${d1 + d2}`,
      gano: ganancia > 0,
      ganancia,
      dado1: d1,
      dado2: d2,
    });
    this.ultimo.set({ d1, d2, ganancia });
  }

  /* ---------------- Modo detective ---------------- */
  readonly dadoProbabilidades = DADO_CARGADO;
  private readonly cargado = signal(aleatorio() < 0.5);
  readonly conteos = signal<number[]>([0, 0, 0, 0, 0, 0]);
  readonly revelado = signal(false);
  readonly totalDetective = computed(() => suma(this.conteos()));
  readonly prueba = computed(() => chiCuadradoBondadAjuste(this.conteos(), DADO_JUSTO, 0.05));
  readonly esCargado = computed(() => this.cargado());

  readonly graficaDetective = computed(() =>
    graficaBarras(
      CARAS.map(String),
      [
        { nombre: 'Esperado si es justo (n/6)', valores: this.prueba().esperados, color: COLOR.gris },
        { nombre: 'Observado', valores: this.conteos(), color: COLOR.dorado },
      ],
      'Cara',
      'Número de veces',
    ),
  );

  lanzarDetective(veces: number): void {
    const c = [...this.conteos()];
    for (let i = 0; i < veces; i++) {
      const v = this.cargado() ? lanzarDadoCargado(DADO_CARGADO) : lanzarDado();
      c[v - 1]++;
    }
    this.conteos.set(c);
  }

  revelar(): void {
    this.revelado.set(true);
  }

  nuevoDado(): void {
    this.cargado.set(aleatorio() < 0.5);
    this.conteos.set([0, 0, 0, 0, 0, 0]);
    this.revelado.set(false);
  }

  readonly justo = DADO_JUSTO;
}
