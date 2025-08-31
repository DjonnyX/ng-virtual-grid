import { ComponentRef } from "@angular/core";
import { Id, ISize } from "../types";
import { BaseVirtualGridItemComponent } from "../models/base-virtual-grid-item-component";
import { IRenderVirtualGridCollection } from "../models/render-collection.model";
import { NgVirtualGridRowComponent } from "../components/ng-virtual-grid-row/ng-virtual-grid-row.component";
import { CMap } from "./cacheMap";

type TrackingPropertyId = string | number;

export interface IVirtualGridItemComponent<I = any> {
    getBounds(): ISize;
    itemId: Id;
    id: number;
    item: I | null;
    show: () => void;
    hide: () => void;
}

/**
 * Tracks display items by property
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/utils/tracker.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class Tracker<C extends BaseVirtualGridItemComponent = any> {
    /**
     * display objects dictionary of indexes by id
     */
    protected _displayObjectIndexMapById: { [componentId: number]: number } = {};

    set displayObjectIndexMapById(v: { [componentId: number]: number }) {
        if (this._displayObjectIndexMapById === v) {
            return;
        }

        this._displayObjectIndexMapById = v;
    }

    get displayObjectIndexMapById() {
        return this._displayObjectIndexMapById;
    }

    /**
     * Dictionary displayItems propertyNameId by items propertyNameId
     */
    protected _trackRowMap = new CMap<TrackingPropertyId, number>();

    /**
     * Dictionary displayItems propertyNameId by items propertyNameId
     */
    protected _trackCellMap = new CMap<TrackingPropertyId, number>();

    protected _trackingPropertyName!: string;

    set trackingPropertyName(v: string) {
        this._trackingPropertyName = v;
    }

    constructor(trackingPropertyName: string) {
        this._trackingPropertyName = trackingPropertyName;
    }

    /**
     * tracking by propName
     */
    track(rows: IRenderVirtualGridCollection | null | undefined, items: Array<IRenderVirtualGridCollection> | null | undefined,
        rowComponents: Array<ComponentRef<C>> | null | undefined): void {
        if (rows && rowComponents) {
            if (items && rowComponents) {
                this.trackRowComponents(rows, rowComponents);
                this.trackColumnComponents(items, rowComponents);
            }
        }
    }

    private trackRowComponents(items: IRenderVirtualGridCollection | null | undefined, components: Array<ComponentRef<C>> | null | undefined) {
        if (!items || !components) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components], newTrackItems = [];
        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], itemTrackingProperty = (item as any)[idPropName];

            if (this._trackRowMap.has(itemTrackingProperty)) {
                const displayObjectId = this._trackRowMap.get(itemTrackingProperty),
                    compIndex = this._displayObjectIndexMapById[displayObjectId],
                    comp = components[compIndex],
                    compId = comp?.instance?.id;
                if (comp !== undefined && compId !== undefined && compId === displayObjectId) {
                    const indexByUntrackedItems = untrackedItems.findIndex(v => {
                        return v.instance.id === compId;
                    });
                    if (indexByUntrackedItems > -1) {
                        comp.instance.item = item;
                        comp.instance.show();

                        untrackedItems.splice(indexByUntrackedItems, 1);
                        continue;
                    }
                }
                this._trackRowMap.delete(itemTrackingProperty);
            }

            if (untrackedItems.length > 0) {
                newTrackItems.push(item);
            }
        }

        for (let i = 0, l = newTrackItems.length; i < l; i++) {
            const item = newTrackItems[i], itemTrackingProperty = (item as any)[idPropName];
            if (untrackedItems.length > 0) {
                const comp = untrackedItems.shift();
                if (comp) {
                    comp.instance.item = item;
                    comp.instance.show();

                    this._trackRowMap.set(itemTrackingProperty, comp.instance.id);
                }
            }
        }

        if (untrackedItems.length > 0) {
            for (let i = 0, l = untrackedItems.length; i < l; i++) {
                const comp = untrackedItems[i];
                comp.instance.item = null;
                comp.instance.hide();

                this._trackRowMap.delete(comp.instance.id);
            }
        }
    }

    trackColumnComponents(items: Array<IRenderVirtualGridCollection> | null | undefined, rowComponents: Array<ComponentRef<C>> | null | undefined) {
        if (!items || !rowComponents) {
            return;
        }
        const itemsByRowId: { [rowId: Id]: IRenderVirtualGridCollection } = {};
        for (let i = 0, l = items.length; i < l; i++) {
            const cells = items[i];
            for (let j = 0, l1 = cells.length; j < l1; j++) {
                const cell = cells[j], rowId = cell.rowId;
                if (rowId === undefined) {
                    continue;
                }
                if (!itemsByRowId.hasOwnProperty(rowId)) {
                    itemsByRowId[rowId] = [];
                }
                itemsByRowId[rowId].push(cell);
            }
        }

        const trackRowMap: { [id: Id]: number } = {}, idPropName = this._trackingPropertyName;
        for (let i = 0, l = rowComponents.length; i < l; i++) {
            const rowComponent = rowComponents[i].instance as unknown as NgVirtualGridRowComponent, rowId = rowComponent.itemId;
            if (rowId === undefined) {
                continue;
            }
            const components = rowComponent.components, rowItems = itemsByRowId[rowId], untrackedItems = [...components], newTrackItems = [];
            if (!rowItems) {
                continue;
            }
            for (let j = 0, l1 = rowItems.length; j < l1; j++) {
                const cell = rowItems[j], itemTrackingProperty = (cell as any)[idPropName];
                if (this._trackCellMap.has(itemTrackingProperty)) {
                    const displayObjectId = this._trackCellMap.get(itemTrackingProperty),
                        compIndex = this._displayObjectIndexMapById[displayObjectId],
                        comp = components[compIndex],
                        compId = comp?.instance?.id;
                    if (comp !== undefined && compId !== undefined && compId === displayObjectId) {
                        const indexByUntrackedItems = untrackedItems.findIndex(v => {
                            return v.instance.id === compId;
                        });
                        if (indexByUntrackedItems > -1) {
                            comp.instance.item = cell;
                            comp.instance.show();

                            untrackedItems.splice(indexByUntrackedItems, 1);
                            continue;
                        }
                    }
                    this._trackCellMap.delete(itemTrackingProperty);
                }

                if (untrackedItems.length > 0) {
                    newTrackItems.push(cell);
                }
            }

            for (let j = 0, l1 = newTrackItems.length; j < l1; j++) {
                const cell = newTrackItems[j], itemTrackingProperty = (cell as any)[idPropName];
                if (untrackedItems.length > 0) {
                    const comp = untrackedItems.shift();
                    if (comp) {
                        comp.instance.item = cell;
                        comp.instance.show();

                        this._trackCellMap.set(itemTrackingProperty, comp.instance.id);
                    }
                }
            }

            if (untrackedItems.length > 0) {
                for (let j = 0, l1 = untrackedItems.length; j < l1; j++) {
                    const comp = untrackedItems[j];
                    comp.instance.item = null;
                    comp.instance.hide();

                    this._trackCellMap.delete(comp.instance.id);
                }
            }

            if (rowId !== undefined) {
                trackRowMap[rowId] = i;
            }
        }
    }

    untrackComponentByIdProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        if ((component as any)[propertyIdName] !== undefined) {
            this._trackCellMap.delete(propertyIdName);
        }
    }

    dispose() {
        if (this._trackRowMap) {
            this._trackRowMap.clear();
        }
        if (this._trackCellMap) {
            this._trackCellMap.clear();
        }
    }
}