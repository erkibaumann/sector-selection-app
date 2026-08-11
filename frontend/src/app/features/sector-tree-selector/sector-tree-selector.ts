import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { Sector } from '../../models/sector';

interface SectorTreeNode extends Sector {
  children: SectorTreeNode[];
  path: string;
  parentName: string;
  selectable: boolean;
}

interface SectorTree {
  roots: SectorTreeNode[];
  orderedNodes: SectorTreeNode[];
  parentIdById: ReadonlyMap<number, number | null>;
}

const PATH_SEPARATOR = ' › ';

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
  readonly labelledBy = input('');
  readonly describedBy = input<string | null>(null);

  readonly selectedIdsChange = output<number[]>();

  protected readonly pathSeparator = PATH_SEPARATOR;

  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());
  private readonly revealedIds = new Set<number>();

  protected readonly filterText = signal('');
  protected readonly normalizedFilter = computed(() =>
    this.filterText().trim().toLocaleLowerCase(),
  );
  protected readonly isFiltering = computed(() => this.normalizedFilter().length > 0);

  protected readonly tree = computed<SectorTree>(() => this.buildTree(this.sectors()));
  protected readonly selectedIdSet = computed(() => new Set(this.selectedIds()));
  protected readonly selectedNodes = computed(() =>
    this.tree().orderedNodes.filter((node) => node.selectable && this.selectedIdSet().has(node.id)),
  );

  /** `null` means no filter is active, so every node is visible. */
  protected readonly visibleIds = computed<ReadonlySet<number> | null>(() => {
    const query = this.normalizedFilter();

    if (query === '') {
      return null;
    }

    const { orderedNodes, parentIdById } = this.tree();
    const visible = new Set<number>();

    // A node's path contains its ancestors' names, so descendants of a match
    // match too. Only the ancestors of a match need to be revealed.
    for (const node of orderedNodes) {
      if (!node.path.toLocaleLowerCase().includes(query)) {
        continue;
      }

      visible.add(node.id);

      for (
        let ancestorId = parentIdById.get(node.id) ?? null;
        ancestorId !== null;
        ancestorId = parentIdById.get(ancestorId) ?? null
      ) {
        visible.add(ancestorId);
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
  protected readonly availableCount = computed(
    () => this.tree().orderedNodes.filter((node) => node.selectable).length,
  );

  constructor() {
    // Reveal the categories leading to whatever is already selected, so a
    // restored submission can be edited without hunting for it.
    effect(() => {
      const selectedIds = this.selectedIds();
      const { parentIdById } = this.tree();

      untracked(() => this.expandAncestors(selectedIds, parentIdById));
    });
  }

  focus(): void {
    this.filterInput()?.nativeElement.focus();
  }

  protected setFilter(value: string): void {
    this.filterText.set(value);
  }

  protected clearFilter(): void {
    this.filterText.set('');

    const inputElement = this.filterInput()?.nativeElement;

    if (inputElement) {
      inputElement.value = '';
      inputElement.focus();
    }
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

    this.emitInTreeOrder(selectedIds);
  }

  protected removeSelection(id: number): void {
    const selectedIds = new Set(this.selectedIds());

    selectedIds.delete(id);
    this.emitInTreeOrder(selectedIds);
  }

  protected clearSelection(): void {
    this.emitInTreeOrder(new Set());
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
  private expandAncestors(
    selectedIds: readonly number[],
    parentIdById: ReadonlyMap<number, number | null>,
  ): void {
    const expandedIds = new Set(this.expandedIds());
    const initialSize = expandedIds.size;

    for (const selectedId of selectedIds) {
      if (this.revealedIds.has(selectedId)) {
        continue;
      }

      this.revealedIds.add(selectedId);

      for (
        let ancestorId = parentIdById.get(selectedId) ?? null;
        ancestorId !== null;
        ancestorId = parentIdById.get(ancestorId) ?? null
      ) {
        expandedIds.add(ancestorId);
      }
    }

    if (expandedIds.size !== initialSize) {
      this.expandedIds.set(expandedIds);
    }
  }

  private emitInTreeOrder(selectedIds: ReadonlySet<number>): void {
    this.selectedIdsChange.emit(
      this.tree()
        .orderedNodes.filter((node) => node.selectable && selectedIds.has(node.id))
        .map((node) => node.id),
    );
  }

  private buildTree(sectors: readonly Sector[]): SectorTree {
    const nodesById = new Map<number, SectorTreeNode>();

    for (const sector of sectors) {
      nodesById.set(sector.id, {
        ...sector,
        children: [],
        path: '',
        parentName: '',
        selectable: false,
      });
    }

    const roots: SectorTreeNode[] = [];
    const parentIdById = new Map<number, number | null>();

    for (const node of nodesById.values()) {
      parentIdById.set(node.id, node.parent_id);

      if (node.parent_id === null) {
        roots.push(node);
      } else {
        nodesById.get(node.parent_id)?.children.push(node);
      }
    }

    const compareByName = (left: SectorTreeNode, right: SectorTreeNode): number =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    const orderedNodes: SectorTreeNode[] = [];

    const orderSubtree = (
      nodes: SectorTreeNode[],
      parentPath: string,
      parentName: string,
    ): void => {
      nodes.sort(compareByName);

      for (const node of nodes) {
        node.path = parentPath === '' ? node.name : `${parentPath}${PATH_SEPARATOR}${node.name}`;
        node.parentName = parentName;
        node.selectable = node.children.length === 0;
        orderedNodes.push(node);
        orderSubtree(node.children, node.path, node.name);
      }
    };

    orderSubtree(roots, '', '');

    return { roots, orderedNodes, parentIdById };
  }
}
