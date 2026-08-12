import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { SectorSelectionApi } from './data-access/sector-selection-api';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: SectorSelectionApi,
          useValue: {
            getSectors: () => of([]),
            getSubmission: () => of(null),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the sector form', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-sector-form')).toBeTruthy();
  });
});
