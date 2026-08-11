import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

import { Sector } from '../../models/sector';

interface SectorTreeNode extends Sector {
  children: SectorTreeNode[];
  path: string;
  selectable: boolean;
}

interface SectorTree {
  roots: SectorTreeNode[];
  orderedNodes: SectorTreeNode[];
}

interface VisibleSectorTreeNode {
  node: SectorTreeNode;
  children: VisibleSectorTreeNode[];
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

  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

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
  protected readonly visibleRoots = computed<VisibleSectorTreeNode[]>(() => {
    const query = this.normalizedFilter();

    if (query === '') {
      return this.tree().roots.map((node) => this.completeSubtree(node));
    }

    return this.tree()
      .roots.map((node) => this.filteredSubtree(node, query))
      .filter((node): node is VisibleSectorTreeNode => node !== null);
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
    if (this.isFiltering()) {
      return;
    }

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

  protected checkboxId(id: number): string {
    return `sector-checkbox-${id}`;
  }

  protected childrenId(id: number): string {
    return `sector-children-${id}`;
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
        selectable: sector.parent_id !== null,
      });
    }

    const roots: SectorTreeNode[] = [];

    for (const node of nodesById.values()) {
      if (node.parent_id === null) {
        roots.push(node);
      } else {
        nodesById.get(node.parent_id)?.children.push(node);
      }
    }

    const compareByName = (left: SectorTreeNode, right: SectorTreeNode): number =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    const orderedNodes: SectorTreeNode[] = [];

    const orderSubtree = (nodes: SectorTreeNode[], parentPath: string): void => {
      nodes.sort(compareByName);

      for (const node of nodes) {
        node.path = parentPath === '' ? node.name : `${parentPath}${PATH_SEPARATOR}${node.name}`;
        orderedNodes.push(node);
        orderSubtree(node.children, node.path);
      }
    };

    orderSubtree(roots, '');

    return { roots, orderedNodes };
  }

  private completeSubtree(node: SectorTreeNode): VisibleSectorTreeNode {
    return {
      node,
      children: node.children.map((child) => this.completeSubtree(child)),
    };
  }

  private filteredSubtree(node: SectorTreeNode, query: string): VisibleSectorTreeNode | null {
    if (node.path.toLocaleLowerCase().includes(query)) {
      return this.completeSubtree(node);
    }

    const children = node.children
      .map((child) => this.filteredSubtree(child, query))
      .filter((child): child is VisibleSectorTreeNode => child !== null);

    return children.length > 0 ? { node, children } : null;
  }
}
