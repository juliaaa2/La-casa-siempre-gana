/**
 * Funciones para armar la configuración de las gráficas de Chart.js.
 */

export const COLOR = {
  verde: '#2e7d32',
  dorado: '#d99a00',
  rojo: '#c62828',
  azul: '#1565c0',
  gris: '#7b8794',
  morado: '#6a1b9a',
};

export interface SerieXY {
  nombre: string;
  puntos: { x: number; y: number }[];
  color: string;
  punteada?: boolean;
}

const fuente = { family: 'system-ui, Segoe UI, Roboto, Arial, sans-serif' };

/** Gráfica de líneas con eje X numérico (por ejemplo, número de jugada). */
export function graficaLineas(series: SerieXY[], ejeX: string, ejeY: string, opciones: { yMin?: number; yMax?: number } = {}): object {
  return {
    type: 'line',
    data: {
      datasets: series.map((s) => ({
        label: s.nombre,
        data: s.puntos,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 2,
        borderDash: s.punteada ? [6, 4] : [],
        pointRadius: 0,
        tension: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { type: 'linear', title: { display: true, text: ejeX, font: fuente } },
        y: { min: opciones.yMin, max: opciones.yMax, title: { display: true, text: ejeY, font: fuente } },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  };
}

export interface SerieBarras {
  nombre: string;
  valores: number[];
  color: string;
}

/** Gráfica de barras agrupadas (por ejemplo, teórica vs. observada). */
export function graficaBarras(etiquetas: string[], series: SerieBarras[], ejeX: string, ejeY: string): object {
  return {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: series.map((s) => ({ label: s.nombre, data: s.valores, backgroundColor: s.color, borderRadius: 3 })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { title: { display: true, text: ejeX, font: fuente } },
        y: { beginAtZero: true, title: { display: true, text: ejeY, font: fuente } },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  };
}

/** Diagrama de dispersión con una recta opcional (por ejemplo, la de regresión). */
export function graficaDispersion(
  puntos: { x: number; y: number }[],
  ejeX: string,
  ejeY: string,
  recta?: { nombre: string; puntos: { x: number; y: number }[] },
): object {
  const datasets: object[] = [
    { type: 'scatter', label: 'Datos', data: puntos, backgroundColor: COLOR.azul, pointRadius: 5 },
  ];
  if (recta) {
    datasets.push({ type: 'line', label: recta.nombre, data: recta.puntos, borderColor: COLOR.rojo, borderWidth: 2, pointRadius: 0 });
  }
  return {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { type: 'linear', title: { display: true, text: ejeX, font: fuente } },
        y: { title: { display: true, text: ejeY, font: fuente } },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  };
}

/** Puntos de la recta ŷ = b0 + b1·x entre xMin y xMax. */
export function puntosRecta(b0: number, b1: number, xMin: number, xMax: number): { x: number; y: number }[] {
  return [
    { x: xMin, y: b0 + b1 * xMin },
    { x: xMax, y: b0 + b1 * xMax },
  ];
}
