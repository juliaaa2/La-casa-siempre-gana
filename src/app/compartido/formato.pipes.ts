import { Pipe, PipeTransform } from '@angular/core';

const formatoPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 12500 → "$ 12.500" */
@Pipe({ name: 'pesos', standalone: true })
export class PesosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return formatoPesos.format(valor);
  }
}

/** Número con decimales fijos en formato colombiano: 0.48649 → "0,4865" */
@Pipe({ name: 'num', standalone: true })
export class NumPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 4): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    if (!Number.isFinite(valor)) return valor > 0 ? '∞' : '−∞';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  }
}

/** Proporción en porcentaje: 0.4865 → "48,65 %" */
@Pipe({ name: 'pct', standalone: true })
export class PctPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 2): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return (valor * 100).toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }) + ' %';
  }
}

/** Valor p: muy pequeño → "< 0,0001" */
@Pipe({ name: 'valorP', standalone: true })
export class ValorPPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    if (valor < 0.0001) return '< 0,0001';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
}
