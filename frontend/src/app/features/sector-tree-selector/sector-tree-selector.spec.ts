import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sector } from '../../models/sector';
import { SectorTreeSelector } from './sector-tree-selector';

describe('SectorTreeSelector', () => {
  let fixture: ComponentFixture<SectorTreeSelector>;
  let element: HTMLElement;

  const sectors: Sector[] = [
    { id: 150, parent_id: 5, name: 'Book/Periodicals printing' },
    { id: 2, parent_id: null, name: 'Service' },
    { id: 18, parent_id: 1, name: 'Electronics and Optics' },
    { id: 148, parent_id: 5, name: 'Advertising' },
    { id: 5, parent_id: 1, name: 'Printing' },
    { id: 141, parent_id: 2, name: 'Translation services' },
    { id: 1, parent_id: null, name: 'Manufacturing' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SectorTreeSelector] }).compileComponents();

    fixture = TestBed.createComponent(SectorTreeSelector);
    fixture.componentRef.setInput('sectors', sectors);
    fixture.componentRef.setInput('describedBy', 'sector-error');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const nodeNames = (list: Element | null | undefined): (string | undefined)[] =>
    Array.from(list?.querySelectorAll(':scope > li') ?? []).map((item) =>
      item
        .querySelector<HTMLElement>(':scope > .sector-node .sector-node-name')
        ?.textContent?.trim(),
    );

  const childList = (list: Element | null | undefined, position: number): Element | null =>
    list?.querySelector(`:scope > li:nth-child(${position}) > .sector-tree-list`) ?? null;

  const checkbox = (sectorId: number): HTMLInputElement => {
    const input = element.querySelector<HTMLInputElement>(`#sector-checkbox-${sectorId}`);

    if (!input) {
      throw new Error(`Expected a checkbox for sector ${sectorId}.`);
    }

    return input;
  };

  const filter = (value: string): void => {
    const input = element.querySelector<HTMLInputElement>('#sector-filter');

    if (!input) {
      throw new Error('Expected the sector filter.');
    }

    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const emitted = (): number[][] => {
    const selections: number[][] = [];

    fixture.componentInstance.selectedIdsChange.subscribe((ids) => selections.push(ids));

    return selections;
  };

  it('builds a sorted hierarchy in which every level is open and only leaves are selectable', () => {
    const root = element.querySelector('.sector-tree-root');

    expect(nodeNames(root)).toEqual(['Manufacturing', 'Service']);
    expect(element.querySelector('#sector-checkbox-1')).toBeNull();

    const manufacturing = childList(root, 1);

    expect(nodeNames(manufacturing)).toEqual(['Electronics and Optics', 'Printing']);
    expect(checkbox(18)).toBeTruthy();
    expect(element.querySelector('#sector-checkbox-5')).toBeNull();

    expect(nodeNames(childList(manufacturing, 2))).toEqual([
      'Advertising',
      'Book/Periodicals printing',
    ]);
    expect(checkbox(148)).toBeTruthy();
    expect(checkbox(150)).toBeTruthy();
  });

  it('filters by full path and shows a clear no-results state', () => {
    filter('MANUFACTURING › PRINTING › ADVERTISING');

    expect(element.textContent).toContain('1 sector found.');
    expect(element.querySelectorAll('.sector-checkbox').length).toBe(1);
    expect(checkbox(148)).toBeTruthy();
    expect(nodeNames(element.querySelector('.sector-tree-root'))).toEqual(['Manufacturing']);

    filter('not a real sector');

    expect(element.textContent).toContain('0 sectors found.');
    expect(element.textContent).toContain('No sectors match your filter.');
    expect(element.querySelector<HTMLUListElement>('#sector-tree-list')?.hidden).toBe(true);
  });

  it('shows selections as pills in selection order and keeps selections independent', () => {
    const selections = emitted();

    fixture.componentRef.setInput('selectedIds', [150, 18, 150]);
    fixture.detectChanges();

    const pills = Array.from(element.querySelectorAll('.selected-sector-pill'));
    const parents = pills.map((pill) =>
      pill.querySelector('.selected-sector-parent')?.textContent?.trim(),
    );
    const names = pills.map((pill) =>
      pill.querySelector('.selected-sector-name')?.textContent?.trim(),
    );

    expect(parents).toEqual(['Printing ›', 'Manufacturing ›']);
    expect(names).toEqual(['Book/Periodicals printing', 'Electronics and Optics']);

    checkbox(148).click();

    expect(selections.at(-1)).toEqual([150, 18, 148]);
  });

  it('removes one selected pill or clears the whole selection', () => {
    const selections = emitted();

    fixture.componentRef.setInput('selectedIds', [18, 150]);
    fixture.detectChanges();

    element
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Remove Manufacturing › Printing › Book/Periodicals printing"]',
      )
      ?.click();

    expect(selections.at(-1)).toEqual([18]);

    element.querySelector<HTMLButtonElement>('.selected-sectors-header button')?.click();

    expect(selections.at(-1)).toEqual([]);
  });

  it('focuses the filter and exposes the important accessibility relationships', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    const group = element.querySelector('fieldset');
    const filterInput = element.querySelector<HTMLInputElement>('#sector-filter');

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(filterInput);
    expect(group?.querySelector('legend')?.textContent).toContain('Sectors');
    expect(group?.getAttribute('aria-describedby')).toBe('sector-help sector-error');
    expect(group?.getAttribute('aria-invalid')).toBe('true');

    const electronicsCheckbox = checkbox(18);
    const electronicsLabel = element.querySelector<HTMLLabelElement>(
      'label[for="sector-checkbox-18"]',
    );

    expect(electronicsCheckbox.labels?.item(0)).toBe(electronicsLabel);
  });
});
