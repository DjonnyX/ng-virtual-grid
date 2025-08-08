import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { ISize } from '../../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../../const';
import { BaseVirtualListItemComponent } from '../../models/base-virtual-list-item-component';
import { Component$1 } from '../../models/component.model';
import { CaptureSide, ReasizeBoundsDirective, ResizeEvent } from '../../directives/reasize-bounds.directive';
import { NgVirtualGridService } from '../../ng-virtual-grid.service';

/**
 * Virtual list item component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/components/ng-virtual-list-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid-item',
  imports: [CommonModule, ReasizeBoundsDirective],
  templateUrl: './ng-virtual-grid-item.component.html',
  styleUrl: './ng-virtual-grid-item.component.scss',
  host: {
    'class': 'ngvg__item',
    'part': 'grid-item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualGridItemComponent extends BaseVirtualListItemComponent {
  private static __nextId: number = 0;

  service = inject(NgVirtualGridService);

  private _id!: number;
  get id() {
    return this._id;
  }

  liId: string;

  leftLiId: string | undefined;

  topLiId: string | undefined;

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    this._data = v;

    const rowId = this.rowId, colId = Number(this.columnId);
    this.liId = `li-${this.service.listId}-${rowId}-${colId}`;
    this.leftLiId = this._data?.config.prevColId !== undefined ? `li-${this.service.listId}-${rowId}-${this._data?.config.prevColId}` : undefined;
    this.topLiId = this._data?.config.prevRowId !== undefined ? `li-${this.service.listId}-${this._data?.config.prevRowId}-${colId}` : undefined;

    this.update();

    this.data.set(v);
  }

  get item() {
    return this._data;
  }

  get itemId() {
    return this._data?.id;
  }

  get rowId() {
    return this._data!.rowId;
  }

  get prevRowId() {
    return this._data!.config.prevRowId;
  }

  get columnId() {
    return this._data!.columnId;
  }

  get prevColumnId() {
    return this._data!.config.prevColId;
  }

  itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  set renderer(v: TemplateRef<any> | undefined) {
    this.itemRenderer.set(v);
  }

  private _elementRef: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);
  get element() {
    return this._elementRef.nativeElement;
  }

  private _listItemRef = viewChild<ElementRef<HTMLLIElement>>('listItem');

  private _listItemContentRef = viewChild<ElementRef<HTMLLIElement>>('content');

  constructor() {
    super();
    this._id = NgVirtualGridItemComponent.__nextId = NgVirtualGridItemComponent.__nextId === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualGridItemComponent.__nextId + 1;

    this.liId = `li-${this.service.listId}-${this._id}`;
  }

  private update() {
    const data = this._data;
    if (data) {
      const element = this._elementRef.nativeElement, styles = element.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;
        if (!data.config.isSnappingMethodAdvanced) {
          styles.position = POSITION_STICKY;
        }
      } else {
        styles.position = POSITION_ABSOLUTE;
        styles.transform = `${TRANSLATE_3D}(${data.measures.x}${PX}, ${data.measures.y}${PX} , 0)`;
      }
      styles.height = SIZE_AUTO;
      styles.width = `${data.measures.width}${PX}`;

      const listItem = this._listItemRef();
      if (listItem) {
        const liElement = listItem.nativeElement;
        if (this._data?.config.customSize) {
          liElement.style.height = `${data.measures.height}${PX}`;
          liElement.style.minHeight = 'initial';
        } else {
          liElement.style.minHeight = `${data.measures.height}${PX}`;
          liElement.style.height = 'initial';
        }
      }
    }
  }

  getBounds(): ISize {
    const list = this._listItemRef();
    if (list) {
      const el: HTMLElement = list.nativeElement;
      const { width, height } = el.getBoundingClientRect();
      return { width, height };
    }
    return { width: this.service.minColumnSize, height: this.service.minRowSize };
  }

  getContentBounds(): ISize {
    const content = this._listItemContentRef();
    if (content) {
      const el: HTMLElement = content.nativeElement,
        { width, height } = el.getBoundingClientRect();
      return { width: width, height: height };
    }
    return { width: this.service.minColumnSize, height: this.service.minRowSize };
  }

  show() {
    const styles = this._elementRef.nativeElement.style;

    if (styles.visibility === VISIBILITY_VISIBLE) {
      return;
    }

    styles.visibility = VISIBILITY_VISIBLE;
    styles.zIndex = this._data?.config?.zIndex ?? DEFAULT_ZINDEX;
  }

  hide() {
    const styles = this._elementRef.nativeElement.style;
    if (styles.visibility === VISIBILITY_HIDDEN) {
      return;
    }

    styles.visibility = VISIBILITY_HIDDEN;
    styles.position = POSITION_ABSOLUTE;
    styles.transform = ZEROS_TRANSLATE_3D;
    styles.zIndex = HIDDEN_ZINDEX;
  }

  protected onResizeHandler(event: ResizeEvent) {
    if (this.service.isAjacentResizeCellMode) {
      this.service.onResize(
        event.method === CaptureSide.TOP ? this.prevRowId! : this.rowId!,
        event.method === CaptureSide.LEFT ? this.prevColumnId! : this.columnId!,
        event.width, event.height,
      );
    } else {
      this.service.onResize(
        this.rowId!,
        this.columnId!,
        event.width, event.height,
      );
    }
  }
}

export const TNgVirtualGridItemComponent = NgVirtualGridItemComponent satisfies Component$1<BaseVirtualListItemComponent>;
