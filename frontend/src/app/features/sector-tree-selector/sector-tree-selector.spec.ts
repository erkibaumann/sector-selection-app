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

  const expansionButton = (sectorId: number): HTMLButtonElement => {
    const button = element.querySelector<HTMLButtonElement>(
      `button[aria-controls="sector-children-${sectorId}"]`,
    );

    if (!button) {
      throw new Error(`Expected an expansion button for sector ${sectorId}.`);
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

  it('builds an alphabetically ordered nested hierarchy', () => {
    const rootNames = Array.from(element.querySelectorAll('.sector-tree-root > li')).map((item) =>
      item
        .querySelector<HTMLElement>(':scope > .sector-node .sector-node-name')
        ?.textContent?.trim(),
    );

    expect(rootNames).toEqual(['Manufacturing', 'Service']);

    expansionButton(1).click();
    fixture.detectChanges();

    const childNames = Array.from(
      element.querySelectorAll('#sector-children-1 > li > .sector-node .sector-node-name'),
    ).map((item) => item.textContent?.trim());

    expect(childNames).toEqual(['Construction materials', 'Furniture']);
  });

  it('makes only non-root sectors selectable, including intermediate sectors', () => {
    expect(element.querySelector('#sector-checkbox-1')).toBeNull();

    expansionButton(1).click();
    fixture.detectChanges();

    expect(checkbox(13)).toBeTruthy();
    expect(expansionButton(13)).toBeTruthy();
  });

  it('keeps parent and child selection independent', () => {
    const emittedSelections: number[][] = [];
    fixture.componentInstance.selectedIdsChange.subscribe((ids) => emittedSelections.push(ids));

    expansionButton(1).click();
    fixture.detectChanges();
    checkbox(13).click();
    fixture.componentRef.setInput('selectedIds', emittedSelections.at(-1));
    fixture.detectChanges();
    expansionButton(13).click();
    fixture.detectChanges();

    expect(emittedSelections.at(-1)).toEqual([13]);
    expect(checkbox(13).checked).toBe(true);
    expect(checkbox(385).checked).toBe(false);
    expect(checkbox(392).checked).toBe(false);
  });

  it('expands and collapses categories with native button relationships', () => {
    const button = expansionButton(1);
    const controlledId = button.getAttribute('aria-controls');
    const controlledList = element.querySelector<HTMLUListElement>(`#${controlledId}`);

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(controlledList).not.toBeNull();
    expect(controlledList?.hidden).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(controlledList?.hidden).toBe(false);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(controlledList?.hidden).toBe(true);
  });

  it('filters case-insensitively by full path and restores expansion state', () => {
    expansionButton(1).click();
    fixture.detectChanges();
    expect(expansionButton(13).getAttribute('aria-expanded')).toBe('false');

    filter('MANUFACTURING › FURNITURE › BEDROOM');

    expect(element.textContent).toContain('1 sector found.');
    expect(expansionButton(1).getAttribute('aria-expanded')).toBe('true');
    expect(expansionButton(13).getAttribute('aria-expanded')).toBe('true');
    expect(checkbox(385)).toBeTruthy();
    expect(element.textContent).not.toContain('Office');

    element.querySelector<HTMLButtonElement>('.sector-filter button')?.click();
    fixture.detectChanges();

    expect(expansionButton(1).getAttribute('aria-expanded')).toBe('true');
    expect(expansionButton(13).getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector<HTMLUListElement>('#sector-children-13')?.hidden).toBe(true);
  });

  it('shows the complete subtree when a category matches', () => {
    filter('furniture');

    expect(element.textContent).toContain('3 sectors found.');
    expect(element.textContent).toContain('Furniture');
    expect(element.textContent).toContain('Bedroom');
    expect(element.textContent).toContain('Office');
  });

  it('reports a polite count and clear no-results state', () => {
    const results = element.querySelector('#sector-filter-results');

    expect(results?.getAttribute('aria-live')).toBe('polite');
    expect(results?.textContent).toContain('5 sectors available.');

    filter('not a real sector');

    expect(results?.textContent).toContain('0 sectors found.');
    expect(element.textContent).toContain('No sectors match your filter.');
    expect(element.querySelector<HTMLUListElement>('#sector-tree-list')?.hidden).toBe(true);
  });

  it('lists unique selections in tree order with full paths and supports removal', () => {
    const emittedSelections: number[][] = [];
    fixture.componentInstance.selectedIdsChange.subscribe((ids) => emittedSelections.push(ids));
    fixture.componentRef.setInput('selectedIds', [392, 19, 392]);
    fixture.detectChanges();

    const details = element.querySelector('details');
    const selectedPaths = Array.from(element.querySelectorAll('.selected-sector-path')).map(
      (path) => path.textContent?.trim(),
    );

    expect(details?.open).toBe(false);
    expect(details?.querySelector('summary')?.textContent).toContain('2 sectors selected');
    expect(selectedPaths).toEqual([
      'Manufacturing › Construction materials',
      'Manufacturing › Furniture › Office',
    ]);

    const removeOffice = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove Manufacturing › Furniture › Office"]',
    );
    removeOffice?.click();

    expect(emittedSelections.at(-1)).toEqual([19]);
  });

  it('emits unique selected ids in stable tree order', () => {
    const emittedSelections: number[][] = [];
    fixture.componentInstance.selectedIdsChange.subscribe((ids) => emittedSelections.push(ids));
    fixture.componentRef.setInput('selectedIds', [392]);
    fixture.detectChanges();

    expansionButton(1).click();
    fixture.detectChanges();
    checkbox(19).click();

    expect(emittedSelections.at(-1)).toEqual([19, 392]);
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

    expansionButton(1).click();
    fixture.detectChanges();

    const constructionCheckbox = checkbox(19);
    const constructionLabel = element.querySelector<HTMLLabelElement>(
      'label[for="sector-checkbox-19"]',
    );

    expect(constructionLabel).not.toBeNull();
    expect(constructionCheckbox.labels?.item(0)).toBe(constructionLabel);
  });
});
