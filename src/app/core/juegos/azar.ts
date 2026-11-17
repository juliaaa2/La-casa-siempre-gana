/**
 * Generador de números aleatorios.
 *
 * Usa crypto.getRandomValues del navegador, que produce valores uniformes
 * de mejor calidad que Math.random().
 */

const BUFFER = new Uint32Array(1024);
let posicion = BUFFER.length;

function siguienteUint32(): number {
  if (posicion >= BUFFER.length) {
    crypto.getRandomValues(BUFFER);
    posicion = 0;
  }
  return BUFFER[posicion++];
}

/** Número uniforme en [0, 1). */
export function aleatorio(): number {
  return siguienteUint32() / 4294967296;
}

/** Entero uniforme entre min y max (ambos incluidos), sin sesgo. */
export function enteroAleatorio(min: number, max: number): number {
  const rango = max - min + 1;
  const limite = 4294967296 - (4294967296 % rango);
  let v: number;
  do {
    v = siguienteUint32();
  } while (v >= limite);
  return min + (v % rango);
}

/**
 * Elige un índice según una lista de probabilidades (que suman 1).
 * Se usa para el dado cargado.
 */
export function indicePonderado(probabilidades: readonly number[]): number {
  const u = aleatorio();
  let acumulada = 0;
  for (let i = 0; i < probabilidades.length; i++) {
    acumulada += probabilidades[i];
    if (u < acumulada) return i;
  }
  return probabilidades.length - 1;
}

/** Mezcla un arreglo con el algoritmo de Fisher-Yates. */
export function mezclar<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = enteroAleatorio(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
