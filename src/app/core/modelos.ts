export type Juego = 'dados' | 'ruleta';

export const JUEGOS: readonly Juego[] = ['dados', 'ruleta'];

export const NOMBRE_JUEGO: Record<Juego, string> = {
  dados: 'Dados',
  ruleta: 'Ruleta',
};

/** Una jugada registrada. Es la unidad de datos de todo el análisis. */
export interface Jugada {
  id: string;
  jugador: string;
  juego: Juego;
  /** Identificador de la apuesta, por ejemplo 'mayor7', 'rojo', 'mayor' */
  apuesta: string;
  monto: number;
  /** Resultado legible, por ejemplo "4 + 5 = 9", "17 rojo", "K♠ → 3♥" */
  resultado: string;
  gano: boolean;
  /** Ganancia neta de la jugada (negativa si perdió) */
  ganancia: number;
  /** Saldo del jugador después de la jugada */
  saldo: number;
  /** Fecha y hora en formato ISO */
  fecha: string;
  /** Solo para dados: los dos valores, para la tabla bidimensional */
  dado1?: number;
  dado2?: number;
  /** Solo para ruleta: el número que salió */
  numero?: number;
  /** Probabilidad de ganar en el momento de la apuesta (opcional) */
  probabilidad?: number;
}

/** Una opción de apuesta con su modelo de probabilidad. */
export interface OpcionApuesta {
  id: string;
  nombre: string;
  descripcion: string;
  /** Probabilidad de ganar */
  probabilidad: number;
  /** Cuánto paga por cada peso apostado si gana (ganancia neta) */
  pago: number;
}

/** Valor esperado de la ganancia: E(G) = p·(pago·monto) + (1 − p)·(−monto) */
export function valorEsperado(op: Pick<OpcionApuesta, 'probabilidad' | 'pago'>, monto: number): number {
  return op.probabilidad * op.pago * monto - (1 - op.probabilidad) * monto;
}

/** Varianza de la ganancia: Var(G) = E(G²) − E(G)² */
export function varianzaGanancia(op: Pick<OpcionApuesta, 'probabilidad' | 'pago'>, monto: number): number {
  const eg = valorEsperado(op, monto);
  const eg2 = op.probabilidad * (op.pago * monto) ** 2 + (1 - op.probabilidad) * monto ** 2;
  return eg2 - eg * eg;
}

export const SALDO_INICIAL = 100000;
