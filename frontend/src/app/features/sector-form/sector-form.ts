import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { SectorSelectionApi } from '../../data-access/sector-selection-api';
import { Sector } from '../../models/sector';
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

const NAME_PATTERN = /^\p{L}[\p{L}\p{M}\s'’.-]*$/u;

function nonBlankName(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

function nameFormat(control: AbstractControl): ValidationErrors | null {
  const name = String(control.value ?? '').trim();

  return name === '' || NAME_PATTERN.test(name) ? null : { nameFormat: true };
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
      error: () => {
        this.saveError.set(true);
        this.saving.set(false);
      },
    });
  }
  protected sectorIndentation(depth: number): string {
    return '\u00A0'.repeat(depth * 3);
  }

  protected showsError(control: AbstractControl): boolean {
    return control.touched && control.invalid;
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
