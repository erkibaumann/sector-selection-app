import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { Translations } from './translations';

/**
 * The browser sends its own Accept-Language, which says nothing about the
 * language the user picked in the switcher. Overriding it here is what makes
 * Laravel answer a 422 in the language the page is currently showing.
 */
export const languageInterceptor: HttpInterceptorFn = (request, next) => {
  const language = inject(Translations).language();

  return next(request.clone({ setHeaders: { 'Accept-Language': language } }));
};
