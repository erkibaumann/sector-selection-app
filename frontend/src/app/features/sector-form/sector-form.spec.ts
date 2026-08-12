import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { SectorForm } from './sector-form';
import { Sector } from '../../models/sector';
import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { of, Subject, throwError } from 'rxjs';
import { Submission } from '../../models/submission';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;
  let submittedSubmission: Submission | undefined;
  let existingSubmission: Submission | null;
  let submissionLoadFails: boolean;
  let submissionLoadCount: number;
  let submissionSaveCount: number;
  let submissionSaveError: unknown;
  let deferredSubmissionLoad: Subject<Submission | null> | undefined;
  let deferredSave: Subject<Submission> | undefined;

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
    submissionSaveCount = 0;
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
              submittedSubmission = submission;
              submissionSaveCount++;

              if (submissionSaveError !== undefined) {
                return throwError(() => submissionSaveError);
              }

              return deferredSave ?? of(submission);
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

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Manufacturing');
    expect(element.querySelector('#sector-checkbox-1')).toBeNull();
  });

  it('shows the loading state until all form data has loaded', () => {
    deferredSubmissionLoad = new Subject<Submission | null>();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('section');
    const loadingStatus = element.querySelector('[role="status"]');

    expect(element.textContent).toContain('Loading sectors, please wait.');
    expect(card?.getAttribute('aria-busy')).toBe('true');
    expect(loadingStatus?.textContent).toContain('Loading sectors, please wait.');
    expect(element.querySelector('form')).toBeNull();

    deferredSubmissionLoad.next(null);
    deferredSubmissionLoad.complete();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Loading sectors, please wait.');
    expect(card?.getAttribute('aria-busy')).toBe('false');
    expect(element.querySelector('form')).toBeTruthy();
  });

  it('places child sectors after their parent', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const expandManufacturing = element.querySelector<HTMLButtonElement>(
      'button[aria-controls="sector-children-1"]',
    );

    expandManufacturing?.click();
    fixture.detectChanges();

    const sectorNames = Array.from(element.querySelectorAll('.sector-node-name')).map((name) =>
      name.textContent?.trim(),
    );

    expect(sectorNames).toEqual(['Manufacturing', 'Construction materials']);
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
    expect(element.textContent).toContain('Please agree to the terms to continue.');
  });

  const selectSector = (element: HTMLElement): void => {
    const expandManufacturing = element.querySelector<HTMLButtonElement>(
      'button[aria-controls="sector-children-1"]',
    );

    expandManufacturing?.click();
    fixture.detectChanges();

    const sectorCheckbox = element.querySelector<HTMLInputElement>('#sector-checkbox-19');

    if (!sectorCheckbox) {
      throw new Error('Expected the selectable sector checkbox to be rendered.');
    }

    sectorCheckbox.click();
    fixture.detectChanges();
  };

  const submitWithName = (name: string): HTMLElement => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element.querySelector('form');

    if (!nameInput || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    selectSector(element);

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

  it.each(["Ülo O'Brien-Kärner", "'t Hooft", '李雷', 'X Æ A-12'])(
    'accepts %s as a name',
    (name) => {
      submitWithName(name);

      expect(submittedSubmission?.name).toBe(name);
    },
  );

  it('trims the name before saving', () => {
    submitWithName('  Ada Lovelace  ');

    expect(submittedSubmission?.name).toBe('Ada Lovelace');
  });

  it('rejects a name longer than 255 characters', () => {
    const element = submitWithName('A'.repeat(256));

    // maxlength stops typing and pasting; the validator mirrors the backend
    // rule for any value that reaches the control by another route.
    expect(element.querySelector('#name')?.getAttribute('maxlength')).toBe('255');
    expect(submittedSubmission).toBeUndefined();
    expect(element.textContent).toContain('Name must not exceed 255 characters.');
  });

  it('announces a failed submit once, above the fields', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="alert"]')).toBeNull();

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const summary = element.querySelector('form [role="alert"]');

    expect(summary?.textContent).toContain('Please correct the highlighted fields.');
    // One assertive region, not one per field.
    expect(element.querySelectorAll('form [role="alert"]').length).toBe(1);
  });

  it('drops the summary once the fields are corrected', () => {
    submitWithName('Ada Lovelace');

    const element = fixture.nativeElement as HTMLElement;

    expect(submittedSubmission).toBeDefined();
    expect(element.querySelector('form [role="alert"]')).toBeNull();
  });

  it('says Update once a submission exists, without needing a reload', async () => {
    const element = submitWithName('Ada Lovelace');

    await fixture.whenStable();

    expect(element.querySelector('.save-button')?.textContent?.trim()).toBe('Update');
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

    expect(document.activeElement).toBe(element.querySelector('#sector-filter'));
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
    expect(
      element.querySelector('app-sector-tree-selector fieldset')?.getAttribute('aria-invalid'),
    ).toBe('true');
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

  it('only references descriptions that exist in the DOM', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const controls = ['#name', 'app-sector-tree-selector fieldset', '#agreed-to-terms'];
    const expectReferencesToResolve = (): void => {
      for (const selector of controls) {
        const describedBy = element.querySelector(selector)?.getAttribute('aria-describedby');

        for (const id of describedBy?.split(/\s+/).filter(Boolean) ?? []) {
          expect(element.querySelector(`#${id}`)).not.toBeNull();
        }
      }
    };

    expect(element.querySelector('#name')?.getAttribute('aria-describedby')).toBeNull();
    expect(
      element.querySelector('app-sector-tree-selector fieldset')?.getAttribute('aria-describedby'),
    ).toBe('sector-help');
    expect(element.querySelector('#agreed-to-terms')?.getAttribute('aria-describedby')).toBeNull();
    expectReferencesToResolve();

    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelector('#name')?.getAttribute('aria-describedby')).toBe('name-error');
    expect(
      element.querySelector('app-sector-tree-selector fieldset')?.getAttribute('aria-describedby'),
    ).toBe('sector-help sector-error');
    expect(element.querySelector('#agreed-to-terms')?.getAttribute('aria-describedby')).toBe(
      'terms-error',
    );
    // Not assertive live regions: focus moves to the first invalid control and
    // aria-describedby carries the message, so three alerts would only compete.
    expect(element.querySelector('#name-error')?.getAttribute('role')).toBeNull();
    expect(element.querySelector('#sector-error')?.getAttribute('role')).toBeNull();
    expect(element.querySelector('#terms-error')?.getAttribute('role')).toBeNull();
    expectReferencesToResolve();
  });

  it('saves a valid submission', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element.querySelector('form');

    if (!nameInput || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = 'Ada Lovelace';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    selectSector(element);

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
      sector_ids: [19],
      agreed_to_terms: true,
    });

    expect(element.textContent).toContain('Submission saved.');
  });

  it('shows the saving state until the request completes', () => {
    deferredSave = new Subject<Submission>();

    const element = submitWithName('Ada Lovelace');
    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]');

    // Nothing is truly disabled: the fields stay editable because a request
    // resolving in milliseconds is not a window a user can type into, and the
    // button stays focusable so activating it does not throw focus to the body.
    expect(submitButton?.getAttribute('aria-disabled')).toBe('true');
    expect(submitButton?.disabled).toBe(false);
    expect(element.querySelector<HTMLInputElement>('#name')?.disabled).toBe(false);
    expect(element.textContent).toContain('Saving...');
    expect(element.textContent).toContain('Saving submission.');

    deferredSave.next(submittedSubmission!);
    deferredSave.complete();
    fixture.detectChanges();

    expect(submitButton?.getAttribute('aria-disabled')).toBe('false');
    expect(element.textContent).not.toContain('Saving submission.');
    expect(element.textContent).toContain('Submission saved.');
  });

  it('shows a save error and clears it after a successful retry', () => {
    submissionSaveError = new Error('Save failed');

    const element = submitWithName('Ada Lovelace');
    const submitButton = element.querySelector<HTMLButtonElement>('button[type="submit"]');
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const form = element.querySelector('form');

    expect(element.textContent).toContain('The submission could not be saved.');
    expect(submitButton?.getAttribute('aria-disabled')).toBe('false');
    expect(nameInput?.value).toBe('Ada Lovelace');

    submissionSaveError = undefined;
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.textContent).not.toContain('The submission could not be saved.');
    expect(element.textContent).toContain('Submission saved.');
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

    const element = submitWithName('Ada Lovelace');

    expect(element.textContent).toContain('The name is not available.');
    expect(element.textContent).toContain('The selected sector is no longer available.');
    expect(element.textContent).not.toContain('The submission could not be saved.');
    expect(element.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(
      element.querySelector('app-sector-tree-selector fieldset')?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(document.activeElement).toBe(element.querySelector('#name'));
  });

  it('clears a server validation error when its field changes', () => {
    submissionSaveError = new HttpErrorResponse({
      status: 422,
      error: { errors: { name: ['The name is not available.'] } },
    });

    const element = submitWithName('Ada Lovelace');
    const nameInput = element.querySelector<HTMLInputElement>('#name');

    nameInput!.value = 'Grace Hopper';
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(element.textContent).not.toContain('The name is not available.');
    expect(nameInput?.getAttribute('aria-invalid')).toBe('false');
  });

  it('clears the saved message when the form changes', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nameInput = element.querySelector<HTMLInputElement>('#name');
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');
    const form = element.querySelector('form');

    if (!nameInput || !termsCheckbox || !form) {
      throw new Error('Expected form controls were not rendered.');
    }

    nameInput.value = 'Ada Lovelace';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    selectSector(element);
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
    const termsCheckbox = element.querySelector<HTMLInputElement>('#agreed-to-terms');

    expect(nameInput?.value).toBe('Grace Hopper');
    expect(termsCheckbox?.checked).toBe(true);

    expect(element.querySelector('#selected-sectors-label')?.textContent).toContain(
      '1 sector selected',
    );
    expect(element.querySelector('.selected-sector-parent')?.textContent).toContain(
      'Manufacturing',
    );
    expect(element.querySelector('.selected-sector-name')?.textContent).toContain(
      'Construction materials',
    );
    // The checkbox is reachable without expanding anything by hand.
    expect(element.querySelector<HTMLInputElement>('#sector-checkbox-19')?.checked).toBe(true);
  });

  it('tells a returning user they are editing an existing submission', () => {
    existingSubmission = {
      name: 'Grace Hopper',
      sector_ids: [19],
      agreed_to_terms: true,
    };

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('You saved this form earlier in this session.');
    expect(element.querySelector('.save-button')?.textContent?.trim()).toBe('Update');
  });

  it('says Save, not Update, when there is nothing stored yet', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('You saved this form earlier');
    expect(element.querySelector('.save-button')?.textContent?.trim()).toBe('Save');
  });

  it('ignores a second submit while the first is still in flight', () => {
    deferredSave = new Subject<Submission>();

    const element = submitWithName('Ada Lovelace');

    expect(submissionSaveCount).toBe(1);

    // The button is only aria-disabled, so a second activation still reaches
    // the handler and the in-flight guard is what has to stop it.
    element.querySelector<HTMLButtonElement>('.save-button')?.click();
    fixture.detectChanges();

    expect(submissionSaveCount).toBe(1);
  });

  it('keeps focus on the save button across a save', async () => {
    deferredSave = new Subject<Submission>();

    const element = submitWithName('Ada Lovelace');
    const saveButton = element.querySelector<HTMLButtonElement>('.save-button');

    saveButton?.focus();
    deferredSave.next(submittedSubmission!);
    deferredSave.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    // Nothing around the button is disabled mid-flight, so focus never escapes
    // to the body and there is no focus to restore afterwards.
    expect(document.activeElement).toBe(saveButton);
  });

  it('drops stale category ids while refilling so the next save removes them', () => {
    existingSubmission = {
      name: 'Grace Hopper',
      sector_ids: [1, 19],
      agreed_to_terms: true,
    };

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(submittedSubmission?.sector_ids).toEqual([19]);
    expect(element.querySelector('#sector-checkbox-1')).toBeNull();
  });
});
