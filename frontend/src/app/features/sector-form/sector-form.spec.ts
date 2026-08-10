import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectorForm } from './sector-form';

describe('SectorForm', () => {
  let component: SectorForm;
  let fixture: ComponentFixture<SectorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectorForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SectorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
