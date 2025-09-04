import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { IRenderVirtualGridItem } from '../../models/render-item.model';
import { ISize } from '../../types';
import {
  DEFAULT_ZINDEX, DISPLAY_BLOCK, DISPLAY_NONE, HIDDEN_ZINDEX, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT,
  SIZE_AUTO, TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../../const';
import { BaseVirtualGridItemComponent } from '../../models/base-virtual-grid-item-component';
import { Component$1 } from '../../models/component.model';
import { CaptureSide, ReasizeBoundsDirective, ResizeEvent } from '../../directives/reasize-bounds.directive';
import { NgVirtualGridService } from '../../ng-virtual-grid.service';

/**
 * Virtual grid item component
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/components/ng-virtual-grid-item/ng-virtual-grid-item.component.ts
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
export class NgVirtualGridItemComponent extends BaseVirtualGridItemComponent {
  private static __nextId: number = 0;

  service = inject(NgVirtualGridService);

  private _id!: number;
  get id() {
    return this._id;
  }

  liId: string;

  leftLiId: string | undefined;

  topLiId: string | undefined;

  data = signal<IRenderVirtualGridItem | undefined>(undefined);
  private _data: IRenderVirtualGridItem | undefined = undefined;
  set item(v: IRenderVirtualGridItem | undefined) {
    if (this._data === v) {
      return;
    }

    const rowId = v?.rowId, colId = Number(v?.columnId);
    this.liId = `g-${this.service.gridId}-${rowId}-${colId}`;
    this.leftLiId = v?.config.prevColId !== undefined ? `g-${this.service.gridId}-${rowId}-${v?.config.prevColId}` : undefined;
    this.topLiId = v?.config.prevRowId !== undefined ? `g-${this.service.gridId}-${v?.config.prevRowId}-${colId}` : undefined;

    this.update(v);

    this.data.set(v);
  }

  get item() {
    return this._data;
  }

  get itemId() {
    return this._data?.id ?? -1;
  }

  get rowId() {
    return this._data?.rowId ?? -1;
  }

  get prevRowId() {
    return this._data?.config.prevRowId;
  }

  get columnId() {
    return this._data?.columnId ?? -1;
  }

  get prevColumnId() {
    return this._data?.config.prevColId;
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
    this._id = this.service.generateComponentId();

    this.liId = `li-${this.service.gridId}-${this._id}`;
  }

  private update(data: IRenderVirtualGridItem | undefined) {
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
      styles.transform = `${TRANSLATE_3D}(${data.measures.x}${PX}, 0 , 0)`;
      styles.height = SIZE_AUTO;
      styles.width = `${data.measures.width}${PX}`;

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
          liElement.style.height = SIZE_AUTO;
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
    if (styles.visibility === VISIBILITY_VISIBLE && styles.zIndex !== HIDDEN_ZINDEX) {
      return;
    }

    styles.visibility = VISIBILITY_VISIBLE;
    styles.zIndex = this._data?.config?.zIndex || DEFAULT_ZINDEX;
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

  onClickHandler() {
    this.service.itemClick(this._data);
  }
}

export const TNgVirtualGridItemComponent = NgVirtualGridItemComponent satisfies Component$1<BaseVirtualGridItemComponent>;
