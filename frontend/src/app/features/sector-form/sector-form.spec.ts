import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorForm } from './sector-form';
import { Sector } from '../../models/sector';
import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { of, throwError } from 'rxjs';
import { Submission } from '../../models/submission';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;
  let submittedSubmission: Submission | undefined;
  let existingSubmission: Submission | null;
  let submissionLoadFails: boolean;
  let submissionLoadCount: number;

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
    submissionLoadFails = false;
    submissionLoadCount = 0;
    await TestBed.configureTestingModule({
      imports: [SectorForm],
      providers: [
        {
          provide: SectorSelectionApi,
          useValue: {
            getSectors: () => of(sectors),
            getSubmission: () => {
              submissionLoadCount++;

              return submissionLoadFails
                ? throwError(() => new Error('Load failed'))
                : of(existingSubmission);
            },
            saveSubmission: (submission: Submission) => {
              submittedSubmission = submission;

              return of(submission);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectorForm);
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the loaded sectors', () => {
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('option');

    expect(options).toHaveLength(2);
  });

  it('places child sectors after their parent', () => {
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('option'),
    ) as HTMLOptionElement[];

    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Manufacturing',
      'Construction materials',
    ]);
  });

  it('shows errors when mandatory fields are empty', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const form = element.querySelector('form');

    form?.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    fixture.detectChanges();

    expect(element.textContent).toContain('Your name is required.');
    expect(element.textContent).toContain('Choose at least one sector.');
    expect(element.textContent).toContain('You must agree to the terms.');
  });

  const submitWithName = (name: string): HTMLElement => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const sectorSelect = element.querySelector<HTMLSelectElement>('#sector-ids');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element.querySelector('form');

    if (!nameInput || !sectorSelect || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    sectorSelect.options[0].selected = true;
    sectorSelect.dispatchEvent(new Event('change', { bubbles: true }));

    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    fixture.detectChanges();

    return element;
  };

  it('rejects a whitespace-only name', () => {
    const element = submitWithName('   ');

    expect(submittedSubmission).toBeUndefined();
    expect(element.textContent).toContain('Your name is required.');
  });

  it('rejects a name containing digits or symbols', () => {
    const element = submitWithName('J0hn #1');

    expect(submittedSubmission).toBeUndefined();
    expect(element.textContent).toContain(
      'Name may only contain letters, spaces, hyphens and apostrophes.',
    );
  });

  it('accepts a name with accents, apostrophes and hyphens', () => {
    submitWithName("Ülo O'Brien-Kärner");

    expect(submittedSubmission?.name).toBe("Ülo O'Brien-Kärner");
  });

  it('focuses the name field when the whole form is empty', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    fixture.detectChanges();

    expect(document.activeElement).toBe(element.querySelector('#name'));
  });

  it('focuses the sector list when only the sectors are missing', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');

    if (!nameInput || !termsCheckbox) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = 'Ada Lovelace';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    fixture.detectChanges();

    expect(document.activeElement).toBe(element.querySelector('#sector-ids'));
  });

  it('marks invalid controls with aria-invalid', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#name')?.getAttribute('aria-invalid')).toBe('false');

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    fixture.detectChanges();

    expect(element.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#sector-ids')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#agreed-to-terms')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears aria-invalid once a control becomes valid', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    fixture.detectChanges();

    nameInput!.value = 'Ada Lovelace';
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.detectChanges();

    expect(nameInput?.getAttribute('aria-invalid')).toBe('false');
  });

  it('saves a valid submission', () => {
    fixture.detectChanges();

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

  it('clears the saved message when the form changes', () => {
    fixture.detectChanges();

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
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.textContent).toContain('Submission saved.');

    nameInput.value = 'Grace Hopper';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Submission saved.');
  });

  it('retries loading form data after a failure', () => {
    submissionLoadFails = true;

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const retryButton = element.querySelector<HTMLButtonElement>('button');

    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain('Could not load form data.');
    expect(retryButton?.textContent).toContain('Try again');

    submissionLoadFails = false;
    retryButton?.click();
    fixture.detectChanges();

    expect(submissionLoadCount).toBe(2);
    expect(element.querySelector('form')).toBeTruthy();
    expect(element.textContent).not.toContain('Could not load form data.');
  });

  it('refills the form from the current session submission', () => {
    existingSubmission = {
      name: 'Grace Hopper',
      sector_ids: [19],
      agreed_to_terms: true,
    };

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
