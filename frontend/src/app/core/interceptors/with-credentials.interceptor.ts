import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiCall = req.url.startsWith(environment.apiUrl);
  if (!isApiCall) return next(req);

  if (req.withCredentials) return next(req);

  return next(req.clone({ withCredentials: true }));
};

