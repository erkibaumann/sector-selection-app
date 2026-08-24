import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { Translations } from './translations';

export const languageInterceptor: HttpInterceptorFn = (request, next) => {
  const language = inject(Translations).language();

  return next(request.clone({ setHeaders: { 'Accept-Language': language } }));
};
