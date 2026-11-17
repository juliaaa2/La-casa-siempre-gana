/**
 * Análisis de las jugadas reales registradas en la app.
 */
import { Juego, JUEGOS, Jugada, NOMBRE_JUEGO } from '../modelos';
import {
  chiCuadradoIndependencia,
  correlacion,
  covarianza,
  pruebaTUnaMuestra,
  regresionLineal,
  resumenDescriptivo,
  ResultadoChiCuadrado,
  ResultadoPruebaT,
  ResultadoRegresion,
  ResumenDescriptivo,
  suma,
  tablaBidimensional,
  TablaBidimensional,
} from './estadistica';

/** Ordena por fecha (las jugadas pueden venir desordenadas de la base de datos). */
export function ordenarPorFecha(jugadas: readonly Jugada[]): Jugada[] {
  return [...jugadas].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Racha más larga de victorias y de derrotas seguidas. */
export function rachas(jugadas: readonly Jugada[]): { mejor: number; peor: number } {
  let mejor = 0, peor = 0, ganadas = 0, perdidas = 0;
  for (const j of ordenarPorFecha(jugadas)) {
    if (j.gano) {
      ganadas++;
      perdidas = 0;
    } else {
      perdidas++;
      ganadas = 0;
    }
    mejor = Math.max(mejor, ganadas);
    peor = Math.max(peor, perdidas);
  }
  return { mejor, peor };
}

export interface ResumenJugador {
  jugadas: number;
  totalApostado: number;
  gananciaTotal: number;
  porcentajeGanadas: number;
  ganancias: ResumenDescriptivo;
  rachas: { mejor: number; peor: number };
  /** Regresión de la ganancia acumulada contra el número de jugada (null si hay menos de 3 jugadas) */
  regresion: ResultadoRegresion | null;
  curva: { x: number; y: number }[];
}

export function resumenJugador(jugadas: readonly Jugada[]): ResumenJugador {
  const orden = ordenarPorFecha(jugadas);
  const ganancias = orden.map((j) => j.ganancia);
  const curva: { x: number; y: number }[] = [];
  let acumulada = 0;
  orden.forEach((j, i) => {
    acumulada += j.ganancia;
    curva.push({ x: i + 1, y: acumulada });
  });
  return {
    jugadas: orden.length,
    totalApostado: suma(orden.map((j) => j.monto)),
    gananciaTotal: suma(ganancias),
    porcentajeGanadas: orden.length ? (orden.filter((j) => j.gano).length / orden.length) * 100 : 0,
    ganancias: resumenDescriptivo(ganancias),
    rachas: rachas(orden),
    regresion: orden.length >= 3 ? regresionLineal(curva.map((p) => p.x), curva.map((p) => p.y)) : null,
    curva,
  };
}

/** Tabla bidimensional juego × resultado (ganó / perdió) con prueba de independencia. */
export function tablaJuegoResultado(jugadas: readonly Jugada[]): { tabla: TablaBidimensional; prueba: ResultadoChiCuadrado } {
  const tabla = tablaBidimensional(
    jugadas.map((j) => ({ fila: j.juego, columna: j.gano ? 'Ganó' : 'Perdió' })),
    JUEGOS,
    ['Ganó', 'Perdió'],
    (f: Juego) => NOMBRE_JUEGO[f],
  );
  return { tabla, prueba: chiCuadradoIndependencia(tabla.conteos) };
}

/** Tabla bidimensional dado 1 × dado 2 con las jugadas de dados reales. */
export function tablaDadosReal(jugadas: readonly Jugada[]): TablaBidimensional {
  const caras = [1, 2, 3, 4, 5, 6];
  return tablaBidimensional(
    jugadas.filter((j) => j.juego === 'dados' && j.dado1 && j.dado2).map((j) => ({ fila: j.dado1!, columna: j.dado2! })),
    caras,
    caras,
  );
}

export interface PuntoJugador {
  jugador: string;
  totalApostado: number;
  perdidaTotal: number;
}

/** Por jugador: total apostado (X) contra pérdida total (Y), con covarianza y correlación. */
export function correlacionApuestaPerdida(jugadas: readonly Jugada[]): {
  puntos: PuntoJugador[];
  covarianza: number;
  correlacion: number;
} {
  const porJugador = new Map<string, PuntoJugador>();
  for (const j of jugadas) {
    const p = porJugador.get(j.jugador) ?? { jugador: j.jugador, totalApostado: 0, perdidaTotal: 0 };
    p.totalApostado += j.monto;
    p.perdidaTotal -= j.ganancia;
    porJugador.set(j.jugador, p);
  }
  const puntos = [...porJugador.values()];
  const x = puntos.map((p) => p.totalApostado);
  const y = puntos.map((p) => p.perdidaTotal);
  return { puntos, covarianza: covarianza(x, y), correlacion: correlacion(x, y) };
}

/**
 * Prueba t con las jugadas reales de ruleta.
 * Variable: ganancia por cada peso apostado (ganancia / monto).
 * H0: μ = −1/37 (lo que dice la teoría para cualquier apuesta de la ruleta europea).
 */
export const MEDIA_TEORICA_RULETA = -1 / 37;

export function pruebaTRuleta(jugadas: readonly Jugada[], alfa = 0.05): ResultadoPruebaT {
  const datos = jugadas.filter((j) => j.juego === 'ruleta' && j.monto > 0).map((j) => j.ganancia / j.monto);
  return pruebaTUnaMuestra(datos, MEDIA_TEORICA_RULETA, alfa);
}
