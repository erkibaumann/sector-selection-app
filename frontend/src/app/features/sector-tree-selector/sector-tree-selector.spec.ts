import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sector } from '../../models/sector';
import { SectorTreeSelector } from './sector-tree-selector';

describe('SectorTreeSelector', () => {
  let fixture: ComponentFixture<SectorTreeSelector>;
  let element: HTMLElement;

  const sectors: Sector[] = [
    { id: 392, parent_id: 13, name: 'Office' },
    { id: 2, parent_id: null, name: 'Service' },
    { id: 19, parent_id: 1, name: 'Construction materials' },
    { id: 385, parent_id: 13, name: 'Bedroom' },
    { id: 13, parent_id: 1, name: 'Furniture' },
    { id: 25, parent_id: 2, name: 'Business services' },
    { id: 1, parent_id: null, name: 'Manufacturing' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SectorTreeSelector] }).compileComponents();

    fixture = TestBed.createComponent(SectorTreeSelector);
    fixture.componentRef.setInput('sectors', sectors);
    fixture.componentRef.setInput('labelledBy', 'sector-label');
    fixture.componentRef.setInput('describedBy', 'sector-help');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const categoryButton = (sectorId: number): HTMLButtonElement => {
    const button = element.querySelector<HTMLButtonElement>(
      `button[aria-controls="sector-children-${sectorId}"]`,
    );

    if (!button) {
      throw new Error(`Expected a category button for sector ${sectorId}.`);
    }

    return button;
  };

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

  it('builds an alphabetically ordered nested hierarchy', () => {
    const rootNames = Array.from(element.querySelectorAll('.sector-tree-root > li')).map((item) =>
      item
        .querySelector<HTMLElement>(':scope > .sector-node .sector-node-name')
        ?.textContent?.trim(),
    );

    expect(rootNames).toEqual(['Manufacturing', 'Service']);

    categoryButton(1).click();
    fixture.detectChanges();

    const childNames = Array.from(
      element.querySelectorAll('#sector-children-1 > li > .sector-node .sector-node-name'),
    ).map((item) => item.textContent?.trim());

    expect(childNames).toEqual(['Construction materials', 'Furniture']);
  });

  it('makes only leaf sectors selectable', () => {
    // Roots and intermediate categories are navigation only.
    expect(element.querySelector('#sector-checkbox-1')).toBeNull();

    categoryButton(1).click();
    fixture.detectChanges();

    expect(element.querySelector('#sector-checkbox-13')).toBeNull();
    expect(categoryButton(13)).toBeTruthy();
    expect(checkbox(19)).toBeTruthy();

    categoryButton(13).click();
    fixture.detectChanges();

    expect(checkbox(385)).toBeTruthy();
    expect(checkbox(392)).toBeTruthy();
  });

  it('expands a category by clicking the row itself', () => {
    const button = categoryButton(1);
    const controlledList = element.querySelector<HTMLUListElement>('#sector-children-1');

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.querySelector('.sector-chevron')).not.toBeNull();
    expect(button.querySelector('.sector-chevron-open')).toBeNull();
    expect(controlledList?.hidden).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.querySelector('.sector-chevron-open')).not.toBeNull();
    expect(controlledList?.hidden).toBe(false);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(controlledList?.hidden).toBe(true);
  });

  it('expands the categories leading to already selected sectors', () => {
    fixture.componentRef.setInput('selectedIds', [392]);
    fixture.detectChanges();

    expect(element.querySelector<HTMLUListElement>('#sector-children-1')?.hidden).toBe(false);
    expect(element.querySelector<HTMLUListElement>('#sector-children-13')?.hidden).toBe(false);
    expect(checkbox(392).checked).toBe(true);
  });

  it('does not re-expand a category the user collapsed after a later change', () => {
    fixture.componentRef.setInput('selectedIds', [392]);
    fixture.detectChanges();

    categoryButton(13).click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLUListElement>('#sector-children-13')?.hidden).toBe(true);

    // A change elsewhere must not undo the collapse.
    fixture.componentRef.setInput('selectedIds', [392, 19]);
    fixture.detectChanges();

    expect(element.querySelector<HTMLUListElement>('#sector-children-13')?.hidden).toBe(true);
  });

  it('filters case-insensitively by full path and renders categories as static rows', () => {
    filter('MANUFACTURING › FURNITURE › BEDROOM');

    expect(element.textContent).toContain('1 sector found.');
    expect(checkbox(385)).toBeTruthy();
    expect(element.textContent).not.toContain('Office');
    // Everything is forced open while filtering, so there is nothing to toggle.
    expect(element.querySelector('button[aria-controls="sector-children-1"]')).toBeNull();
    expect(element.querySelectorAll('.sector-category .sector-chevron-open').length).toBe(2);

    element.querySelector<HTMLButtonElement>('.sector-filter button')?.click();
    fixture.detectChanges();

    expect(categoryButton(1).getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the complete subtree when a category matches', () => {
    filter('furniture');

    expect(element.textContent).toContain('2 sectors found.');
    expect(element.textContent).toContain('Furniture');
    expect(element.textContent).toContain('Bedroom');
    expect(element.textContent).toContain('Office');
  });

  it('counts only selectable sectors, matching what the tree shows', () => {
    filter('bedroom');

    // Furniture is revealed as a category but is not a selectable result.
    expect(element.textContent).toContain('1 sector found.');
    expect(element.querySelectorAll('.sector-checkbox').length).toBe(1);
  });

  it('reports a polite count and clear no-results state', () => {
    const results = element.querySelector('#sector-filter-results');

    expect(results?.getAttribute('aria-live')).toBe('polite');
    expect(results?.textContent).toContain('4 sectors available.');

    filter('not a real sector');

    expect(results?.textContent).toContain('0 sectors found.');
    expect(element.textContent).toContain('No sectors match your filter.');
    expect(element.querySelector<HTMLUListElement>('#sector-tree-list')?.hidden).toBe(true);
  });

  it('keeps selections independent across the hierarchy', () => {
    const selections = emitted();

    fixture.componentRef.setInput('selectedIds', [385]);
    fixture.detectChanges();
    checkbox(392).click();

    expect(selections.at(-1)).toEqual([385, 392]);
    expect(checkbox(385).checked).toBe(true);
  });

  it('shows selections as pills with the immediate parent and no disclosure', () => {
    fixture.componentRef.setInput('selectedIds', [392, 19, 392]);
    fixture.detectChanges();

    expect(element.querySelector('details')).toBeNull();
    expect(element.querySelector('#selected-sectors-label')?.textContent).toContain(
      '2 sectors selected',
    );

    const pills = Array.from(element.querySelectorAll('.selected-sector-pill'));
    const parents = pills.map((pill) =>
      pill.querySelector('.selected-sector-parent')?.textContent?.trim(),
    );
    const names = pills.map((pill) =>
      pill.querySelector('.selected-sector-name')?.textContent?.trim(),
    );

    expect(parents).toEqual(['Manufacturing ›', 'Furniture ›']);
    expect(names).toEqual(['Construction materials', 'Office']);
  });

  it('removes a single pill by its full path and clears them all', () => {
    const selections = emitted();

    fixture.componentRef.setInput('selectedIds', [19, 392]);
    fixture.detectChanges();

    element
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Remove Manufacturing › Furniture › Office"]',
      )
      ?.click();

    expect(selections.at(-1)).toEqual([19]);

    element.querySelectorAll<HTMLButtonElement>('.selected-sectors button').forEach((button) => {
      if (button.textContent?.includes('Clear all')) {
        button.click();
      }
    });

    expect(selections.at(-1)).toEqual([]);
  });

  it('announces an empty selection state', () => {
    const label = element.querySelector('#selected-sectors-label');

    expect(label?.getAttribute('aria-live')).toBe('polite');
    expect(label?.textContent).toContain('0 sectors selected');
    expect(element.textContent).toContain('Nothing selected yet.');
    expect(element.querySelector('.selected-sector-pill')).toBeNull();
  });

  it('focuses the filter and exposes group, button, and checkbox ARIA relationships', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    const group = element.querySelector('[role="group"]');
    const filterInput = element.querySelector<HTMLInputElement>('#sector-filter');

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(filterInput);
    expect(group?.getAttribute('aria-labelledby')).toBe('sector-label');
    expect(group?.getAttribute('aria-describedby')).toBe('sector-help');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('[role="tree"]')).toBeNull();

    categoryButton(1).click();
    fixture.detectChanges();

    const constructionCheckbox = checkbox(19);
    const constructionLabel = element.querySelector<HTMLLabelElement>(
      'label[for="sector-checkbox-19"]',
    );

    expect(constructionLabel).not.toBeNull();
    expect(constructionCheckbox.labels?.item(0)).toBe(constructionLabel);
  });
});
