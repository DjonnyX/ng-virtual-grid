import { TemplateRef, WritableSignal } from '@angular/core';
import { Id, ISize } from '../types';
import { IRenderVirtualGridItem } from './render-item.model';

/**
 * Virtual Grid Item Interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/base-virtual-grid-item-component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export abstract class BaseVirtualGridItemComponent {
    abstract get id(): number;
    abstract get rowId(): Id | undefined;
    abstract get columnId(): Id | undefined;
    abstract data: WritableSignal<IRenderVirtualGridItem | undefined>;
    abstract set item(v: IRenderVirtualGridItem | null | undefined);
    abstract get item(): IRenderVirtualGridItem | null | undefined;
    abstract get itemId(): Id | undefined;
    abstract itemRenderer: WritableSignal<TemplateRef<any> | undefined>;
    abstract set renderer(v: TemplateRef<any> | undefined);
    abstract get element(): HTMLElement;
    public abstract getBounds(): ISize;
    public abstract getContentBounds(): ISize;
    public abstract show(): void;
    public abstract hide(): void;
}