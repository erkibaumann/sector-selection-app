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

/** Client-side fallbacks, keyed by the validator that produced them. */
const ERROR_MESSAGES: Record<keyof Submission, Record<string, string>> = {
  name: {
    required: 'Your name is required.',
    maxlength: 'Name must not exceed 255 characters.',
  },
  sector_ids: { required: 'Choose at least one sector.' },
  agreed_to_terms: { required: 'Please agree to the terms to continue.' },
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

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly sectorSelector = viewChild(SectorTreeSelector);
  private readonly termsCheckbox = viewChild<ElementRef<HTMLInputElement>>('termsCheckbox');
  private readonly saveButton = viewChild<ElementRef<HTMLButtonElement>>('saveButton');

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
    const nameControl = this.form.controls.name;

    nameControl.setValue(nameControl.value.trim());
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.submitFailed.set(true);
      this.focusFirstInvalidControl();

      return;
    }

    this.submitFailed.set(false);

    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set(false);

    this.sectorSelectionApi.saveSubmission(this.form.getRawValue()).subscribe({
      next: (submission) => {
        this.form.reset(submission);
        this.saved.set(true);
        this.storedSubmission.set(true);
        this.saving.set(false);
        this.refocusSaveButton();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);

        if (this.applyValidationErrors(error)) {
          this.submitFailed.set(true);
          this.focusFirstInvalidControl();
        } else {
          this.saveError.set(true);
          this.refocusSaveButton();
        }
      },
    });
  }

  protected onSectorIdsChange(selectedIds: number[]): void {
    const sectorControl = this.form.controls.sector_ids;

    sectorControl.setValue(selectedIds);
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
      Object.entries(ERROR_MESSAGES[field])
        .filter(([validator]) => control.hasError(validator))
        .map(([, message]) => message)
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
   * Submitting disables the fieldset and the button, which drops focus to the
   * body. Once the request settles the button is live again, so focus returns
   * there rather than leaving keyboard users at the top of the document.
   */
  private refocusSaveButton(): void {
    afterNextRender(() => this.saveButton()?.nativeElement.focus(), { injector: this.injector });
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
