import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorForm } from './sector-form';
import { Sector } from '../../models/sector';
import { SubmissionApi } from '../../data-access/submission-api';
import { of } from 'rxjs';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;

  const sectors: Sector[] = [
    {
      id: 19,
      parent_id: 1,
      name: 'Construction materials',
    },
    {
      id: 1,
      parent_id: null,
      name: 'Manufacturing',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectorForm],
      providers: [
        {
          provide: SubmissionApi,
          useValue: { getSectors: () => of(sectors) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectorForm);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the loaded sectors', () => {
    const options = fixture.nativeElement.querySelectorAll('option');

    expect(options).toHaveLength(2);
  });

  it('places child sectors after their parent', () => {
    const options = Array.from(
      fixture.nativeElement.querySelectorAll('option'),
    ) as HTMLOptionElement[];

    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Manufacturing',
      'Construction materials',
    ]);
  });

  it('shows errors when mandatory fields are empty', () => {
    const element = fixture.nativeElement as HTMLElement;
    const form = element.querySelector('form');

    form?.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Name is required.');
    expect(element.textContent).toContain('Choose at least one sector.');
    expect(element.textContent).toContain('You must agree to the terms.');
  });
});
