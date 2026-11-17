/**
 * Estadística descriptiva, correlación, regresión lineal, pruebas de hipótesis
 * y distribuciones bidimensionales.
 */
import { chiCuadradoCdf, fCdf, tCdf, valorCriticoChiCuadrado, valorCriticoF, valorCriticoT } from './distribuciones';

/* ---------------- Descriptiva ---------------- */

export function suma(x: readonly number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return s;
}

export function media(x: readonly number[]): number {
  return x.length ? suma(x) / x.length : 0;
}

export function mediana(x: readonly number[]): number {
  if (!x.length) return 0;
  const o = [...x].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** Varianza muestral (divide entre n − 1). */
export function varianza(x: readonly number[]): number {
  if (x.length < 2) return 0;
  const m = media(x);
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return s / (x.length - 1);
}

export function desviacion(x: readonly number[]): number {
  return Math.sqrt(varianza(x));
}

/** Coeficiente de variación en porcentaje. */
export function coeficienteVariacion(x: readonly number[]): number {
  const m = media(x);
  return m === 0 ? 0 : (desviacion(x) / Math.abs(m)) * 100;
}

export interface ResumenDescriptivo {
  n: number;
  media: number;
  mediana: number;
  desviacion: number;
  coefVariacion: number;
  minimo: number;
  maximo: number;
}

export function resumenDescriptivo(x: readonly number[]): ResumenDescriptivo {
  return {
    n: x.length,
    media: media(x),
    mediana: mediana(x),
    desviacion: desviacion(x),
    coefVariacion: coeficienteVariacion(x),
    minimo: x.length ? Math.min(...x) : 0,
    maximo: x.length ? Math.max(...x) : 0,
  };
}

/** Frecuencias de un histograma con k intervalos de igual ancho. */
export function histograma(x: readonly number[], k: number): { etiqueta: string; frecuencia: number }[] {
  if (!x.length) return [];
  const min = Math.min(...x);
  const max = Math.max(...x);
  const ancho = max === min ? 1 : (max - min) / k;
  const f = new Array(k).fill(0);
  for (const v of x) {
    let i = Math.floor((v - min) / ancho);
    if (i >= k) i = k - 1;
    f[i]++;
  }
  return f.map((frecuencia, i) => ({
    etiqueta: `${Math.round(min + i * ancho)} a ${Math.round(min + (i + 1) * ancho)}`,
    frecuencia,
  }));
}

/* ---------------- Covarianza y correlación ---------------- */

/** Covarianza muestral. */
export function covarianza(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = media(x);
  const my = media(y);
  let s = 0;
  for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
  return s / (n - 1);
}

/** Coeficiente de correlación de Pearson. */
export function correlacion(x: readonly number[], y: readonly number[]): number {
  const sx = desviacion(x);
  const sy = desviacion(y);
  if (sx === 0 || sy === 0) return 0;
  return covarianza(x, y) / (sx * sy);
}

/* ---------------- Regresión lineal simple ---------------- */

export interface ResultadoRegresion {
  n: number;
  b0: number;
  b1: number;
  sct: number;
  scr: number;
  sce: number;
  glRegresion: number;
  glError: number;
  cmr: number;
  cme: number;
  f: number;
  fCritico: number;
  valorP: number;
  r2: number;
  significativa: boolean;
}

/**
 * Regresión lineal simple Ŷ = b0 + b1·X por mínimos cuadrados, con su tabla ANOVA.
 * b1 = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²),  b0 = ȳ − b1·x̄
 */
export function regresionLineal(x: readonly number[], y: readonly number[], alfa = 0.05): ResultadoRegresion {
  const n = Math.min(x.length, y.length);
  const xbar = n ? media(x.slice(0, n)) : 0;
  const ybar = n ? media(y.slice(0, n)) : 0;
  // Se trabaja con desviaciones respecto a la media para no perder precisión
  // cuando hay muchos datos grandes (por ejemplo, 100.000 jugadas).
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - xbar;
    const dy = y[i] - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const b1 = sxx === 0 ? 0 : sxy / sxx;
  const b0 = ybar - b1 * xbar;

  // Sumas de cuadrados. Son equivalentes a las fórmulas del curso:
  // SCT = ΣY² − nȲ²,  SCR = b0ΣY + b1ΣXY − nȲ²,  SCE = SCT − SCR
  const sct = syy;
  const scr = b1 * sxy;
  const sce = Math.max(0, sct - scr);

  const glRegresion = 1;
  const glError = n - 2;
  const cmr = scr / glRegresion;
  const cme = glError > 0 ? sce / glError : 0;
  const f = cme > 0 ? cmr / cme : 0;
  const fCritico = glError > 0 ? valorCriticoF(alfa, glRegresion, glError) : 0;
  const valorP = glError > 0 && cme > 0 ? 1 - fCdf(f, glRegresion, glError) : 1;
  const r2 = sct > 0 ? scr / sct : 0;
  return { n, b0, b1, sct, scr, sce, glRegresion, glError, cmr, cme, f, fCritico, valorP, r2, significativa: f > fCritico };
}

/* ---------------- Pruebas de hipótesis ---------------- */

export interface ResultadoChiCuadrado {
  estadistico: number;
  gl: number;
  valorP: number;
  valorCritico: number;
  rechazaH0: boolean;
  esperados: number[];
}

/**
 * Prueba chi-cuadrado de bondad de ajuste.
 * χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ,  con k − 1 grados de libertad.
 */
export function chiCuadradoBondadAjuste(
  observados: readonly number[],
  probabilidades: readonly number[],
  alfa = 0.05,
): ResultadoChiCuadrado {
  const n = suma(observados);
  const esperados = probabilidades.map((p) => n * p);
  let estadistico = 0;
  for (let i = 0; i < observados.length; i++) {
    if (esperados[i] > 0) estadistico += (observados[i] - esperados[i]) ** 2 / esperados[i];
  }
  const gl = observados.length - 1;
  const valorP = 1 - chiCuadradoCdf(estadistico, gl);
  const valorCritico = valorCriticoChiCuadrado(alfa, gl);
  return { estadistico, gl, valorP, valorCritico, rechazaH0: estadistico > valorCritico, esperados };
}

/**
 * Prueba chi-cuadrado de independencia para una tabla de contingencia.
 * Eᵢⱼ = (total fila i · total columna j) / n,  gl = (filas − 1)(columnas − 1).
 */
export function chiCuadradoIndependencia(tabla: readonly (readonly number[])[], alfa = 0.05): ResultadoChiCuadrado {
  const filas = tabla.length;
  const cols = tabla[0]?.length ?? 0;
  const totFila = tabla.map((f) => suma(f));
  const totCol = Array.from({ length: cols }, (_, j) => suma(tabla.map((f) => f[j])));
  const n = suma(totFila);
  let estadistico = 0;
  const esperados: number[] = [];
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < cols; j++) {
      const e = n ? (totFila[i] * totCol[j]) / n : 0;
      esperados.push(e);
      if (e > 0) estadistico += (tabla[i][j] - e) ** 2 / e;
    }
  }
  const gl = (filas - 1) * (cols - 1);
  const valorP = gl > 0 ? 1 - chiCuadradoCdf(estadistico, gl) : 1;
  const valorCritico = gl > 0 ? valorCriticoChiCuadrado(alfa, gl) : 0;
  return { estadistico, gl, valorP, valorCritico, rechazaH0: gl > 0 && estadistico > valorCritico, esperados };
}

