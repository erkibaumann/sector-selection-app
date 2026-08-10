import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorForm } from './sector-form';
import {Sector} from '../../models/sector';
import {SubmissionApi} from '../../data-access/submission-api';
import {of} from 'rxjs';

describe('SectorForm', () => {
  let fixture: ComponentFixture<SectorForm>;

  const sectors: Sector[] = [
    {
      id: 1,
      parent_id: null,
      name: 'Manufacturing'
    },
    {
      id: 19,
      parent_id: 1,
      name: 'Construction materials'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectorForm],
      providers: [
        {
          provide: SubmissionApi,
          useValue: {getSectors: () => of(sectors)}
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectorForm);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('displays the number of loaded sectors', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('2 sectors loaded');
  });
});
