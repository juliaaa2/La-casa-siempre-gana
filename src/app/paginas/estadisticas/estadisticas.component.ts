import { Component, computed, inject, signal } from '@angular/core';
import { JugadasService } from '../../servicios/jugadas.service';
import { JugadorService } from '../../servicios/jugador.service';
import { GraficaComponent } from '../../compartido/grafica.component';
import { NumPipe, PctPipe, PesosPipe, ValorPPipe } from '../../compartido/formato.pipes';
import { COLOR, graficaDispersion, graficaLineas, puntosRecta } from '../../compartido/graficas';
import {
  MEDIA_TEORICA_RULETA,
  correlacionApuestaPerdida,
  pruebaTRuleta,
  resumenJugador,
  tablaDadosReal,
  tablaJuegoResultado,
} from '../../core/estadistica/analisis';
import { chiCuadradoIndependencia, regresionLineal } from '../../core/estadistica/estadistica';
import { Jugada } from '../../core/modelos';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [GraficaComponent, NumPipe, PctPipe, PesosPipe, ValorPPipe],
  templateUrl: './estadisticas.component.html',
})
export class EstadisticasComponent {
  readonly registro = inject(JugadasService);
  readonly jugador = inject(JugadorService);
  readonly mediaTeoricaRuleta = MEDIA_TEORICA_RULETA;
  readonly confirmarBorrado = signal(false);

  /* ---------------- Mis estadísticas ---------------- */
  readonly mio = computed(() => resumenJugador(this.registro.misJugadas()));

  readonly graficaMia = computed(() => {
    const r = this.mio();
    const series = [{ nombre: 'Mi ganancia acumulada', puntos: r.curva, color: COLOR.azul }];
    if (r.regresion) {
      series.push({ nombre: 'Recta de regresión', puntos: puntosRecta(r.regresion.b0, r.regresion.b1, 1, r.jugadas), color: COLOR.rojo });
    }
    return graficaLineas(series, 'Número de jugada', 'Ganancia acumulada ($)');
  });

  /* ---------------- Grupo ---------------- */
  readonly todas = computed(() => this.registro.jugadas());

  readonly porJugador = computed(() => {
    const grupos = new Map<string, Jugada[]>();
    for (const j of this.todas()) grupos.set(j.jugador, [...(grupos.get(j.jugador) ?? []), j]);
    return [...grupos.entries()]
      .map(([nombre, js]) => ({ nombre, resumen: resumenJugador(js) }))
      .sort((a, b) => b.resumen.jugadas - a.resumen.jugadas);
  });

  readonly juegoResultado = computed(() => tablaJuegoResultado(this.todas()));

  /** Total de una columna de una tabla de conteos. */
  sumaColumna(conteos: number[][], j: number): number {
    return conteos.reduce((s, fila) => s + fila[j], 0);
  }

  readonly dadosGrupo = computed(() => {
    const tabla = tablaDadosReal(this.todas());
    return { tabla, prueba: chiCuadradoIndependencia(tabla.conteos) };
  });

  readonly correlacion = computed(() => {
    const c = correlacionApuestaPerdida(this.todas());
    const x = c.puntos.map((p) => p.totalApostado);
    const y = c.puntos.map((p) => p.perdidaTotal);
    const reg = c.puntos.length >= 3 ? regresionLineal(x, y) : null;
    const grafica = graficaDispersion(
      c.puntos.map((p) => ({ x: p.totalApostado, y: p.perdidaTotal })),
      'Total apostado por el jugador ($)',
      'Pérdida total del jugador ($)',
      reg ? { nombre: 'Recta de regresión', puntos: puntosRecta(reg.b0, reg.b1, Math.min(...x), Math.max(...x)) } : undefined,
    );
    return { ...c, reg, grafica };
  });

  readonly pruebaT = computed(() => pruebaTRuleta(this.todas()));

  recargar(): void {
    void this.registro.recargar();
  }

  exportar(): void {
    const csv = '﻿' + this.registro.exportarCsv();
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jugadas-casa-siempre-gana.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  borrar(): void {
    this.registro.borrarMisJugadas();
    this.confirmarBorrado.set(false);
  }
}