export interface ResultadoPruebaT {
  n: number;
  media: number;
  desviacion: number;
  t: number;
  gl: number;
  valorP: number;
  valorCritico: number;
  rechazaH0: boolean;
}

/**
 * Prueba t para la media de una muestra (bilateral).
 * H0: μ = μ0.  t = (x̄ − μ0) / (s / √n),  gl = n − 1.
 */
export function pruebaTUnaMuestra(datos: readonly number[], mu0: number, alfa = 0.05): ResultadoPruebaT {
  const n = datos.length;
  const m = media(datos);
  const s = desviacion(datos);
  const gl = n - 1;
  const t = n > 1 && s > 0 ? (m - mu0) / (s / Math.sqrt(n)) : 0;
  const valorP = gl > 0 ? 2 * (1 - tCdf(Math.abs(t), gl)) : 1;
  const valorCritico = gl > 0 ? valorCriticoT(alfa, gl) : 0;
  return { n, media: m, desviacion: s, t, gl, valorP, valorCritico, rechazaH0: gl > 0 && Math.abs(t) > valorCritico };
}

/* ---------------- Distribuciones bidimensionales ---------------- */

export interface TablaBidimensional {
  filas: string[];
  columnas: string[];
  /** Frecuencias absolutas nᵢⱼ */
  conteos: number[][];
  /** Distribución conjunta fᵢⱼ = nᵢⱼ / n */
  conjunta: number[][];
  /** Marginal de las filas fᵢ. */
  marginalFilas: number[];
  /** Marginal de las columnas f.ⱼ */
  marginalColumnas: number[];
  /** Condicional de la columna dada la fila: P(columna j | fila i) */
  condicionalDadaFila: number[][];
  /** Condicional de la fila dada la columna: P(fila i | columna j) */
  condicionalDadaColumna: number[][];
  total: number;
}

export function tablaBidimensional<F, C>(
  pares: readonly { fila: F; columna: C }[],
  filas: readonly F[],
  columnas: readonly C[],
  etiquetaFila: (f: F) => string = String,
  etiquetaColumna: (c: C) => string = String,
): TablaBidimensional {
  const conteos = filas.map(() => columnas.map(() => 0));
  for (const p of pares) {
    const i = filas.indexOf(p.fila);
    const j = columnas.indexOf(p.columna);
    if (i >= 0 && j >= 0) conteos[i][j]++;
  }
  const total = suma(conteos.map((f) => suma(f)));
  const div = (a: number, b: number) => (b ? a / b : 0);
  const totFila = conteos.map((f) => suma(f));
  const totCol = columnas.map((_, j) => suma(conteos.map((f) => f[j])));
  return {
    filas: filas.map(etiquetaFila),
    columnas: columnas.map(etiquetaColumna),
    conteos,
    conjunta: conteos.map((f) => f.map((v) => div(v, total))),
    marginalFilas: totFila.map((v) => div(v, total)),
    marginalColumnas: totCol.map((v) => div(v, total)),
    condicionalDadaFila: conteos.map((f, i) => f.map((v) => div(v, totFila[i]))),
    condicionalDadaColumna: conteos.map((f) => f.map((v, j) => div(v, totCol[j]))),
    total,
  };
}
