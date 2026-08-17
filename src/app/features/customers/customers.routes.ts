import { Routes } from '@angular/router';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./feature-list/customer-list.component').then((m) => m.CustomerListComponent),
    title: 'Customers',
  },
];
