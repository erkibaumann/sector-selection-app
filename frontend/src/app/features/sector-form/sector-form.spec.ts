import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorForm } from './sector-form';
import { Sector } from '../../models/sector';
import { SubmissionApi } from '../../data-access/submission-api';
import { of } from 'rxjs';
import { Submission } from '../../models/submission';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;
  let submittedSubmission: Submission | undefined;
  let existingSubmission: Submission | null;

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
    submittedSubmission = undefined;
    existingSubmission = null;
    await TestBed.configureTestingModule({
      imports: [SectorForm],
      providers: [
        {
          provide: SubmissionApi,
          useValue: {
            getSectors: () => of(sectors),
            getSubmission: () => of(existingSubmission),
            saveSubmission: (submission: Submission) => {
              submittedSubmission = submission;

              return of(submission);
            },
          },
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

  it('saves a valid submission', () => {
    const element = fixture.nativeElement as HTMLElement;

    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const sectorSelect = element.querySelector<HTMLSelectElement>('#sector-ids');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element.querySelector('form');

    if (!nameInput || !sectorSelect || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = 'Ada Lovelace';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    sectorSelect.options[0].selected = true;
    sectorSelect.dispatchEvent(new Event('change', { bubbles: true }));

    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    fixture.detectChanges();

    expect(submittedSubmission).toEqual({
      name: 'Ada Lovelace',
      sector_ids: [1],
      agreed_to_terms: true,
    });

    expect(element.textContent).toContain('Submission saved.');
  });

  it('refills the form from the current session submission', () => {
    existingSubmission = {
      name: 'Grace Hopper',
      sector_ids: [19],
      agreed_to_terms: true,
    };

    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const sectorSelect = element.querySelector<HTMLSelectElement>('#sector-ids');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');

    expect(nameInput?.value).toBe('Grace Hopper');
    expect(termsCheckbox?.checked).toBe(true);

    const selectedSectors = Array.from(sectorSelect?.selectedOptions ?? []).map((option) =>
      option.textContent?.trim(),
    );

    expect(selectedSectors).toEqual(['Construction materials']);
  });
});
