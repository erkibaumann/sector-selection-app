import {Component, inject, OnInit, signal} from '@angular/core';
import {SubmissionApi} from '../../data-access/submission-api';
import {Sector} from '../../models/sector';

interface SectorOption extends Sector {
  depth: number;
}
@Component({
  selector: 'app-sector-form',
  imports: [],
  templateUrl: './sector-form.html',
  styleUrl: './sector-form.css',
})
export class SectorForm implements OnInit {
  private readonly submissionApi = inject(SubmissionApi);

  protected readonly sectors = signal<Sector[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  ngOnInit() {
    this.submissionApi.getSectors().subscribe({
      next: (sectors) => {
        this.sectors.set(sectors);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }
}
