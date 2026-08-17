import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';


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
