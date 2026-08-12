import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { Dictionary, Language, LANGUAGES, Translations } from '../../i18n/translations';
import { Sector } from '../../models/sector';
import { Submission } from '../../models/submission';
import { SectorTreeSelector } from '../sector-tree-selector/sector-tree-selector';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

interface ValidationErrorResponse {
  errors?: Record<string, unknown>;
}

/**
 * Client-side fallbacks, keyed by the validator that produced them. The values
 * name a message rather than holding one, so switching language re-renders
 * errors that are already on screen.
 */
const ERROR_KEYS: Record<keyof Submission, Record<string, keyof Dictionary['errors']>> = {
  name: {
    required: 'nameRequired',
    maxlength: 'nameMaxLength',
  },
  sector_ids: { required: 'sectorsRequired' },
  agreed_to_terms: { required: 'termsRequired' },
};

function nonBlankName(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

function isSubmissionField(field: string): field is keyof Submission {
  return field === 'name' || field === 'sector_ids' || field === 'agreed_to_terms';
}

@Component({
  selector: 'app-sector-form',
  imports: [ReactiveFormsModule, SectorTreeSelector],
  templateUrl: './sector-form.html',
  styleUrl: './sector-form.css',
})
export class SectorForm implements OnInit {
  private readonly sectorSelectionApi = inject(SectorSelectionApi);
  private readonly injector = inject(Injector);
  private readonly translations = inject(Translations);

  protected readonly t = this.translations.t;
  protected readonly language = this.translations.language;
  protected readonly languages = LANGUAGES;

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly sectorSelector = viewChild(SectorTreeSelector);
  private readonly termsCheckbox = viewChild<ElementRef<HTMLInputElement>>('termsCheckbox');

  /** A submission was already stored when this page loaded. */
  protected readonly restoredSubmission = signal(false);
  /** A submission exists at all, whether restored or saved just now. */
  protected readonly storedSubmission = signal(false);
  protected readonly submitFailed = signal(false);
  protected readonly sectors = signal<Sector[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly saveError = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankName, Validators.maxLength(255)],
    }),
    sector_ids: new FormControl<number[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),
    agreed_to_terms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.saved.set(false);
    });

    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      sectors: this.sectorSelectionApi.getSectors(),
      submission: this.sectorSelectionApi.getSubmission(),
    }).subscribe({
      next: ({ sectors, submission }) => {
        this.sectors.set(sectors);

        if (submission !== null) {
          this.form.reset({
            ...submission,
            sector_ids: this.selectableSectorIds(submission.sector_ids, sectors),
          });
          this.restoredSubmission.set(true);
          this.storedSubmission.set(true);
        }

        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  protected onSubmit(): void {
    // The save button is marked aria-disabled rather than disabled, because
    // disabling the element the user just activated throws focus to the body.
    // This guard is what actually stops a second submit while one is in flight.
    if (this.saving()) {
      return;
    }

    const nameControl = this.form.controls.name;

    nameControl.setValue(nameControl.value.trim());
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.submitFailed.set(true);
      this.focusFirstInvalidControl();

      return;
    }

    this.submitFailed.set(false);
    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(false);

    this.sectorSelectionApi.saveSubmission(this.form.getRawValue()).subscribe({
      next: (submission) => {
        this.form.reset(submission);
        this.saved.set(true);
        this.storedSubmission.set(true);
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);

        if (this.applyValidationErrors(error)) {
          this.submitFailed.set(true);
          this.focusFirstInvalidControl();
        } else {
          this.saveError.set(true);
        }
      },
    });
  }

  protected changeLanguage(code: string): void {
    this.language.set(code as Language);
  }

  protected onSectorIdsChange(selectedIds: number[]): void {
    const sectorControl = this.form.controls.sector_ids;

    sectorControl.setValue(selectedIds);
    sectorControl.markAsDirty();
    sectorControl.markAsTouched();
  }

  protected hasErrors(): boolean {
    return (
      this.errorMessages('name').length > 0 ||
      this.errorMessages('sector_ids').length > 0 ||
      this.errorMessages('agreed_to_terms').length > 0
    );
  }

  /**
   * The single source of what a field is currently complaining about. Server
   * messages win when present; otherwise the validator fallbacks apply.
   */
  protected errorMessages(field: keyof Submission): string[] {
    const control = this.form.controls[field];

    if (!control.touched || control.valid) {
      return [];
    }

    return (
      this.serverErrors(control) ??
      Object.entries(ERROR_KEYS[field])
        .filter(([validator]) => control.hasError(validator))
        .map(([, key]) => this.t().errors[key])
    );
  }

  private serverErrors(control: AbstractControl): string[] | null {
    const errors: unknown = control.getError('server');

    return Array.isArray(errors) ? errors : null;
  }

  private applyValidationErrors(error: HttpErrorResponse): boolean {
    if (error.status !== 422) {
      return false;
    }

    const response = error.error as ValidationErrorResponse | null;
    let applied = false;

    for (const [errorKey, messages] of Object.entries(response?.errors ?? {})) {
      const field = errorKey.split('.')[0];

      if (!isSubmissionField(field) || !Array.isArray(messages)) {
        continue;
      }

      const control = this.form.controls[field];
      const existingMessages = this.serverErrors(control) ?? [];
      const fieldMessages = messages.filter(
        (message): message is string => typeof message === 'string',
      );

      if (fieldMessages.length === 0) {
        continue;
      }

      control.setErrors({
        ...control.errors,
        server: [...existingMessages, ...fieldMessages],
      });
      control.markAsTouched();
      applied = true;
    }

    return applied;
  }

  /**
   * Deferred until after the render that adds the error text and its
   * aria-describedby link, so the description exists when focus lands on the
   * control and is announced with it.
   */
  private focusFirstInvalidControl(): void {
    afterNextRender(
      () => {
        const controls = this.form.controls;

        if (controls.name.invalid) {
          this.nameInput()?.nativeElement.focus();
        } else if (controls.sector_ids.invalid) {
          this.sectorSelector()?.focus();
        } else if (controls.agreed_to_terms.invalid) {
          this.termsCheckbox()?.nativeElement.focus();
        }
      },
      { injector: this.injector },
    );
  }

  private selectableSectorIds(
    selectedIds: readonly number[],
    sectors: readonly Sector[],
  ): number[] {
    const parentIds = new Set(sectors.map((sector) => sector.parent_id));
    const leafIds = new Set(
      sectors.filter((sector) => !parentIds.has(sector.id)).map((sector) => sector.id),
    );

    return [...new Set(selectedIds)].filter((id) => leafIds.has(id));
  }
}
