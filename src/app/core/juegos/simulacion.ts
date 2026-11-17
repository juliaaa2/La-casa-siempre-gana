/**
 * Simulación Monte Carlo: repite un juego n veces para comparar
 * la frecuencia observada con la probabilidad teórica (ley de los grandes números)
 * y ajustar la regresión de la ganancia acumulada contra el número de jugada.
 */
import { Juego, valorEsperado } from '../modelos';
import { regresionLineal, ResultadoRegresion } from '../estadistica/estadistica';
import { apuestaDados, lanzarDado, resolverDados } from './dados';
import { apuestaRuleta, ganaRuleta, girarRuleta, resolverRuleta } from './ruleta';
import { barajaCompleta, Baraja, pagoCartas, probabilidadesCondicionales, valorEsperadoCartas } from './cartas';

export interface ConfigSimulacion {
  juego: Juego;
  /** Para cartas solo se usa 'optima': en cada ronda elige la opción (mayor o menor) más probable */
  apuesta: string;
  monto: number;
  n: number;
  numeroElegido?: number;
}

export interface ResultadoSimulacion {
  n: number;
  exitos: number;
  frecuenciaRelativa: number;
  probabilidadTeorica: number;
  valorEsperadoTeorico: number;
  gananciaTotal: number;
  gananciaPromedio: number;
  /** Puntos (jugada, ganancia acumulada) reducidos para graficar */
  curvaGanancia: { x: number; y: number }[];
  /** Puntos (jugada, frecuencia relativa acumulada) reducidos para graficar */
  curvaFrecuencia: { x: number; y: number }[];
  regresion: ResultadoRegresion;
}

/**
 * Valores teóricos de cartas con la estrategia óptima y la baraja completa
 * (promedio sobre las 52 posibles primeras cartas).
 */
export function teoricoCartas(monto: number): { probabilidad: number; valorEsperado: number } {
  const baraja = barajaCompleta();
  let p = 0;
  let ev = 0;
  for (let i = 0; i < baraja.length; i++) {
    const resto = baraja.filter((_, j) => j !== i);
    const c = probabilidadesCondicionales(baraja[i], resto);
    const pMax = Math.max(c.mayor, c.menor);
    p += pMax;
    ev += valorEsperadoCartas(pMax, monto);
  }
  return { probabilidad: p / baraja.length, valorEsperado: ev / baraja.length };
}

export function simular(cfg: ConfigSimulacion): ResultadoSimulacion {
  const { juego, apuesta, monto, n } = cfg;
  const numeroElegido = cfg.numeroElegido ?? 0;

  let probabilidadTeorica: number;
  let valorEsperadoTeorico: number;
  if (juego === 'dados') {
    const a = apuestaDados(apuesta);
    probabilidadTeorica = a.probabilidad;
    valorEsperadoTeorico = valorEsperado(a, monto);
  } else if (juego === 'ruleta') {
    const a = apuestaRuleta(apuesta);
    probabilidadTeorica = a.probabilidad;
    valorEsperadoTeorico = valorEsperado(a, monto);
  } else {
    const t = teoricoCartas(monto);
    probabilidadTeorica = t.probabilidad;
    valorEsperadoTeorico = t.valorEsperado;
  }

  const paso = Math.max(1, Math.floor(n / 400));
  const curvaGanancia: { x: number; y: number }[] = [];
  const curvaFrecuencia: { x: number; y: number }[] = [];
  const xs: number[] = new Array(n);
  const acumuladas: number[] = new Array(n);

  const baraja = new Baraja();
  let actual = juego === 'cartas' ? baraja.robar() : null;

  let exitos = 0;
  let acumulada = 0;
  for (let i = 0; i < n; i++) {
    let g: number;
    let gana: boolean;
    if (juego === 'dados') {
      const d1 = lanzarDado();
      const d2 = lanzarDado();
      gana = apuestaDados(apuesta).gana(d1, d2);
      g = resolverDados(apuesta, monto, d1, d2);
    } else if (juego === 'ruleta') {
      const n = girarRuleta();
      gana = ganaRuleta(apuesta, n, numeroElegido);
      g = resolverRuleta(apuesta, monto, n, numeroElegido);
    } else {
      if (baraja.cantidad === 0) {
        baraja.reiniciar();
        actual = baraja.robar();
      }
      // Estrategia óptima: apostar a la opción más probable con la baraja que queda
      const p = probabilidadesCondicionales(actual!, baraja.restantes);
      const eleccion = p.mayor >= p.menor ? 'mayor' : 'menor';
      const pGanar = Math.max(p.mayor, p.menor);
      const siguiente = baraja.robar();
      gana = eleccion === 'mayor' ? siguiente.valor > actual!.valor : siguiente.valor < actual!.valor;
      g = gana ? pagoCartas(pGanar) * monto : -monto;
      actual = siguiente;
    }
    if (gana) exitos++;
    acumulada += g;
    xs[i] = i + 1;
    acumuladas[i] = acumulada;
    if ((i + 1) % paso === 0 || i === n - 1) {
      curvaGanancia.push({ x: i + 1, y: acumulada });
      curvaFrecuencia.push({ x: i + 1, y: exitos / (i + 1) });
    }
  }

  return {
    n,
    exitos,
    frecuenciaRelativa: n ? exitos / n : 0,
    probabilidadTeorica,
    valorEsperadoTeorico,
    gananciaTotal: acumulada,
    gananciaPromedio: n ? acumulada / n : 0,
    curvaGanancia,
    curvaFrecuencia,
    regresion: regresionLineal(xs, acumuladas),
  };
}
