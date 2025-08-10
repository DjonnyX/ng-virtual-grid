import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef } from '@angular/core';
import { IRenderVirtualListItem } from '../../models/render-item.model';
import { ISize } from '../../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, POSITION_ABSOLUTE, POSITION_STICKY, PX,
  SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../../const';
import { BaseVirtualListItemComponent } from '../../models/base-virtual-list-item-component';
import { Component$1 } from '../../models/component.model';
import { CaptureSide, ResizeEvent } from '../../directives/reasize-bounds.directive';
import { NgVirtualGridService } from '../../ng-virtual-grid.service';

/**
 * Virtual grid row component
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-grid/src/lib/components/ng-virtual-grid-row.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid-row',
  imports: [CommonModule],
  templateUrl: './ng-virtual-grid-row.component.html',
  styleUrl: './ng-virtual-grid-row.component.scss',
  host: {
    'class': 'ngvg__item',
    'part': 'grid-item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualGridRowComponent extends BaseVirtualListItemComponent {
  private static __nextId: number = 0;

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;
  get listContainerRef() { return this._listContainerRef; }

  service = inject(NgVirtualGridService);

  private _id!: number;
  get id() {
    return this._id;
  }

  odd = false;

  data = signal<IRenderVirtualListItem | undefined>(undefined);
  private _data: IRenderVirtualListItem | undefined = undefined;
  set item(v: IRenderVirtualListItem | undefined) {
    if (this._data === v) {
      return;
    }

    this.odd = (v?.index ?? 0) % 2 === 0;

    this.update(v);

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
    this._id = NgVirtualGridRowComponent.__nextId = NgVirtualGridRowComponent.__nextId === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualGridRowComponent.__nextId + 1;
  }

  private update(data: IRenderVirtualListItem | undefined) {
    if (data) {
      const isNewItem = this.itemId !== data.id, content = this._listItemContentRef(), elementContent = content?.nativeElement;
      if (isNewItem) {
        if (elementContent) {
          elementContent.style.display = DISPLAY_NONE;
        }
      }

      const element = this._elementRef.nativeElement, styles = element.style;
      styles.zIndex = data.config.zIndex;
      styles.position = data.config.snapped ? POSITION_STICKY : POSITION_ABSOLUTE;
      styles.transform = `${TRANSLATE_3D}(0, ${data.measures.y}${PX} , 0)`;
      styles.height = SIZE_AUTO;
      styles.width = SIZE_100_PERSENT;

      const listItem = this._listItemRef();
      if (listItem) {
        const liElement = listItem.nativeElement;
        if (this._data?.config.customSize) {
          liElement.style.height = `${data.measures.height}${PX}`;
          liElement.style.maxHeight = `${data.measures.height}${PX}`;
          liElement.style.minHeight = 'unset';
        } else {
          liElement.style.minHeight = `${data.measures.height}${PX}`;
          liElement.style.maxHeight = 'unset';
          liElement.style.height = 'unset';
        }
      }

      if (isNewItem && elementContent) {
        elementContent.style.display = DISPLAY_BLOCK;
      }
    }

    this._data = data;
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
    return this.getBounds();
    // const content = this._listItemContentRef();
    // if (content) {
    //   const el: HTMLElement = content.nativeElement,
    //     { width, height } = el.getBoundingClientRect();
    //   return { width: width, height: height };
    // }
    // return { width: this.service.minColumnSize, height: this.service.minRowSize };
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

export const TNgVirtualGridRowComponent = NgVirtualGridRowComponent satisfies Component$1<BaseVirtualListItemComponent>;
