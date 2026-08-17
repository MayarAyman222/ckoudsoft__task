import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Attaches the Authorization bearer header to requests targeting our API.
 * Kept as a pure function (Angular 17 functional interceptor) so it is
 * trivially unit-testable and has zero DI overhead.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${environment.apiToken}`,
    },
  });

  return next(authReq);
};
