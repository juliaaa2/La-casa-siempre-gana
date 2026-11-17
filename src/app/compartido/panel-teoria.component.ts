import { Component, Input } from '@angular/core';
import { NumPipe, PctPipe, PesosPipe } from './formato.pipes';

/**
 * Panel "Teoría vs. Realidad": compara la probabilidad teórica con la
 * frecuencia relativa observada, y el valor esperado con la ganancia promedio real.
 */
@Component({
  selector: 'app-panel-teoria',
  standalone: true,
  imports: [NumPipe, PctPipe, PesosPipe],
  template: `
    <div class="tarjeta">
      <h3>Teoría vs. Realidad</h3>
      <p class="nota">{{ evento }}</p>
      <table class="datos">
        <tr><th class="izq"></th><th>Teoría</th><th>Realidad ({{ n }} jugadas)</th></tr>
        <tr>
          <td class="izq">Probabilidad de ganar</td>
          <td>{{ probabilidad | num: 4 }} ({{ probabilidad | pct }})</td>
          <td>{{ n ? (frecuencia | num: 4) + ' (' + (frecuencia | pct) + ')' : '—' }}</td>
        </tr>
        <tr>
          <td class="izq">Ganancia por cada $1.000 apostados</td>
          <td>E(G) = {{ valorEsperado | pesos }}</td>
          <td>{{ n ? (gananciaPromedio | pesos) : '—' }}</td>
        </tr>
        @if (desviacion !== null) {
          <tr>
            <td class="izq">Desviación por cada $1.000</td>
            <td>σ = {{ desviacion | pesos }}</td>
            <td>—</td>
          </tr>
        }
      </table>
      <p class="formula">E(G) = p · (pago · monto) − (1 − p) · monto &nbsp;&nbsp; (aquí, monto = $1.000)</p>
      <p class="nota">
        Con pocas jugadas la frecuencia puede alejarse bastante de la probabilidad. Con muchas jugadas se acerca a ella
        (ley de los grandes números).
      </p>
    </div>
  `,
})
export class PanelTeoriaComponent {
  @Input({ required: true }) evento = '';
  @Input({ required: true }) probabilidad = 0;
  @Input({ required: true }) frecuencia = 0;
  @Input({ required: true }) n = 0;
  @Input({ required: true }) valorEsperado = 0;
  @Input({ required: true }) gananciaPromedio = 0;
  @Input() desviacion: number | null = null;
}
