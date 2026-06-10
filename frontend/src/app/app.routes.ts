import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./workbench.component').then((m) => m.WorkbenchComponent),
    },
    {
        path: ':repo',
        loadComponent: () =>
            import('./workbench.component').then((m) => m.WorkbenchComponent),
    },
    {
        path: ':repo/:driver',
        loadComponent: () =>
            import('./workbench.component').then((m) => m.WorkbenchComponent),
    },
    { path: '**', redirectTo: '' },
];
