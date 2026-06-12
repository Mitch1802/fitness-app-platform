import { Routes } from '@angular/router';
import { authGuard } from './_guards/auth.guard';
import { guestGuard } from './_guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'plaene',
        loadComponent: () => import('./trainingsplan/list/trainingsplan-list.component').then(m => m.TrainingsplanListComponent),
      },
      {
        path: 'plaene/:id',
        loadComponent: () => import('./trainingsplan/detail/trainingsplan-detail.component').then(m => m.TrainingsplanDetailComponent),
      },
      {
        path: 'session',
        loadComponent: () => import('./training-session/training-session.component').then(m => m.TrainingSessionComponent),
      },
      {
        path: 'session/:id',
        loadComponent: () => import('./training-session/training-session.component').then(m => m.TrainingSessionComponent),
      },
      {
        path: 'statistik',
        loadComponent: () => import('./statistik/statistik.component').then(m => m.StatistikComponent),
      },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
