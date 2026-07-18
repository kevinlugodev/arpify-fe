import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/shell/shell/shell'),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard') },
      { path: 'teams', loadComponent: () => import('./features/teams/pages/team-list/team-list') },
      { path: 'teams/new', loadComponent: () => import('./features/teams/pages/team-form/team-form') },
      { path: 'teams/:id', loadComponent: () => import('./features/teams/pages/team-detail/team-detail') },
      { path: 'teams/:id/edit', loadComponent: () => import('./features/teams/pages/team-form/team-form') },
      { path: 'organizacion', loadComponent: () => import('./features/master-data/pages/master-data/master-data') },
      { path: 'mass-emails', loadComponent: () => import('./features/mass-emails/pages/mass-emails/mass-emails') },
      { path: 'audit', loadComponent: () => import('./features/audit/pages/audit/audit') },
      { path: 'me', loadComponent: () => import('./features/me/pages/profile/profile') },
      { path: 'me/audit-logs', loadComponent: () => import('./features/me/pages/audit-logs/audit-logs') },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./features/auth/components/auth-layout/auth-layout'),
    children: [
      { path: 'signin', loadComponent: () => import('./features/auth/pages/sign-in/sign-in') },
      { path: 'recover-password', loadComponent: () => import('./features/auth/pages/recover-password/recover-password') },
    ],
  },
  { path: '**', redirectTo: '/' },
];
