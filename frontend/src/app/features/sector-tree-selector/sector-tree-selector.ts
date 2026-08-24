import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
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

  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');

  protected readonly filterText = signal('');
  protected readonly normalizedFilter = computed(() =>
    this.filterText().trim().toLocaleLowerCase(),
  );
  protected readonly isFiltering = computed(() => this.normalizedFilter().length > 0);

  protected readonly tree = computed<SectorTree>(() => this.buildTree(this.sectors()));
  protected readonly selectedIdSet = computed(() => new Set(this.selectedIds()));
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

  protected readonly visibleIds = computed<ReadonlySet<number> | null>(() => {
    const query = this.normalizedFilter();

    if (query === '') {
      return null;
    }

    const visible = new Set<number>();

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

  focus(): void {
    this.filterInput()?.nativeElement.focus();
  }

  protected setFilter(value: string): void {
    this.filterText.set(value);
  }

  protected clearFilter(): void {
    this.filterText.set('');
    this.focus();
  }

  protected toggleShowAllSelected(): void {
    this.showAllSelected.update((showAll) => !showAll);
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
    const selectedIds = new Set(this.selectedIds());

    selectedIds.delete(id);
    this.selectedIdsChange.emit([...selectedIds]);
  }

  protected clearSelection(): void {
    this.showAllSelected.set(false);
    this.selectedIdsChange.emit([]);
  }

  protected checkboxId(id: number): string {
    return `sector-checkbox-${id}`;
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
