import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GraficaComponent } from '../../compartido/grafica.component';
import { NumPipe, PctPipe, PesosPipe, ValorPPipe } from '../../compartido/formato.pipes';
import { COLOR, graficaLineas, puntosRecta } from '../../compartido/graficas';
import { APUESTAS_DADOS } from '../../core/juegos/dados';
import { APUESTAS_RULETA } from '../../core/juegos/ruleta';
import { ResultadoSimulacion, simular } from '../../core/juegos/simulacion';
import { Juego, NOMBRE_JUEGO } from '../../core/modelos';

interface OpcionSimple {
  id: string;
  nombre: string;
}

const OPCIONES: Record<Juego, OpcionSimple[]> = {
  dados: APUESTAS_DADOS.map((a) => ({ id: a.id, nombre: a.nombre })),
  ruleta: APUESTAS_RULETA.map((a) => ({ id: a.id, nombre: a.nombre })),
  cartas: [{ id: 'optima', nombre: 'Estrategia óptima (elige siempre la opción más probable)' }],
};

@Component({
  selector: 'app-simulacion',
  standalone: true,
  imports: [FormsModule, GraficaComponent, NumPipe, PctPipe, PesosPipe, ValorPPipe],
  templateUrl: './simulacion.component.html',
})
export class SimulacionComponent {
  readonly juegos: Juego[] = ['dados', 'ruleta', 'cartas'];
  readonly nombreJuego = NOMBRE_JUEGO;
  readonly cantidades = [1000, 10000, 100000];

  readonly juego = signal<Juego>('ruleta');
  readonly apuesta = signal('rojo');
  readonly opciones = computed(() => OPCIONES[this.juego()]);
  numeroElegido = 17;
  monto = 1000;
  n = 10000;

  readonly resultado = signal<ResultadoSimulacion | null>(null);
  readonly descripcion = signal('');

  cambiarJuego(j: Juego): void {
    this.juego.set(j);
    this.apuesta.set(OPCIONES[j][0].id);
    this.resultado.set(null);
  }

  ejecutar(): void {
    const monto = Number(this.monto) > 0 ? Number(this.monto) : 1000;
    const n = Number(this.n);
    const elegido = Math.min(36, Math.max(0, Math.round(Number(this.numeroElegido) || 0)));
    const r = simular({ juego: this.juego(), apuesta: this.apuesta(), monto, n, numeroElegido: elegido });
    const nombreApuesta = this.opciones().find((o) => o.id === this.apuesta())?.nombre ?? this.apuesta();
    this.descripcion.set(
      `${NOMBRE_JUEGO[this.juego()]}, apuesta «${nombreApuesta}»${this.juego() === 'ruleta' && this.apuesta() === 'numero' ? ' al ' + elegido : ''}, ` +
        `${n.toLocaleString('es-CO')} jugadas de $${monto.toLocaleString('es-CO')}`,
    );
    this.resultado.set(r);
  }

  readonly graficaFrecuencia = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    return graficaLineas(
      [
        { nombre: 'Frecuencia relativa de victorias', puntos: r.curvaFrecuencia, color: COLOR.verde },
        { nombre: 'Probabilidad teórica', puntos: [{ x: 1, y: r.probabilidadTeorica }, { x: r.n, y: r.probabilidadTeorica }], color: COLOR.rojo, punteada: true },
      ],
      'Número de jugada',
      'Frecuencia relativa',
      { yMin: 0, yMax: 1 },
    );
  });

  readonly graficaGanancia = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    return graficaLineas(
      [
        { nombre: 'Ganancia acumulada simulada', puntos: r.curvaGanancia, color: COLOR.azul },
        { nombre: 'Recta de regresión', puntos: puntosRecta(r.regresion.b0, r.regresion.b1, 1, r.n), color: COLOR.rojo },
        { nombre: 'Teoría: E(G) · jugadas', puntos: [{ x: 1, y: r.valorEsperadoTeorico }, { x: r.n, y: r.valorEsperadoTeorico * r.n }], color: COLOR.gris, punteada: true },
      ],
      'Número de jugada',
      'Ganancia acumulada ($)',
    );
  });
}
