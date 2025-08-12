import { ComponentRef } from "@angular/core";
import { ScrollDirection, VirtualGridRow } from "../models";
import { Id, ISize } from "../types";
import { BaseVirtualListItemComponent } from "../models/base-virtual-list-item-component";
import { IRenderVirtualListCollection } from "../models/render-collection.model";
import { NgVirtualGridRowComponent } from "../components/ng-virtual-grid-row/ng-virtual-grid-row.component";

type TrackingPropertyId = string | number;

export interface IVirtualListItemComponent<I = any> {
    getBounds(): ISize;
    itemId: Id;
    id: number;
    item: I | null;
    show: () => void;
    hide: () => void;
}

/**
 * Tracks display items by property
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/tracker.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class Tracker<C extends BaseVirtualListItemComponent = any> {
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
    protected _trackMap: { [id: TrackingPropertyId]: number } = {};

    /**
     * Dictionary displayItems propertyNameId by items propertyNameId
     */
    protected _trackRowMap: { [id: TrackingPropertyId]: number } = {};

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
    track(rows: IRenderVirtualListCollection | null | undefined, items: Array<IRenderVirtualListCollection> | null | undefined,
        rowComponents: Array<ComponentRef<C>> | null | undefined): void {
        if (rows && rowComponents) {
            // НЕОБХОДИМО КОРРЕКТНО ПРОТРЕЧИТЬ ЯЧЕЙКИ!!!

            if (items && rowComponents) {
                const itemsByRowId: { [rowId: Id]: IRenderVirtualListCollection } = {};
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
                this.trackRowComponents(rows, rowComponents);

                for (const rowId in itemsByRowId) {
                    const componentsIndex = this._trackRowMap[rowId];
                    if (componentsIndex === undefined) {
                        continue;
                    }
                    const cells = itemsByRowId[rowId], cellComponents = (rowComponents[componentsIndex].instance as unknown as NgVirtualGridRowComponent).components as Array<ComponentRef<C>>;
                    this.trackCellComponents(cells, cellComponents);
                }
            }
        }
    }

    private trackRowComponents(items: IRenderVirtualListCollection | null | undefined, components: Array<ComponentRef<C>> | null | undefined) {
        if (!items || !components) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components];

        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], itemTrackingProperty = (item as any)[idPropName];

            if (this._trackMap.hasOwnProperty(itemTrackingProperty)) {
                const displayObjectId = this._trackMap[itemTrackingProperty],
                    compIndex = this._displayObjectIndexMapById[displayObjectId],
                    comp = components[compIndex],
                    compId = comp?.instance?.id;
                if (comp !== undefined && compId !== undefined && compId === displayObjectId) {
                    const indexByUntrackedItems = untrackedItems.findIndex(v => {
                        return v.instance.id === compId;
                    });
                    if (indexByUntrackedItems > -1) {
                        this._trackRowMap[itemTrackingProperty] = i;
                        comp.instance.item = item;

                        comp.instance.show();
                        untrackedItems.splice(indexByUntrackedItems, 1);
                        continue;
                    }
                }
                delete this._trackMap[itemTrackingProperty];
                delete this._trackRowMap[itemTrackingProperty];
            }

            if (untrackedItems.length > 0) {
                const comp = untrackedItems.shift(), item = items[i];
                if (comp) {
                    comp.instance.item = item;
                    comp.instance.show();

                    this._trackRowMap[itemTrackingProperty] = i;
                    this._trackMap[itemTrackingProperty] = comp.instance.id;
                }
            }
        }

        if (untrackedItems.length) {
            for (let i = 0, l = untrackedItems.length; i < l; i++) {
                const comp = untrackedItems[i];
                comp.instance.hide();
            }
        }
    }

    private trackCellComponents(items: IRenderVirtualListCollection | null | undefined, components: Array<ComponentRef<C>> | null | undefined) {
        if (!items || !components) {
            return;
        }

        const idPropName = this._trackingPropertyName, untrackedItems = [...components];

        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], itemTrackingProperty = (item as any)[idPropName];

            // if (this._trackMap.hasOwnProperty(itemTrackingProperty)) {
            //     const displayObjectId = this._trackMap[itemTrackingProperty],
            //         compIndex = this._displayObjectIndexMapById[displayObjectId],
            //         comp = components[compIndex],
            //         compId = comp?.instance?.id;
            //     if (comp !== undefined && compId !== undefined && compId === displayObjectId) {
            //         const indexByUntrackedItems = untrackedItems.findIndex(v => {
            //             return v.instance.id === compId;
            //         });
            //         if (indexByUntrackedItems > -1) {
            //             comp.instance.item = item;
            //             comp.instance.show();
            //             untrackedItems.splice(indexByUntrackedItems, 1);
            //             continue;
            //         }
            //     }
            //     delete this._trackMap[itemTrackingProperty];
            // }

            if (untrackedItems.length > 0) {
                const comp = untrackedItems.shift(), item = items[i];
                if (comp) {
                    comp.instance.item = item;
                    comp.instance.show();

                    this._trackMap[itemTrackingProperty] = comp.instance.id;
                }
            }
        }

        if (untrackedItems.length) {
            for (let i = 0, l = untrackedItems.length; i < l; i++) {
                const comp = untrackedItems[i];
                comp.instance.hide();
            }
        }
    }

    untrackComponentByIdProperty(component?: C): void {
        if (!component) {
            return;
        }

        const propertyIdName = this._trackingPropertyName;

        if ((component as any)[propertyIdName] !== undefined) {
            delete this._trackMap[propertyIdName];
        }
    }

    dispose() {

    }
}