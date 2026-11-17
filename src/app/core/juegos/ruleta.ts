/**
 * Juego 2: Ruleta europea.
 * 37 casillas: 0 (verde), 18 rojas y 18 negras.
 */
import { OpcionApuesta } from '../modelos';
import { enteroAleatorio } from './azar';

export const ROJOS: ReadonlySet<number> = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type ColorRuleta = 'rojo' | 'negro' | 'verde';

export function colorDe(n: number): ColorRuleta {
  if (n === 0) return 'verde';
  return ROJOS.has(n) ? 'rojo' : 'negro';
}

export const APUESTAS_RULETA: OpcionApuesta[] = [
  { id: 'rojo', nombre: 'Rojo', descripcion: '18 de 37 casillas. Paga 1 a 1.', probabilidad: 18 / 37, pago: 1 },
  { id: 'negro', nombre: 'Negro', descripcion: '18 de 37 casillas. Paga 1 a 1.', probabilidad: 18 / 37, pago: 1 },
  { id: 'par', nombre: 'Par', descripcion: '18 de 37 casillas (el 0 no cuenta). Paga 1 a 1.', probabilidad: 18 / 37, pago: 1 },
  { id: 'impar', nombre: 'Impar', descripcion: '18 de 37 casillas. Paga 1 a 1.', probabilidad: 18 / 37, pago: 1 },
  { id: 'numero', nombre: 'Un número', descripcion: '1 de 37 casillas. Paga 35 a 1.', probabilidad: 1 / 37, pago: 35 },
];

export function apuestaRuleta(id: string): OpcionApuesta {
  const a = APUESTAS_RULETA.find((x) => x.id === id);
  if (!a) throw new Error(`Apuesta de ruleta desconocida: ${id}`);
  return a;
}

export function girarRuleta(): number {
  return enteroAleatorio(0, 36);
}

/** ¿Gana la apuesta con el número que salió? */
export function ganaRuleta(idApuesta: string, n: number, numeroElegido = 0): boolean {
  switch (idApuesta) {
    case 'rojo':
      return colorDe(n) === 'rojo';
    case 'negro':
      return colorDe(n) === 'negro';
    case 'par':
      return n !== 0 && n % 2 === 0;
    case 'impar':
      return n % 2 === 1;
    case 'numero':
      return n === numeroElegido;
    default:
      throw new Error(`Apuesta de ruleta desconocida: ${idApuesta}`);
  }
}

/** Ganancia neta de una apuesta a la ruleta. */
export function resolverRuleta(idApuesta: string, monto: number, n: number, numeroElegido = 0): number {
  const a = apuestaRuleta(idApuesta);
  return ganaRuleta(idApuesta, n, numeroElegido) ? a.pago * monto : -monto;
}
