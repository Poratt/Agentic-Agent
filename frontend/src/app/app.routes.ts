import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { MainLayout } from './features/layout/main-layout/main-layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayout,
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'users', loadComponent: () => import('./features/users/users-management').then(m => m.UsersManagement) },
      { path: 'strain-hunter', loadComponent: () => import('./features/strain-hunter/strain-hunter').then(m => m.StrainHunter) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat/chat').then(m => m.Chat) },
      { path: 'chat/history', loadComponent: () => import('./features/chat/chat-history/chat-history').then(m => m.ChatHistory) },
      { path: 'design-system', loadComponent: () => import('./features/design-system/design-system').then(m => m.DesignSystem) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings').then(m => m.Settings) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
