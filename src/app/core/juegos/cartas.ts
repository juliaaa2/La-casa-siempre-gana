/**
 * Juego 3: Cartas, "mayor o menor".
 * Se saca una carta y el jugador apuesta si la siguiente será mayor o menor.
 * Las cartas NO se devuelven a la baraja (muestreo sin reposición), así que las
 * probabilidades cambian después de cada carta: probabilidad condicional.
 * Si la siguiente carta tiene el mismo valor, el jugador pierde.
 *
 * El pago depende de la probabilidad condicional de ganar: la casa paga lo
 * "justo" menos una comisión del 5 %. Así el valor esperado siempre es negativo:
 *   pago = 0,95 · (1 − p) / p   →   E(G) = −0,05 · (1 − p) · monto
 */
import { binomialPmf, hipergeometricaPmf } from '../estadistica/distribuciones';
import { mezclar } from './azar';

export type Palo = '♠' | '♥' | '♦' | '♣';
export const PALOS: readonly Palo[] = ['♠', '♥', '♦', '♣'];

/** Valores de 2 a 14 (11 = J, 12 = Q, 13 = K, 14 = A). */
export const VALORES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export interface Carta {
  valor: number;
  palo: Palo;
}

export function nombreValor(v: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[v] ?? String(v);
}

export function nombreCarta(c: Carta): string {
  return `${nombreValor(c.valor)}${c.palo}`;
}

export function esRoja(c: Carta): boolean {
  return c.palo === '♥' || c.palo === '♦';
}

export function barajaCompleta(): Carta[] {
  const b: Carta[] = [];
  for (const palo of PALOS) for (const valor of VALORES) b.push({ valor, palo });
  return b;
}

/** Baraja de 52 cartas que se va gastando. */
export class Baraja {
  private cartas: Carta[] = [];

  constructor() {
    this.reiniciar();
  }

  reiniciar(): void {
    this.cartas = mezclar(barajaCompleta());
  }

  robar(): Carta {
    const c = this.cartas.pop();
    if (!c) throw new Error('La baraja está vacía');
    return c;
  }

  get restantes(): readonly Carta[] {
    return this.cartas;
  }

  get cantidad(): number {
    return this.cartas.length;
  }
}

export type ApuestaCartas = 'mayor' | 'menor';

export interface ProbabilidadesCondicionales {
  mayor: number;
  menor: number;
  igual: number;
  restantes: number;
}

/** P(siguiente mayor | carta actual y cartas que quedan), P(menor | …) y P(igual | …). */
export function probabilidadesCondicionales(actual: Carta, restantes: readonly Carta[]): ProbabilidadesCondicionales {
  const n = restantes.length;
  let mayor = 0, menor = 0, igual = 0;
  for (const c of restantes) {
    if (c.valor > actual.valor) mayor++;
    else if (c.valor < actual.valor) menor++;
    else igual++;
  }
  return n
    ? { mayor: mayor / n, menor: menor / n, igual: igual / n, restantes: n }
    : { mayor: 0, menor: 0, igual: 0, restantes: 0 };
}

export function ganaCartas(apuesta: ApuestaCartas, actual: Carta, siguiente: Carta): boolean {
  return apuesta === 'mayor' ? siguiente.valor > actual.valor : siguiente.valor < actual.valor;
}

/** Comisión de la casa en el juego de cartas. */
export const COMISION_CARTAS = 0.05;

/** Cuánto paga por cada peso apostado según la probabilidad de ganar (0 si no se puede ganar). */
export function pagoCartas(pGanar: number): number {
  if (pGanar <= 0) return 0;
  return ((1 - COMISION_CARTAS) * (1 - pGanar)) / pGanar;
}

/** Ganancia neta de la jugada. El pago se fija con la probabilidad ANTES de ver la siguiente carta. */
export function resolverCartas(apuesta: ApuestaCartas, monto: number, actual: Carta, siguiente: Carta, pGanar: number): number {
  return ganaCartas(apuesta, actual, siguiente) ? pagoCartas(pGanar) * monto : -monto;
}

/** Valor esperado: E(G) = p · pago · monto − (1 − p) · monto = −0,05 · (1 − p) · monto. */
export function valorEsperadoCartas(pGanar: number, monto: number): number {
  return pGanar * pagoCartas(pGanar) * monto - (1 - pGanar) * monto;
}

/**
 * Hipergeométrica vs. binomial: número de corazones al sacar n cartas
 * de las que quedan, sin reposición (hipergeométrica) y con reposición (binomial).
 */
export function corazonesEnMano(restantes: readonly Carta[], n = 5): { k: number; hiper: number; binom: number }[] {
  const N = restantes.length;
  const K = restantes.filter((c) => c.palo === '♥').length;
  const m = Math.min(n, N);
  const p = N ? K / N : 0;
  const r: { k: number; hiper: number; binom: number }[] = [];
  for (let k = 0; k <= m; k++) {
    r.push({ k, hiper: hipergeometricaPmf(k, N, K, m), binom: binomialPmf(k, m, p) });
  }
  return r;
}

/**
 * Teorema de Bayes con la baraja completa:
 * P(la primera carta era baja | gané apostando "mayor").
 * Carta baja = valor de 2 a 7.
 */
export function bayesBajaDadoGanaMayor(): { pBaja: number; pGanaDadoBaja: number; pGana: number; pBajaDadoGana: number } {
  const baraja = barajaCompleta();
  let pGana = 0;
  let pBajaYGana = 0;
  let pBaja = 0;
  for (let i = 0; i < baraja.length; i++) {
    const primera = baraja[i];
    const resto = baraja.filter((_, j) => j !== i);
    const pPrimera = 1 / 52;
    const pGanaDadaPrimera = resto.filter((c) => c.valor > primera.valor).length / 51;
    pGana += pPrimera * pGanaDadaPrimera;
    if (primera.valor <= 7) {
      pBaja += pPrimera;
      pBajaYGana += pPrimera * pGanaDadaPrimera;
    }
  }
  return { pBaja, pGanaDadoBaja: pBajaYGana / pBaja, pGana, pBajaDadoGana: pBajaYGana / pGana };
}
