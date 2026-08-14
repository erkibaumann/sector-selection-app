import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { languageInterceptor } from './language-interceptor';
import { Translations } from './translations';

describe('Translations', () => {
  let translations: Translations;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([languageInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    translations = TestBed.inject(Translations);
  });

  it('switches strings, plurals, and the document language together', () => {
    TestBed.tick();

    expect(translations.language()).toBe('en');
    expect(translations.t().form.save).toBe('Save');
    expect(translations.t().selector.legend).toBe('Sectors');
    expect(translations.t().selector.selectedCount(1)).toBe('1 sector selected');
    expect(translations.t().selector.selectedCount(3)).toBe('3 sectors selected');
    expect(document.documentElement.lang).toBe('en');

    translations.language.set('et');
    TestBed.tick();

    expect(translations.t().form.save).toBe('Salvesta');
    expect(translations.t().selector.legend).toBe('Sektorid');
    expect(translations.t().selector.selectedCount(1)).toBe('1 sektor valitud');
    expect(translations.t().selector.selectedCount(3)).toBe('3 sektorit valitud');
    expect(document.documentElement.lang).toBe('et');
  });

  it('asks the API for the language the page is showing', () => {
    const http = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    translations.language.set('et');
    http.get('/api/sectors').subscribe();

    expect(httpTesting.expectOne('/api/sectors').request.headers.get('Accept-Language')).toBe('et');
    httpTesting.verify();
  });
});
