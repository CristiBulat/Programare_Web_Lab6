import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/library/library.component').then((m) => m.LibraryComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'add',
        loadComponent: () =>
          import('./pages/add-manual/add-manual.component').then((m) => m.AddManualComponent),
      },
      {
        path: 'entry/:id',
        loadComponent: () =>
          import('./pages/detail/detail.component').then((m) => m.DetailComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
