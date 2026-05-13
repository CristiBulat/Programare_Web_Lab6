import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const settings = inject(SettingsService);
  const router = inject(Router);

  const apiBase = settings.apiUrl();
  const isApiRequest = req.url.startsWith(apiBase);

  let updated = req;
  if (isApiRequest) {
    const token = auth.token();
    if (token) {
      updated = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(updated).pipe(
    catchError((err: unknown) => {
      if (isApiRequest && err instanceof HttpErrorResponse && err.status === 401) {
        auth.signOut();
        router.navigate(['/login'], { queryParams: { reason: 'expired' } });
      }
      return throwError(() => err);
    }),
  );
};
