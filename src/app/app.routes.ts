import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { JugadorService } from './servicios/jugador.service';

/** Solo deja entrar a los juegos si el jugador ya escribió su nombre. */
const requiereJugador = () => {
  const jugador = inject(JugadorService);
  return jugador.nombre() ? true : inject(Router).createUrlTree(['/']);
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./paginas/inicio/inicio.component').then((m) => m.InicioComponent), title: 'La casa siempre gana' },
  { path: 'dados', canActivate: [requiereJugador], loadComponent: () => import('./paginas/dados/dados.component').then((m) => m.DadosComponent), title: 'Dados' },
  { path: 'ruleta', canActivate: [requiereJugador], loadComponent: () => import('./paginas/ruleta/ruleta.component').then((m) => m.RuletaComponent), title: 'Ruleta' },
  { path: 'estadisticas', loadComponent: () => import('./paginas/estadisticas/estadisticas.component').then((m) => m.EstadisticasComponent), title: 'Estadísticas' },
  { path: '**', redirectTo: '' },
];
