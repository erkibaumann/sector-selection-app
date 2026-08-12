import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { Translations } from '../../i18n/translations';
import { Sector } from '../../models/sector';

interface SectorTreeNode extends Sector {
  parent: SectorTreeNode | null;
  children: SectorTreeNode[];
  path: string;
  selectable: boolean;
}

interface SectorTree {
  roots: SectorTreeNode[];
  orderedNodes: SectorTreeNode[];
  nodesById: ReadonlyMap<number, SectorTreeNode>;
}

const PATH_SEPARATOR = ' › ';

/** Past this many selections the list collapses behind a "+N more" toggle. */
const MAX_VISIBLE_PILLS = 4;

@Component({
  selector: 'app-sector-tree-selector',
  imports: [NgTemplateOutlet],
  templateUrl: './sector-tree-selector.html',
  styleUrl: './sector-tree-selector.css',
})
export class SectorTreeSelector {
  readonly sectors = input<readonly Sector[]>([]);
  readonly selectedIds = input<readonly number[]>([]);
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  readonly selectedIdsChange = output<number[]>();

  protected readonly pathSeparator = PATH_SEPARATOR;
  protected readonly t = inject(Translations).t;

  private readonly injector = inject(Injector);
  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly removeButtons = viewChildren<ElementRef<HTMLButtonElement>>('removeButton');
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());
  private readonly revealedIds = new Set<number>();

  protected readonly filterText = signal('');
  protected readonly normalizedFilter = computed(() =>
    this.filterText().trim().toLocaleLowerCase(),
  );
  protected readonly isFiltering = computed(() => this.normalizedFilter().length > 0);

  protected readonly tree = computed<SectorTree>(() => this.buildTree(this.sectors()));
  protected readonly selectedIdSet = computed(() => new Set(this.selectedIds()));
  /** A `Set` keeps insertion order, so selections stay in the order they were made. */
  protected readonly selectedNodes = computed(() => {
    const { nodesById } = this.tree();

    return [...this.selectedIdSet()]
      .map((id) => nodesById.get(id))
      .filter((node): node is SectorTreeNode => node?.selectable === true);
  });

  protected readonly showAllSelected = signal(false);
  protected readonly canCollapseSelected = computed(
    () => this.selectedNodes().length > MAX_VISIBLE_PILLS,
  );
  protected readonly visibleSelectedNodes = computed(() => {
    const selectedNodes = this.selectedNodes();

    return this.showAllSelected() || !this.canCollapseSelected()
      ? selectedNodes
      : selectedNodes.slice(0, MAX_VISIBLE_PILLS);
  });
  protected readonly hiddenSelectedCount = computed(
    () => this.selectedNodes().length - this.visibleSelectedNodes().length,
  );

  private readonly categoryIds = computed(() =>
    this.tree()
      .orderedNodes.filter((node) => node.children.length > 0)
      .map((node) => node.id),
  );
  protected readonly allExpanded = computed(() => {
    const expandedIds = this.expandedIds();
    const categoryIds = this.categoryIds();

    return categoryIds.length > 0 && categoryIds.every((id) => expandedIds.has(id));
  });

  /** `null` means no filter is active, so every node is visible. */
  protected readonly visibleIds = computed<ReadonlySet<number> | null>(() => {
    const query = this.normalizedFilter();

    if (query === '') {
      return null;
    }

    const visible = new Set<number>();

    // A node's path contains its ancestors' names, so descendants of a match
    // match too. Only the ancestors of a match need to be revealed.
    for (const node of this.tree().orderedNodes) {
      if (!node.path.toLocaleLowerCase().includes(query)) {
        continue;
      }

      visible.add(node.id);

      for (let ancestor = node.parent; ancestor !== null; ancestor = ancestor.parent) {
        visible.add(ancestor.id);
      }
    }

    return visible;
  });

  protected readonly resultCount = computed(() => {
    const query = this.normalizedFilter();

    return this.tree().orderedNodes.filter(
      (node) => node.selectable && node.path.toLocaleLowerCase().includes(query),
    ).length;
  });
  constructor() {
    // Reveal the categories leading to whatever is already selected, so a
    // restored submission can be edited without hunting for it.
    effect(() => {
      const selectedNodes = this.selectedNodes();

      untracked(() => this.expandAncestors(selectedNodes));
    });
  }

  focus(): void {
    this.filterInput()?.nativeElement.focus();
  }

  protected setFilter(value: string): void {
    this.filterText.set(value);
  }

  /**
   * A browser-supplied clear control is not guaranteed for `type="search"`
   * (Firefox renders none), so the form provides its own.
   */
  protected clearFilter(): void {
    this.filterText.set('');
    this.focus();
  }

  protected toggleShowAllSelected(): void {
    this.showAllSelected.update((showAll) => !showAll);
  }

  protected toggleExpanded(id: number): void {
    const expandedIds = new Set(this.expandedIds());

    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }

    this.expandedIds.set(expandedIds);
  }

  protected isExpanded(node: SectorTreeNode): boolean {
    return node.children.length > 0 && (this.isFiltering() || this.expandedIds().has(node.id));
  }

  protected isVisible(id: number): boolean {
    const visibleIds = this.visibleIds();

    return visibleIds === null || visibleIds.has(id);
  }

  protected isSelected(id: number): boolean {
    return this.selectedIdSet().has(id);
  }

  protected onSelectionChange(id: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const selectedIds = new Set(this.selectedIds());

    if (checkbox.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }

    this.selectedIdsChange.emit([...selectedIds]);
  }

  protected removeSelection(id: number): void {
    const removedIndex = this.visibleSelectedNodes().findIndex((node) => node.id === id);
    const selectedIds = new Set(this.selectedIds());

    selectedIds.delete(id);
    this.selectedIdsChange.emit([...selectedIds]);

    // The button that had focus is gone; land on the pill that took its place.
    this.afterRender(() => {
      const removeButtons = this.removeButtons();

      if (removeButtons.length === 0) {
        this.focus();

        return;
      }

      removeButtons[Math.min(removedIndex, removeButtons.length - 1)]?.nativeElement.focus();
    });
  }

  protected clearSelection(): void {
    this.showAllSelected.set(false);
    this.selectedIdsChange.emit([]);
    this.afterRender(() => this.focus());
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }

  protected toggleExpandAll(): void {
    this.expandedIds.set(this.allExpanded() ? new Set() : new Set(this.categoryIds()));
  }

  protected checkboxId(id: number): string {
    return `sector-checkbox-${id}`;
  }

  protected childrenId(id: number): string {
    return `sector-children-${id}`;
  }

  /**
   * Reveals each selection once. Re-expanding on every change would fight a
   * user who deliberately collapsed a category holding a selected sector.
   */
  private expandAncestors(selectedNodes: readonly SectorTreeNode[]): void {
    const expandedIds = new Set(this.expandedIds());
    const initialSize = expandedIds.size;

    for (const node of selectedNodes) {
      if (this.revealedIds.has(node.id)) {
        continue;
      }

      this.revealedIds.add(node.id);

      for (let ancestor = node.parent; ancestor !== null; ancestor = ancestor.parent) {
        expandedIds.add(ancestor.id);
      }
    }

    if (expandedIds.size !== initialSize) {
      this.expandedIds.set(expandedIds);
    }
  }

  private buildTree(sectors: readonly Sector[]): SectorTree {
    const nodesById = new Map<number, SectorTreeNode>();

    for (const sector of sectors) {
      nodesById.set(sector.id, {
        ...sector,
        parent: null,
        children: [],
        path: '',
        selectable: false,
      });
    }

    const roots: SectorTreeNode[] = [];

    for (const node of nodesById.values()) {
      const parent = node.parent_id === null ? null : (nodesById.get(node.parent_id) ?? null);

      if (parent === null) {
        roots.push(node);
      } else {
        node.parent = parent;
        parent.children.push(node);
      }
    }

    const compareByName = (left: SectorTreeNode, right: SectorTreeNode): number =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    const orderedNodes: SectorTreeNode[] = [];

    const orderSubtree = (nodes: SectorTreeNode[], parentPath: string): void => {
      nodes.sort(compareByName);

      for (const node of nodes) {
        node.path = parentPath === '' ? node.name : `${parentPath}${PATH_SEPARATOR}${node.name}`;
        node.selectable = node.children.length === 0;
        orderedNodes.push(node);
        orderSubtree(node.children, node.path);
      }
    };

    orderSubtree(roots, '');

    return { roots, orderedNodes, nodesById };
  }
}
