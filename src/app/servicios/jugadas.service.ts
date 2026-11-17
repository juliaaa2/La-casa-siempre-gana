import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Jugada } from '../core/modelos';
import { JugadorService } from './jugador.service';

const CLAVE_JUGADAS = 'casa.jugadas';
const COLECCION = 'jugadas';

export type NuevaJugada = Omit<Jugada, 'id' | 'fecha' | 'jugador' | 'saldo'>;

/**
 * Registro de todas las jugadas.
 * - Siempre se guardan en el navegador (localStorage).
 * - Si Firebase está configurado en environment.ts, también se guardan en Firestore,
 *   para analizar las jugadas de todo el grupo.
 */
@Injectable({ providedIn: 'root' })
export class JugadasService {
  private readonly jugador = inject(JugadorService);
  private readonly _jugadas = signal<Jugada[]>(leerLocales());

  readonly jugadas = this._jugadas.asReadonly();
  readonly misJugadas = computed(() => this._jugadas().filter((j) => j.jugador === this.jugador.nombre()));
  readonly usandoFirebase = Boolean(environment.firebase.apiKey && environment.firebase.projectId);
  readonly errorFirebase = signal<string>('');

  constructor() {
    if (this.usandoFirebase) void this.cargarDeFirebase();
  }

  /** Registra una jugada: actualiza el saldo y la guarda. */
  registrar(datos: NuevaJugada): Jugada {
    const saldo = this.jugador.aplicarGanancia(datos.ganancia);
    const jugada: Jugada = {
      ...datos,
      id: nuevoId(),
      jugador: this.jugador.nombre(),
      saldo,
      fecha: new Date().toISOString(),
    };
    this._jugadas.update((lista) => [...lista, jugada]);
    this.guardarLocales();
    if (this.usandoFirebase) void this.subirAFirebase(jugada);
    return jugada;
  }

  /** Vuelve a leer las jugadas de Firebase (para ver las del resto del grupo). */
  async recargar(): Promise<void> {
    if (this.usandoFirebase) await this.cargarDeFirebase();
  }

  borrarMisJugadas(): void {
    const nombre = this.jugador.nombre();
    this._jugadas.update((lista) => lista.filter((j) => j.jugador !== nombre));
    this.guardarLocales();
  }

  /** Exporta todas las jugadas a CSV (separado por punto y coma, para abrir en Excel en español). */
  exportarCsv(): string {
    const columnas: (keyof Jugada)[] = ['fecha', 'jugador', 'juego', 'apuesta', 'monto', 'resultado', 'gano', 'ganancia', 'saldo', 'dado1', 'dado2', 'numero', 'probabilidad'];
    const filas = this._jugadas().map((j) =>
      columnas
        .map((c) => {
          const v = j[c];
          if (v === undefined || v === null) return '';
          if (typeof v === 'boolean') return v ? 'si' : 'no';
          if (typeof v === 'number') return String(v).replace('.', ',');
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(';'),
    );
    return [columnas.join(';'), ...filas].join('\n');
  }

  private guardarLocales(): void {
    try {
      localStorage.setItem(CLAVE_JUGADAS, JSON.stringify(this._jugadas()));
    } catch {
      // Si el almacenamiento se llena, la app sigue funcionando con lo que hay en memoria.
    }
  }

  private async baseDeDatos() {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const app = getApps().length ? getApps()[0] : initializeApp(environment.firebase);
    return getFirestore(app);
  }

  private async cargarDeFirebase(): Promise<void> {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const db = await this.baseDeDatos();
      const resultado = await getDocs(collection(db, COLECCION));
      const remotas = resultado.docs.map((d) => d.data() as unknown as Jugada);
      // Une las jugadas remotas con las locales sin repetir (por id)
      const porId = new Map<string, Jugada>();
      for (const j of [...remotas, ...this._jugadas()]) porId.set(j.id, j);
      this._jugadas.set([...porId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      this.guardarLocales();
      this.errorFirebase.set('');
    } catch (e) {
      this.errorFirebase.set('No se pudieron leer las jugadas de Firebase: ' + String(e));
    }
  }

  private async subirAFirebase(j: Jugada): Promise<void> {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const db = await this.baseDeDatos();
      // Firestore no acepta campos undefined
      const limpia = Object.fromEntries(Object.entries(j).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, COLECCION, j.id), limpia);
    } catch (e) {
      this.errorFirebase.set('No se pudo guardar la jugada en Firebase: ' + String(e));
    }
  }
}

function leerLocales(): Jugada[] {
  try {
    const texto = localStorage.getItem(CLAVE_JUGADAS);
    const datos = texto ? JSON.parse(texto) : [];
    return Array.isArray(datos) ? (datos as Jugada[]) : [];
  } catch {
    return [];
  }
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
