import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';


export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const detail = resolveErrorMessage(error);

      messageService.add({
        severity: 'error',
        summary: 'Request failed',
        detail,
        life: 6000,
      });

      return throwError(() => error);
    })
  );
};

function resolveErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (error.status === 401 || error.status === 403) {
    return 'Your session is not authorized to perform this action.';
  }
  if (typeof error.error === 'string' && error.error.trim().length) {
    return error.error;
  }
  if (error.error?.Message) {
    return error.error.Message as string;
  }
  return `Something went wrong (HTTP ${error.status}). Please try again.`;
}
