import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { Sector } from '../../models/sector';
import { Submission } from '../../models/submission';
import { SectorForm } from './sector-form';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;
  let submittedSubmission: Submission | undefined;
  let submissionSaveCount: number;
  let existingSubmission: Submission | null;
  let submissionLoadFails: boolean;
  let submissionLoadCount: number;
  let submissionSaveError: unknown;
  let deferredSubmissionLoad: Subject<Submission | null> | undefined;
  let deferredSave: Subject<Submission> | undefined;

  const sectors: Sector[] = [
    { id: 19, parent_id: 1, name: 'Construction materials' },
    { id: 1, parent_id: null, name: 'Manufacturing' },
    { id: 18, parent_id: 1, name: 'Electronics and Optics' },
    { id: 33, parent_id: 3, name: 'Environment' },
    { id: 37, parent_id: 3, name: 'Creative industries' },
    { id: 3, parent_id: null, name: 'Other' },
    { id: 141, parent_id: 2, name: 'Translation services' },
    { id: 22, parent_id: 2, name: 'Tourism' },
    { id: 2, parent_id: null, name: 'Service' },
  ];

  beforeEach(async () => {
    submittedSubmission = undefined;
    submissionSaveCount = 0;
    existingSubmission = null;
    submissionLoadFails = false;
    submissionLoadCount = 0;
    submissionSaveError = undefined;
    deferredSubmissionLoad = undefined;
    deferredSave = undefined;

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
                : (deferredSubmissionLoad ?? of(existingSubmission));
            },
            saveSubmission: (submission: Submission) => {
              submissionSaveCount++;
              submittedSubmission = submission;

              return submissionSaveError === undefined
                ? (deferredSave ?? of(submission))
                : throwError(() => submissionSaveError);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectorForm);
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const selectSector = (sectorId: number): void => {
    const checkbox = element().querySelector<HTMLInputElement>(`#sector-checkbox-${sectorId}`);

    if (!checkbox) {
      throw new Error('Expected the selectable sector checkbox to be rendered.');
    }

    checkbox.click();
    fixture.detectChanges();
  };

  const submitWithName = (name: string, sectorId: number): HTMLElement => {
    fixture.detectChanges();

    const nameInput = element().querySelector<HTMLInputElement>('#name');
    const termsCheckbox = element().querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element().querySelector('form');

    if (!nameInput || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    selectSector(sectorId);
    termsCheckbox.click();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    return element();
  };

  it('shows loading state and refills an existing session submission', () => {
    deferredSubmissionLoad = new Subject<Submission | null>();
    fixture.detectChanges();

    expect(element().textContent).toContain('Loading sectors, please wait.');
    expect(element().querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(element().querySelector('form')).toBeNull();

    deferredSubmissionLoad.next({
      name: 'Mari Tamm',
      sector_ids: [141],
      agreed_to_terms: true,
    });
    deferredSubmissionLoad.complete();
    fixture.detectChanges();

    expect(element().querySelector<HTMLInputElement>('#name')?.value).toBe('Mari Tamm');
    expect(element().querySelector<HTMLInputElement>('#agreed-to-terms')?.checked).toBe(true);
    expect(element().querySelector('.selected-sector-name')?.textContent).toContain(
      'Translation services',
    );
    expect(element().textContent).toContain('You saved this form earlier in this session.');
    expect(element().querySelector('.save-button')?.textContent?.trim()).toBe('Update');
  });

  it('shows mandatory errors and focuses the first invalid field', () => {
    fixture.detectChanges();

    const nameInput = element().querySelector<HTMLInputElement>('#name');

    if (!nameInput) {
      throw new Error('Expected the name input.');
    }

    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    element()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(submittedSubmission).toBeUndefined();
    expect(element().textContent).toContain('Your name is required.');
    expect(element().textContent).toContain('Choose at least one sector.');
    expect(element().textContent).toContain('Please agree to the terms to continue.');
    expect(element().textContent).toContain('Please correct the highlighted fields.');
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(nameInput);
  });

  it('saves a trimmed submission and switches to Update', () => {
    const view = submitWithName('  Katrin Saar  ', 18);

    expect(submittedSubmission).toEqual({
      name: 'Katrin Saar',
      sector_ids: [18],
      agreed_to_terms: true,
    });
    expect(view.textContent).toContain('Submission saved.');
    expect(view.querySelector('.save-button')?.textContent?.trim()).toBe('Update');
  });

  it('keeps the save control focusable while preventing duplicate requests', () => {
    deferredSave = new Subject<Submission>();

    const view = submitWithName('Jaan Kask', 22);
    const submitButton = view.querySelector<HTMLButtonElement>('button[type="submit"]');
    const form = view.querySelector('form');

    expect(submitButton?.getAttribute('aria-disabled')).toBe('true');
    expect(submitButton?.disabled).toBe(false);
    expect(view.textContent).toContain('Saving...');
    expect(view.textContent).toContain('Saving submission.');

    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(submissionSaveCount).toBe(1);

    deferredSave.next(submittedSubmission!);
    deferredSave.complete();
    fixture.detectChanges();

    expect(submitButton?.getAttribute('aria-disabled')).toBeNull();
    expect(view.textContent).toContain('Submission saved.');
  });

  it('retries loading form data after a failure', () => {
    submissionLoadFails = true;
    fixture.detectChanges();

    const retryButton = element().querySelector<HTMLButtonElement>('button');

    expect(element().querySelector('form')).toBeNull();
    expect(element().textContent).toContain('Could not load form data.');

    submissionLoadFails = false;
    retryButton?.click();
    fixture.detectChanges();

    expect(submissionLoadCount).toBe(2);
    expect(element().querySelector('form')).toBeTruthy();
  });

  it('shows a generic save failure without clearing the form', () => {
    submissionSaveError = new Error('Save failed');

    const view = submitWithName('Katrin Saar', 33);

    expect(view.textContent).toContain('The submission could not be saved.');
    expect(view.querySelector<HTMLInputElement>('#name')?.value).toBe('Katrin Saar');
    expect(view.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('shows server validation errors on their matching controls', () => {
    submissionSaveError = new HttpErrorResponse({
      status: 422,
      error: {
        errors: {
          name: ['The name is not available.'],
          'sector_ids.0': ['The selected sector is no longer available.'],
        },
      },
    });

    const view = submitWithName('Mari Tamm', 37);

    expect(view.textContent).toContain('The name is not available.');
    expect(view.textContent).toContain('The selected sector is no longer available.');
    expect(view.textContent).not.toContain('The submission could not be saved.');
    expect(view.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(view.querySelector('#name'));
  });
});
