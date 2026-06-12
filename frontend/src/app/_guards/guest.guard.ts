import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiHttpService } from '../_service/api-http.service';

type AuthStatusResponse = {
  authenticated?: boolean;
};

export const guestGuard: CanActivateFn = () => {
  const apiHttpService = inject(ApiHttpService);
  const router = inject(Router);

  return apiHttpService.get<AuthStatusResponse>('auth/status').pipe(
    map((response) => response?.authenticated ? router.createUrlTree(['/start']) : true),
    catchError(() => of(true))
  );
};
