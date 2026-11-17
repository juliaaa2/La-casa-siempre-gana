import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

/**
 * Envoltura sencilla de Chart.js.
 * Cada vez que cambia "config" se vuelve a dibujar la gráfica.
 * La configuración se arma con las funciones de graficas.ts.
 */
@Component({
  selector: 'app-grafica',
  standalone: true,
  template: `<div class="caja" [style.height.px]="alto"><canvas #lienzo></canvas></div>`,
  styles: [`.caja { position: relative; width: 100%; }`],
})
export class GraficaComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: object;
  @Input() alto = 280;
  @ViewChild('lienzo') lienzo?: ElementRef<HTMLCanvasElement>;

  private grafica?: Chart;

  ngAfterViewInit(): void {
    this.dibujar();
  }

  ngOnChanges(): void {
    if (this.lienzo) this.dibujar();
  }

  ngOnDestroy(): void {
    this.grafica?.destroy();
  }

  private dibujar(): void {
    if (!this.lienzo) return;
    this.grafica?.destroy();
    this.grafica = new Chart(this.lienzo.nativeElement, this.config as ChartConfiguration);
  }
}
