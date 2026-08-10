import { Component, inject, OnInit, signal } from '@angular/core';
import { SubmissionApi } from '../../data-access/submission-api';
import { Sector } from '../../models/sector';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface SectorOption extends Sector {
  depth: number;
}
@Component({
  selector: 'app-sector-form',
  imports: [ReactiveFormsModule],
  templateUrl: './sector-form.html',
  styleUrl: './sector-form.css',
})
export class SectorForm implements OnInit {
  private readonly submissionApi = inject(SubmissionApi);

  protected readonly sectors = signal<SectorOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
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
    this.submissionApi.getSectors().subscribe({
      next: (sectors) => {
        this.sectors.set(this.buildSectorOptions(sectors));
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
      return;
    }
  }
  protected sectorIndentation(depth: number): string {
    return '\u00A0'.repeat(depth * 2);
  }

  private buildSectorOptions(sectors: Sector[]): SectorOption[] {
    const childrenByParentId = new Map<number | null, Sector[]>();

    for (const sector of sectors) {
      const siblings = childrenByParentId.get(sector.parent_id) ?? [];

      siblings.push(sector);
      childrenByParentId.set(sector.parent_id, siblings);
    }

    for (const siblings of childrenByParentId.values()) {
      siblings.sort((left, right) => left.name.localeCompare(right.name));
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
