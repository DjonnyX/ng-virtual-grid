import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, signal, TemplateRef,
  ViewChild, viewChild, ViewContainerRef,
} from '@angular/core';
import { IRenderVirtualGridItem } from '../../models/render-item.model';
import { ISize } from '../../types';
import {
  DEFAULT_ZINDEX, HIDDEN_ZINDEX, POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT, SIZE_AUTO,
  TRANSLATE_3D, VISIBILITY_HIDDEN, VISIBILITY_VISIBLE, ZEROS_TRANSLATE_3D,
} from '../../const';
import { BaseVirtualGridItemComponent } from '../../models/base-virtual-grid-item-component';
import { Component$1 } from '../../models/component.model';
import { CaptureSide, ResizeEvent } from '../../directives/reasize-bounds.directive';
import { NgVirtualGridService } from '../../ng-virtual-grid.service';

const DEFAULT_PART = 'item item-row',
  PART_ITEM_ODD = ' item-row-odd',
  PART_ITEM_EVEN = ' item-row-even',
  PART_ITEM_BORDER = ' item-row-border',
  PART_ITEM_SNAPPED = ' item-row-snapped';

/**
 * Virtual grid row component
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/components/ng-virtual-grid-row/ng-virtual-grid-row.component.ts
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
export class NgVirtualGridRowComponent extends BaseVirtualGridItemComponent {
  public override getBounds(): ISize {
    throw new Error('Method not implemented.');
  }
  public override getContentBounds(): ISize {
    throw new Error('Method not implemented.');
  }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;
  get listContainerRef() { return this._listContainerRef; }

  service = inject(NgVirtualGridService);

  private _id!: number;
  get id() {
    return this._id;
  }

  private _part = DEFAULT_PART;
  get part() { return this._part; }

  data = signal<IRenderVirtualGridItem | undefined>(undefined);
  private _data: IRenderVirtualGridItem | undefined = undefined;
  set item(v: IRenderVirtualGridItem | undefined) {
    if (this._data === v) {
      return;
    }

    this.updatePartStr(v);

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
    return this._data?.rowId;
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

  set renderer(v: TemplateRef<any> | undefined) { }

  private _elementRef: ElementRef<HTMLElement> = inject(ElementRef<HTMLElement>);
  get element() {
    return this._elementRef.nativeElement;
  }

  private _listItemRef = viewChild<ElementRef<HTMLLIElement>>('listItem');

  private _components: Array<ComponentRef<BaseVirtualGridItemComponent>> = [];
  get components() { return this._components; }

  constructor() {
    super();
    this._id = this.service.generateComponentId();
  }

  createComponent(componentClass: Component$1<BaseVirtualGridItemComponent>): ComponentRef<BaseVirtualGridItemComponent> | null {
    if (this._listContainerRef) {
      const component = this._listContainerRef.createComponent(componentClass);
      this._components.push(component);
      return component;
    }
    return null;
  }

  private updatePartStr(v: IRenderVirtualGridItem | undefined) {
    let odd = false;
    if (v?.index !== undefined) {
      odd = v.index % 2 === 0;
    }

    let part = DEFAULT_PART;
    part += odd ? PART_ITEM_ODD : PART_ITEM_EVEN;
    if (v ? v.config.snapped : false) {
      part += PART_ITEM_SNAPPED;
    }
    if (v ? v.config.border : false) {
      part += PART_ITEM_BORDER;
    }
    this._part = part;
  }

  private update(data: IRenderVirtualGridItem | undefined) {
    if (data) {
      const element = this._elementRef.nativeElement, styles = element.style;
      styles.zIndex = data.config.zIndex;
      styles.position = data.config.snapped ? POSITION_STICKY : POSITION_ABSOLUTE;
      styles.transform = `${TRANSLATE_3D}(0, ${data.measures.y}${PX} , 0)`;
      styles.height = SIZE_AUTO;
      styles.width = SIZE_100_PERSENT;

      const listItem = this._listItemRef();
      if (listItem) {
        const liElement = listItem.nativeElement;
        const rowSizeCache = this.service.getRowSizeById(data.id) ?? data.measures.height;
        if (this._data?.config.customSize) {
          liElement.style.height = `${rowSizeCache}${PX}`;
          liElement.style.maxHeight = `${rowSizeCache}${PX}`;
          liElement.style.minHeight = 'unset';
        } else {
          liElement.style.minHeight = `${rowSizeCache}${PX}`;
          liElement.style.maxHeight = 'unset';
          liElement.style.height = SIZE_AUTO;
        }
      }
    }

    this._data = data;
  }

  show() {
    const styles = this._elementRef.nativeElement.style;

    if (styles.visibility === VISIBILITY_VISIBLE && styles.zIndex !== HIDDEN_ZINDEX) {
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

export const TNgVirtualGridRowComponent = NgVirtualGridRowComponent satisfies Component$1<BaseVirtualGridItemComponent>;
