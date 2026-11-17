import { Injectable, signal } from '@angular/core';
import { SALDO_INICIAL } from '../core/modelos';

const CLAVE_NOMBRE = 'casa.jugador';
const CLAVE_SALDO = 'casa.saldo';

/** Guarda el nombre del jugador y su saldo ficticio en el navegador. */
@Injectable({ providedIn: 'root' })
export class JugadorService {
  readonly nombre = signal<string>(localStorage.getItem(CLAVE_NOMBRE) ?? '');
  readonly saldo = signal<number>(leerSaldo());

  entrar(nombre: string): void {
    const limpio = nombre.trim();
    if (!limpio) return;
    if (limpio !== this.nombre()) {
      // Un jugador nuevo empieza con el saldo inicial
      this.fijarSaldo(SALDO_INICIAL);
    }
    this.nombre.set(limpio);
    localStorage.setItem(CLAVE_NOMBRE, limpio);
  }

  salir(): void {
    this.nombre.set('');
    localStorage.removeItem(CLAVE_NOMBRE);
  }

  /** Suma la ganancia (o resta la pérdida) y devuelve el nuevo saldo. */
  aplicarGanancia(ganancia: number): number {
    const nuevo = Math.round((this.saldo() + ganancia) * 100) / 100;
    this.fijarSaldo(nuevo);
    return nuevo;
  }

  reiniciarSaldo(): void {
    this.fijarSaldo(SALDO_INICIAL);
  }

  private fijarSaldo(valor: number): void {
    this.saldo.set(valor);
    localStorage.setItem(CLAVE_SALDO, String(valor));
  }
}

function leerSaldo(): number {
  const v = Number(localStorage.getItem(CLAVE_SALDO));
  return Number.isFinite(v) && localStorage.getItem(CLAVE_SALDO) !== null ? v : SALDO_INICIAL;
}
