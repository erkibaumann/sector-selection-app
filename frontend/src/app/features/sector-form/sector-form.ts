import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { Sector } from '../../models/sector';
import { Submission } from '../../models/submission';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

interface SectorOption extends Sector {
  depth: number;
}

interface ValidationErrorResponse {
  errors?: Record<string, unknown>;
}

const NAME_PATTERN = /^\p{L}[\p{L}\p{M}\s'’.-]*$/u;

const INDENT_PER_LEVEL = 4;

function nonBlankName(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

function nameFormat(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();

  return name === '' || NAME_PATTERN.test(name) ? null : { nameFormat: true };
}

function isSubmissionField(field: string): field is keyof Submission {
  return field === 'name' || field === 'sector_ids' || field === 'agreed_to_terms';
}

@Component({
  selector: 'app-sector-form',
  imports: [ReactiveFormsModule],
  templateUrl: './sector-form.html',
  styleUrl: './sector-form.css',
})
export class SectorForm implements OnInit {
  private readonly sectorSelectionApi = inject(SectorSelectionApi);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly sectorSelect = viewChild<ElementRef<HTMLSelectElement>>('sectorSelect');
  private readonly termsCheckbox = viewChild<ElementRef<HTMLInputElement>>('termsCheckbox');

  protected readonly sectors = signal<SectorOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly saveError = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankName, nameFormat, Validators.maxLength(255)],
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
        this.sectors.set(this.buildSectorOptions(sectors));

        if (submission !== null) {
          this.form.reset(submission);
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
      this.focusFirstInvalidControl();

      return;
    }

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
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);

        if (this.applyValidationErrors(error)) {
          this.focusFirstInvalidControl();
        } else {
          this.saveError.set(true);
        }
      },
    });
  }

  protected sectorIndentation(depth: number): string {
    return '\u00A0'.repeat(depth * INDENT_PER_LEVEL);
  }

  protected showsError(control: AbstractControl): boolean {
    return control.touched && control.invalid;
  }

  protected serverErrors(control: AbstractControl): string[] | null {
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

  private focusFirstInvalidControl(): void {
    const controls = this.form.controls;

    if (controls.name.invalid) {
      this.nameInput()?.nativeElement.focus();
    } else if (controls.sector_ids.invalid) {
      this.sectorSelect()?.nativeElement.focus();
    } else if (controls.agreed_to_terms.invalid) {
      this.termsCheckbox()?.nativeElement.focus();
    }
  }

  private buildSectorOptions(sectors: Sector[]): SectorOption[] {
    const childrenByParentId = new Map<number | null, Sector[]>();

    for (const sector of sectors) {
      const siblings = childrenByParentId.get(sector.parent_id) ?? [];

      siblings.push(sector);
      childrenByParentId.set(sector.parent_id, siblings);
    }

    const options: SectorOption[] = [];

    const appendChildren = (parentId: number | null, depth: number): void => {
      const children = childrenByParentId.get(parentId) ?? [];

      for (const sector of children) {
        options.push({
          ...sector,
          depth,
        });

        appendChildren(sector.id, depth + 1);
      }
    };

    appendChildren(null, 0);

    return options;
  }
}
