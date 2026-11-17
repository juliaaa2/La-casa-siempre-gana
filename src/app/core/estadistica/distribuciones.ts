/**
 * Funciones de distribución de probabilidad.
 *
 * Están implementadas a mano (sin librerías) para que se vea la estadística
 * que hay detrás de cada cálculo de la app.
 */

const EPS = 1e-14;
const MAX_ITER = 500;

/** ln(Γ(x)) con la aproximación de Lanczos. */
export function lnGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Fórmula de reflexión
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Fracción continua para la función beta incompleta. */
function betaFraccionContinua(x: number, a: number, b: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Función beta incompleta regularizada I_x(a, b). */
export function betaIncompleta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaFraccionContinua(x, a, b)) / a;
  }
  return 1 - (bt * betaFraccionContinua(1 - x, b, a)) / b;
}

/** Función gamma incompleta inferior regularizada P(a, x). */
export function gammaIncompleta(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    // Serie
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= MAX_ITER; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Fracción continua
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/* ---------------- Distribuciones continuas ---------------- */

/** P(Z ≤ z) para la normal estándar. */
export function normalCdf(z: number): number {
  const p = gammaIncompleta(0.5, (z * z) / 2);
  return z >= 0 ? 0.5 * (1 + p) : 0.5 * (1 - p);
}

/** P(X ≤ x) para X ~ Chi-cuadrado con k grados de libertad. */
export function chiCuadradoCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  return gammaIncompleta(k / 2, x / 2);
}

/** P(X ≤ x) para X ~ F(d1, d2). */
export function fCdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  return betaIncompleta((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
}

/** P(T ≤ t) para T ~ t de Student con v grados de libertad. */
export function tCdf(t: number, v: number): number {
  const ib = betaIncompleta(v / (v + t * t), v / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/** Busca x tal que cdf(x) = p, por bisección (para valores críticos). */
function inversaPorBiseccion(cdf: (x: number) => number, p: number): number {
  let lo = 0;
  let hi = 1;
  while (cdf(hi) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Valor crítico F(α; d1; d2): el valor que deja α en la cola superior. */
export function valorCriticoF(alfa: number, d1: number, d2: number): number {
  return inversaPorBiseccion((x) => fCdf(x, d1, d2), 1 - alfa);
}

/** Valor crítico χ²(α; k): el valor que deja α en la cola superior. */
export function valorCriticoChiCuadrado(alfa: number, k: number): number {
  return inversaPorBiseccion((x) => chiCuadradoCdf(x, k), 1 - alfa);
}

/** Valor crítico t(α/2; v) para una prueba bilateral. */
export function valorCriticoT(alfa: number, v: number): number {
  return inversaPorBiseccion((x) => tCdf(x, v), 1 - alfa / 2);
}

/* ---------------- Distribuciones discretas ---------------- */

/** Combinaciones C(n, k). */
export function combinaciones(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** P(X = k) para X ~ Binomial(n, p). */
export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  return combinaciones(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** P(X ≤ k) para X ~ Binomial(n, p). */
export function binomialCdf(k: number, n: number, p: number): number {
  let s = 0;
  for (let i = 0; i <= Math.min(k, n); i++) s += binomialPmf(i, n, p);
  return Math.min(1, s);
}

/** P(X = k) para X ~ Geométrica(p): número de intentos hasta el primer éxito (k = 1, 2, ...). */
export function geometricaPmf(k: number, p: number): number {
  if (k < 1) return 0;
  return Math.pow(1 - p, k - 1) * p;
}

/**
 * P(X = k) para X ~ Hipergeométrica: se sacan n elementos sin reposición de una
 * población de N que tiene K "éxitos".
 */
export function hipergeometricaPmf(k: number, N: number, K: number, n: number): number {
  if (k < 0 || k > K || k > n || n - k > N - K) return 0;
  return (combinaciones(K, k) * combinaciones(N - K, n - k)) / combinaciones(N, n);
}
