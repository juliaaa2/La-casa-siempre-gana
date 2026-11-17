/**
 * Juego 1: Dos dados.
 * Variable aleatoria bidimensional (X₁, X₂) con 36 resultados igualmente probables.
 */
import { OpcionApuesta } from '../modelos';
import { enteroAleatorio, indicePonderado } from './azar';

export const CARAS = [1, 2, 3, 4, 5, 6] as const;

interface ReglaDados extends Omit<OpcionApuesta, 'probabilidad'> {
  gana: (d1: number, d2: number) => boolean;
}

const REGLAS: ReglaDados[] = [
  {
    id: 'mayor7',
    nombre: 'Mayor que 7',
    descripcion: 'La suma es 8, 9, 10, 11 o 12. Paga 1 a 1.',
    pago: 1,
    gana: (a, b) => a + b > 7,
  },
  {
    id: 'menor7',
    nombre: 'Menor que 7',
    descripcion: 'La suma es 2, 3, 4, 5 o 6. Paga 1 a 1.',
    pago: 1,
    gana: (a, b) => a + b < 7,
  },
  {
    id: 'siete',
    nombre: 'Exactamente 7',
    descripcion: 'La suma es 7. Paga 4 a 1.',
    pago: 4,
    gana: (a, b) => a + b === 7,
  },
  {
    id: 'dobles',
    nombre: 'Dobles',
    descripcion: 'Los dos dados muestran el mismo número. Paga 4 a 1.',
    pago: 4,
    gana: (a, b) => a === b,
  },
];

/** Probabilidad de una apuesta contando casos favorables entre los 36 posibles (regla de Laplace). */
function probabilidadPorConteo(gana: (a: number, b: number) => boolean): number {
  let favorables = 0;
  for (const a of CARAS) for (const b of CARAS) if (gana(a, b)) favorables++;
  return favorables / 36;
}

export const APUESTAS_DADOS: (OpcionApuesta & { gana: (d1: number, d2: number) => boolean })[] = REGLAS.map((r) => ({
  ...r,
  probabilidad: probabilidadPorConteo(r.gana),
}));

export function apuestaDados(id: string) {
  const a = APUESTAS_DADOS.find((x) => x.id === id);
  if (!a) throw new Error(`Apuesta de dados desconocida: ${id}`);
  return a;
}

/** Lanza un dado justo. */
export function lanzarDado(): number {
  return enteroAleatorio(1, 6);
}

/** Lanza un dado con probabilidades dadas para las caras 1..6 (dado cargado). */
export function lanzarDadoCargado(probabilidades: readonly number[]): number {
  return indicePonderado(probabilidades) + 1;
}

/** Ganancia neta de una apuesta a los dados. */
export function resolverDados(idApuesta: string, monto: number, d1: number, d2: number): number {
  const a = apuestaDados(idApuesta);
  return a.gana(d1, d2) ? a.pago * monto : -monto;
}

/* ---------- Modelo teórico de la variable bidimensional ---------- */

/** Distribución conjunta teórica P(X₁ = i, X₂ = j) = 1/36. */
export function conjuntaTeorica(): number[][] {
  return CARAS.map(() => CARAS.map(() => 1 / 36));
}

/** Distribución de la suma S = X₁ + X₂ (valores 2 a 12). */
export function distribucionSuma(): { s: number; p: number }[] {
  const r: { s: number; p: number }[] = [];
  for (let s = 2; s <= 12; s++) {
    let c = 0;
    for (const a of CARAS) for (const b of CARAS) if (a + b === s) c++;
    r.push({ s, p: c / 36 });
  }
  return r;
}

/** E(S), Var(S), Var(X₁), Cov(X₁, S) y ρ(X₁, S) teóricos. */
export function momentosTeoricos() {
  let ex = 0, ex2 = 0, es = 0, es2 = 0, exs = 0;
  for (const a of CARAS) {
    for (const b of CARAS) {
      const p = 1 / 36;
      const s = a + b;
      ex += a * p;
      ex2 += a * a * p;
      es += s * p;
      es2 += s * s * p;
      exs += a * s * p;
    }
  }
  const varX = ex2 - ex * ex;
  const varS = es2 - es * es;
  const covXS = exs - ex * es;
  return {
    eX: ex,
    varX,
    eS: es,
    varS,
    covX1X2: 0,
    covX1S: covXS,
    correlacionX1S: covXS / Math.sqrt(varX * varS),
  };
}

/** Probabilidades del dado cargado del modo detective: el 6 sale con probabilidad 0.25. */
export const DADO_CARGADO = [0.15, 0.15, 0.15, 0.15, 0.15, 0.25] as const;
export const DADO_JUSTO = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6] as const;
