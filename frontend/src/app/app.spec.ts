import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { SubmissionApi } from './data-access/submission-api';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: SubmissionApi,
          useValue: {
            getSectors: () => of([]),
            getSubmission: () => of(null),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the sector form', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-sector-form')).toBeTruthy();
  });
});
