import { ComponentRef } from "@angular/core";
import { IRenderVirtualListCollection, } from "../models/render-collection.model";
import { IRenderVirtualListItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { CacheMap, CMap } from "./cacheMap";
import { Tracker } from "./tracker";
import { IPoint, IRect, ISize } from "../types";
import { DEFAULT_BUFFER_SIZE, DEFAULT_COLUMN_SIZE, DEFAULT_ROW_SIZE, HEIGHT_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME } from "../const";
import { IColumnsSize, IRowsSize, IVirtualGridStickyMap, VirtualGridRow } from "../models";
import { bufferInterpolation } from "./buffer-interpolation";
import { BaseVirtualListItemComponent } from "../models/base-virtual-list-item-component";

export const TRACK_BOX_CHANGE_EVENT_NAME = 'change';

export interface IMetrics {
    delta: number;
    normalizedItemWidth: number;
    normalizedItemHeight: number;
    width: number;
    height: number;
    itemSize: number;
    itemsFromStartToScrollEnd: number;
    itemsFromStartToDisplayEnd: number;
    itemsOnDisplayWeight: number;
    itemsOnDisplayLength: number;
    isVertical: boolean;
    leftHiddenItemsWeight: number;
    leftItemLength: number;
    leftItemsWeight: number;
    renderItems: number;
    rightItemLength: number;
    rightItemsWeight: number;
    scrollSize: number;
    leftSizeOfAddedItems: number;
    sizeProperty: typeof HEIGHT_PROP_NAME | typeof WIDTH_PROP_NAME;
    snap: boolean;
    snippedPos: number;
    startIndex: number;
    startPosition: number;
    totalItemsToDisplayEndWeight: number;
    totalLength: number;
    totalSize: number;
    typicalItemSize: number;
    isFromItemIdFound: boolean;
    rowSize: number;
    rowId: Id;
    startY?: number;
}

export interface IRecalculateMetricsOptions<I extends { id: Id }, C extends Array<I>> {
    bounds: ISize;
    collection: C;
    isVertical: boolean;
    itemSize: number;
    rowSize: number; // del
    bufferSize: number;
    maxBufferSize: number;
    scrollSize: number;
    snap: boolean;
    enabledBufferOptimization: boolean;
    fromItemId?: Id;
    crudDetected: boolean;
    deletedItemsMap: { [index: number]: ISize; };
    rowId?: Id;
    y?: number;
}

export interface IGetItemPositionOptions<I extends { id: Id }, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap'> { }

export interface IUpdateCollectionOptions<I extends { id: Id }, C extends Array<I>>
    extends Omit<IRecalculateMetricsOptions<I, C>, 'collection' | 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap' | 'scrollSize'
        | 'isVertical'> {
    scrollSizeX: number;
    scrollSizeY: number;
}

export type CacheMapEvents = typeof TRACK_BOX_CHANGE_EVENT_NAME;

export type OnChangeEventListener = (version: number) => void;

export type CacheMapListeners = OnChangeEventListener;

export enum ItemDisplayMethods {
    CREATE,
    UPDATE,
    DELETE,
    NOT_CHANGED,
}

export interface IUpdateCollectionReturns {
    displayItems: IRenderVirtualListCollection;
    totalSize: number;
    totalHeight: number;
    delta: number;
    crudDetected: boolean;
}

const DEFAULT_BUFFER_EXTREMUM_THRESHOLD = 15,
    DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH = 30,
    DEFAULT_RESET_BUFFER_SIZE_TIMEOUT = 10000;

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/utils/trackBox.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox<C extends BaseVirtualListItemComponent = any>
    extends CacheMap<Id, ISize & { method?: ItemDisplayMethods }, CacheMapEvents, CacheMapListeners> {

    protected _tracker!: Tracker<C>;

    protected _items: IRenderVirtualListCollection | null | undefined;

    set items(v: IRenderVirtualListCollection | null | undefined) {
        if (this._items === v) {
            return;
        }

        this._items = v;
    }

    protected _displayComponents: Array<ComponentRef<C>> | null | undefined;

    set displayComponents(v: Array<ComponentRef<C>> | null | undefined) {
        if (this._displayComponents === v) {
            return;
        }

        this._displayComponents = v;
    }

    protected _snapedDisplayComponent: ComponentRef<C> | null | undefined;

    set snapedDisplayComponent(v: ComponentRef<C> | null | undefined) {
        if (this._snapedDisplayComponent === v) {
            return;
        }

        this._snapedDisplayComponent = v;
    }

    protected _isSnappingMethodAdvanced: boolean = false;

    set isSnappingMethodAdvanced(v: boolean) {
        if (this._isSnappingMethodAdvanced === v) {
            return;
        }

        this._isSnappingMethodAdvanced = v;
    }

    /**
     * Set the trackBy property
     */
    set trackingPropertyName(v: string) {
        this._trackingPropertyName = this._tracker.trackingPropertyName = v;
    }

    protected _trackingPropertyName: string = TRACK_BY_PROPERTY_NAME;

    constructor(trackingPropertyName: string) {
        super();

        this._trackingPropertyName = trackingPropertyName;

        this.initialize();
    }

    protected initialize() {
        this._tracker = new Tracker(this._trackingPropertyName);
    }

    override set(id: Id, bounds: ISize): CMap<Id, ISize> {
        if (this._map.has(id)) {
            const b = this._map.get(id);
            if (b?.width === bounds.width && b.height === bounds.height) {
                return this._map;
            }
        }

        const v = this._map.set(id, bounds);

        this.bumpVersion();
        return v;
    }

    protected _previousCollection: Array<{ id: Id; }> | null | undefined;

    protected _deletedItemsMap: { [index: number]: ISize } = {};

    protected _crudDetected = false;
    get crudDetected() { return this._crudDetected; }

    protected override fireChangeIfNeed() {
        if (this.changesDetected()) {
            this.dispatch(TRACK_BOX_CHANGE_EVENT_NAME, this._version);
        }
    }

    protected _previousScrollSizeX: { [id: Id]: number } = {};

    protected _previousScrollSizeY = 0;

    protected _scrollDelta: number = 0;
    get scrollDelta() { return this._scrollDelta; }

    isAdaptiveBuffer = true;

    protected _bufferSequenceExtraThreshold = DEFAULT_BUFFER_EXTREMUM_THRESHOLD;

    protected _maxBufferSequenceLength = DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH;

    protected _bufferSizeSequenceX: Array<number> = [];

    protected _bufferSizeSequenceY: Array<number> = [];

    protected _bufferSizeX: { [id: Id]: number } = {};
    get bufferSizeX() { return this._bufferSizeX; }

    protected _bufferSizeY: number = 0;
    get bufferSizeY() { return this._bufferSizeY; }

    protected _defaultBufferSize: number = 0;

    protected _maxBufferSize: number = this._defaultBufferSize;

    protected _resetBufferSizeTimeout: number = DEFAULT_RESET_BUFFER_SIZE_TIMEOUT;

    protected _resetBufferSizeTimer: number | undefined;

    protected _customSizeMap = new CMap<Id, boolean>();

    updateRowsSize(v: IRowsSize) {
        if (!v) {
            return;
        }
        for (let id in v) {
            const value = v[id];
            this._customSizeMap.set(id, value !== undefined);
            this.set(id, { ...this.get(id) || {}, height: value } as any);
        }
    }

    getRowSizeById(id: Id) {
        return this.get(id)?.height ?? DEFAULT_ROW_SIZE;
    }

    updateColumnSize(v: IColumnsSize) {
        if (!v) {
            return;
        }
        for (let id in v) {
            const value = v[id];
            this._customSizeMap.set(id, value !== undefined);
            this.set(id, { ...this.get(id) || {}, width: value } as any);
        }
    }

    getColumnSizeById(id: Id) {
        return this.get(id)?.width ?? DEFAULT_COLUMN_SIZE;
    }

    protected override lifeCircle() {
        this.fireChangeIfNeed();

        this.lifeCircleDo();
    }

    /**
     * Scans the collection for deleted items and flushes the deleted item cache.
     */
    resetCollection<I extends { id: Id; columns: Array<I & { rowId?: Id; }>; }, C extends Array<I>>(currentCollection: C | null | undefined,
        rowSize: number, itemSize: number): void {
        if (currentCollection !== undefined && currentCollection !== null && currentCollection === this._previousCollection) {
            console.warn('Attention! The collection must be immutable.');
            return;
        }

        if (currentCollection) {
            const collection: Array<I> = [];
            for (let i = 0, l = currentCollection.length; i < l; i++) {
                const item = currentCollection[i], subCollection = item.columns.map((v, index) => ({
                    ...v,
                    rowId: item.id,
                    columnId: index,
                }));
                this._map.set(item.id, { width: itemSize, height: rowSize, method: ItemDisplayMethods.NOT_CHANGED });
                collection.push(item, ...subCollection);
            }
            this.updateCache(this._previousCollection, collection, rowSize, itemSize);
            this._previousCollection = collection;
        } else {
            this._previousCollection = null;
        }
    }

    /**
     * Update the cache of items from the list
     */
    protected updateCache<I extends { id: Id; }, C extends Array<I>>(previousCollection: C | null | undefined, currentCollection: C | null | undefined,
        rowSize: number, itemSize: number): void {
        let crudDetected = false;

        if (!currentCollection || currentCollection.length === 0) {
            if (previousCollection) {
                // deleted
                for (let i = 0, l = previousCollection.length; i < l; i++) {
                    const item = previousCollection[i], id = item.id;
                    crudDetected = true;
                    if (this._map.has(id)) {
                        this._map.delete(id);
                    }
                }
            }
            return;
        }
        if (!previousCollection || previousCollection.length === 0) {
            if (currentCollection) {
                // added
                for (let i = 0, l = currentCollection.length; i < l; i++) {
                    crudDetected = true;
                    const item = currentCollection[i], id = item.id;
                    this._map.set(id, { width: itemSize, height: rowSize, method: ItemDisplayMethods.CREATE });
                }
            }
            return;
        }
        const collectionDict: { [id: Id]: I } = {};
        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i];
            if (item) {
                collectionDict[item.id] = item;
            }
        }
        const notChangedMap: { [id: Id]: I } = {}, deletedMap: { [id: Id]: I } = {}, deletedItemsMap: { [index: number]: ISize } = {}, updatedMap: { [id: Id]: I } = {};
        for (let i = 0, l = previousCollection.length; i < l; i++) {
            const item = previousCollection[i], id = item.id;
            if (item) {
                if (collectionDict.hasOwnProperty(id)) {
                    if (item === collectionDict[id]) {
                        // not changed
                        notChangedMap[item.id] = item;
                        this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: rowSize }), method: ItemDisplayMethods.NOT_CHANGED });
                        continue;
                    } else {
                        // updated
                        crudDetected = true;
                        updatedMap[item.id] = item;
                        this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: rowSize }), method: ItemDisplayMethods.UPDATE });
                        continue;
                    }
                }

                // deleted
                crudDetected = true;
                deletedMap[item.id] = item;
                deletedItemsMap[i] = this._map.get(item.id);
                this._map.delete(id);
            }
        }

        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i], id = item.id;
            if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) && !notChangedMap.hasOwnProperty(id)) {
                // added
                crudDetected = true;
                this._map.set(id, { width: itemSize, height: rowSize, method: ItemDisplayMethods.CREATE });
            }
        }
        this._crudDetected = crudDetected;
        this._deletedItemsMap = deletedItemsMap;
    }

    /**
     * Finds the position of a collection element by the given Id
     */
    getItemPosition<I extends { id: Id }, C extends Array<I>>(id: Id, stickyMap: IVirtualGridStickyMap,
        options: IGetItemPositionOptions<I, C>): IPoint {
        const opt = { fromItemId: id, stickyMap, ...options };
        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        const { scrollSize, isFromItemIdFound } = this.recalculateMetrics({
            ...opt,
            crudDetected: this._crudDetected,
            deletedItemsMap: this._deletedItemsMap,
            y: 0,
        });
        return {
            x: isFromItemIdFound ? scrollSize : -1,
            y: 0,
        };
    }

    /**
     * Updates the collection of display objects
     */
    updateCollection<I extends { id: Id, rowId?: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualGridStickyMap,
        options: IUpdateCollectionOptions<I, C>): IUpdateCollectionReturns {
        const opt = { stickyMap, ...options }, crudDetected = this._crudDetected, deletedItemsMap = this._deletedItemsMap;

        this.cacheElements();

        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        const currentDelta = this._deltaX;

        let maxDelta = -1, columnsTotalSize = 0, displayItemCollection = Array<any>();

        const rowMetrics = this.recalculateMetrics({
            ...opt,
            collection: items,
            scrollSize: opt.scrollSizeY,
            crudDetected: this._crudDetected,
            itemSize: opt.rowSize,
            deletedItemsMap,
            isVertical: true,
            bufferSize: this._bufferSizeY,
            y: 0,
        });

        const rowDisplayItems = this.generateDisplayCollection(items, stickyMap, { ...rowMetrics } as any);

        for (let i = 0, l = rowDisplayItems.length; i < l; i++) {
            const item = rowDisplayItems[i], rowId = item.id, columnsCollection = (item.data as VirtualGridRow).columns;
            const metrics = this.recalculateMetrics({
                ...opt,
                collection: columnsCollection,
                scrollSize: opt.scrollSizeX,
                crudDetected: this._crudDetected,
                deletedItemsMap,
                isVertical: false,
                bufferSize: this._bufferSizeX[rowId] ?? DEFAULT_BUFFER_SIZE,
                rowSize: this.get(item.id)?.height ?? rowMetrics.rowSize,
                y: item.measures.y,
            });

            const deltaX = currentDelta + metrics.delta;
            maxDelta = metrics.delta;
            columnsTotalSize = metrics.totalSize;

            const { scrollSize, bufferSize } = this.updateAdaptiveBufferParams(metrics, l, deltaX,
                this._previousScrollSizeX[rowId] ?? 0, '_bufferSizeX', '_bufferSizeSequenceX', rowId);
            this._previousScrollSizeX[rowId] = scrollSize;
            this._bufferSizeX[rowId] = bufferSize;

            const displayItems = this.generateDisplayCollection(columnsCollection, stickyMap, { ...metrics, rowId });

            displayItemCollection.push(displayItems);
        }

        this.snapshot();

        this._deltaX += maxDelta;

        this._deltaY += rowMetrics.delta;

        const { scrollSize, bufferSize } = this.updateAdaptiveBufferParams(rowMetrics, rowDisplayItems.length,
            rowMetrics.delta, this._previousScrollSizeY, '_bufferSizeY', '_bufferSizeSequenceY');
        this._previousScrollSizeY = scrollSize;
        this._bufferSizeY = bufferSize;

        this._deletedItemsMap = {};

        this._crudDetected = false;

        return { displayItems: displayItemCollection.flat(), totalSize: columnsTotalSize, totalHeight: rowMetrics.totalSize, delta: rowMetrics.delta, crudDetected };
    }

    /**
     * Finds the closest element in the collection by scrollSize
     */
    getNearestItem<I extends { id: Id }, C extends Array<I>>(scrollSize: number, items: C, itemSize: number, isVertical: boolean): I | undefined {
        return this.getElementFromStart(scrollSize, items, this._map, itemSize, isVertical);
    }

    protected updateAdaptiveBufferParams(metrics: IMetrics, totalItemsLength: number, delta: number,
        previousScrollSize: number, bufferSizeName: string, bufferSizeSequenceName: string, rowId?: Id) {
        this.disposeClearBufferSizeTimer();

        const ctx = this as any;
        const scrollSize = metrics.scrollSize + delta, actualDelta = Math.abs(previousScrollSize - scrollSize);
        const bufferRawSize = Math.min(Math.floor(delta / metrics.typicalItemSize) * 5, totalItemsLength),
            minBufferSize = bufferRawSize < this._defaultBufferSize ? this._defaultBufferSize : bufferRawSize,
            bufferValue = minBufferSize > this._maxBufferSize ? this._maxBufferSize : minBufferSize;

        const buffPropertyValue = ctx[bufferSizeName];
        const bufferSize = bufferInterpolation(typeof buffPropertyValue === 'object' && rowId !== undefined ? buffPropertyValue[rowId] : buffPropertyValue,
            ctx[bufferSizeSequenceName], bufferValue, {
            extremumThreshold: this._bufferSequenceExtraThreshold,
            bufferSize: this._maxBufferSequenceLength,
        });

        this.startResetBufferSizeTimer(bufferSizeName, bufferSizeSequenceName, rowId);

        return { scrollSize, bufferSize };
    }

    protected startResetBufferSizeTimer(bufferSizeName: string, bufferSizeSequenceName: string, rowId?: Id) {
        this._resetBufferSizeTimer = setTimeout(() => {
            const ctx = this as any;
            const buffPropertyValue = ctx[bufferSizeName];
            if (typeof buffPropertyValue === 'object' && rowId !== undefined) {
                buffPropertyValue[rowId] = this._defaultBufferSize;
            } else {
                ctx[bufferSizeName] = this._defaultBufferSize;
            }
            ctx[bufferSizeName] = this._defaultBufferSize;
            ctx[bufferSizeSequenceName] = [];
        }, this._resetBufferSizeTimeout) as unknown as number;
    }

    protected disposeClearBufferSizeTimer() {
        clearTimeout(this._resetBufferSizeTimer);
    }

    /**
     * Calculates the position of an element based on the given scrollSize
     */
    protected getElementFromStart<I extends { id: Id }, C extends Array<I>>(scrollSize: number, collection: C, map: CMap<Id, ISize>,
        typicalItemSize: number, isVertical: boolean): I | undefined {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0;
        for (let i = 0, l = collection.length; i < l; i++) {
            const item = collection[i];
            let itemSize = 0;
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                itemSize = bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            if (offset > scrollSize) {
                return item;
            }
            offset += itemSize;
        }
        return undefined;
    }

    /**
     * Calculates the entry into the overscroll area and returns the number of overscroll elements
     */
    protected getElementNumToEnd<I extends { id: Id }, C extends Array<I>>(i: number, collection: C, map: CMap<Id, ISize>, typicalItemSize: number,
        size: number, isVertical: boolean, indexOffset: number = 0): { num: number, offset: number } {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = 0, num = 0;
        for (let j = collection.length - indexOffset - 1; j >= i; j--) {
            const item = collection[j];
            let itemSize = 0;
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                itemSize = bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            offset += itemSize;
            num++;
            if (offset > size) {
                return { num: 0, offset };
            }
        }
        return { num, offset };
    }

    /**
     * Calculates list metrics
     */
    protected recalculateMetrics<I extends { id: Id }, C extends Array<I>>(options: IRecalculateMetricsOptions<I, C>): IMetrics {
        const { fromItemId, bounds, collection, isVertical, itemSize, rowSize: typicalRowSize,
            bufferSize: actualBufferSize, scrollSize, snap, stickyMap, enabledBufferOptimization,
            deletedItemsMap, y: startY, rowId } = options as IRecalculateMetricsOptions<I, C> & {
                stickyMap: IVirtualGridStickyMap,
            };

        const bufferSize = actualBufferSize,
            { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, checkOverscrollItemsLimit = Math.ceil(size / typicalItemSize),
            snippedPos = Math.floor(scrollSize), leftItemsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === 'number' && fromItemId > -1)
                || (typeof fromItemId === 'string' && fromItemId > '-1');

        let leftItemsOffset = 0, rightItemsOffset = 0;
        if (enabledBufferOptimization) {
            switch (isVertical ? this.scrollDirectionY : this.scrollDirectionX) {
                case 1: {
                    leftItemsOffset = 0;
                    rightItemsOffset = bufferSize;
                    break;
                }
                case -1: {
                    leftItemsOffset = bufferSize;
                    rightItemsOffset = 0;
                    break;
                }
                case 0:
                default: {
                    leftItemsOffset = rightItemsOffset = bufferSize;
                }
            }
        } else {
            leftItemsOffset = rightItemsOffset = bufferSize;
        }

        let itemsFromStartToScrollEnd: number = -1, itemsFromDisplayEndToOffsetEnd = 0, itemsFromStartToDisplayEnd = -1,
            leftItemLength = 0, rightItemLength = 0,
            leftItemsWeight = 0, rightItemsWeight = 0,
            leftHiddenItemsWeight = 0,
            totalItemsToDisplayEndWeight = 0,
            leftSizeOfAddedItems = 0,
            leftSizeOfUpdatedItems = 0,
            leftSizeOfDeletedItems = 0,
            itemById: I | undefined = undefined,
            itemByIdPos: number = 0,
            targetDisplayItemIndex: number = -1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = 0,
            startIndex: number,
            isFromItemIdFound = false,
            rowSize = typicalRowSize;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        let y = 0, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
        for (let i = 0, l = collection.length; i < l; i++) {
            const ii = i + 1, collectionItem = collection[i], id = collectionItem.id;

            let componentSize = isVertical ? typicalRowSize : typicalItemSize, componentSizeDelta = 0,
                itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
            if (map.has(id)) {
                const bounds = map.get(id) || { width: typicalItemSize, height: typicalItemSize };
                componentSize = bounds[sizeProperty];
                itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                switch (itemDisplayMethod) {
                    case ItemDisplayMethods.UPDATE: {
                        const snapshotBounds = snapshot.get(id);
                        const componentSnapshotSize = componentSize - (snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize);
                        componentSizeDelta = componentSnapshotSize;
                        map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                        break;
                    }
                    case ItemDisplayMethods.CREATE: {
                        componentSizeDelta = typicalItemSize;
                        map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                        break;
                    }
                }
            }

            if (deletedItemsMap.hasOwnProperty(i)) {
                const bounds = deletedItemsMap[i], size = bounds?.[sizeProperty] ?? typicalItemSize;
                if (y < scrollSize - size) {
                    leftSizeOfDeletedItems += size;
                }
            }

            totalSize += componentSize;

            if (isFromId) {
                if (itemById === undefined) {
                    if (id !== fromItemId && stickyMap && stickyMap[id] === 1) {
                        stickyComponentSize = componentSize;
                        stickyCollectionItem = collectionItem;
                    }

                    if (id === fromItemId) {
                        isFromItemIdFound = true;
                        targetDisplayItemIndex = i;
                        if (stickyCollectionItem && stickyMap) {
                            const { num } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical);
                            if (num > 0) {
                                isTargetInOverscroll = true;
                                y -= size - componentSize;
                            } else {
                                if (stickyMap && !stickyMap[collectionItem.id] && y >= scrollSize && y < scrollSize + stickyComponentSize) {
                                    const snappedY = scrollSize - stickyComponentSize;
                                    leftHiddenItemsWeight -= (snappedY - y);
                                    y = snappedY;
                                } else {
                                    y -= stickyComponentSize;
                                    leftHiddenItemsWeight -= stickyComponentSize;
                                }
                            }
                        }
                        itemById = collectionItem;
                        itemByIdPos = y;
                    } else {
                        leftItemsWeights.push(componentSize);
                        leftHiddenItemsWeight += componentSize;
                        itemsFromStartToScrollEnd = ii;
                    }
                }
            } else if (y <= scrollSize - componentSize) {
                leftItemsWeights.push(componentSize);
                leftHiddenItemsWeight += componentSize;
                itemsFromStartToScrollEnd = ii;
            }

            if (isFromId) {
                if (itemById === undefined || y < itemByIdPos + size + componentSize) {
                    itemsFromStartToDisplayEnd = ii;
                    totalItemsToDisplayEndWeight += componentSize;
                    itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;
                }
            } else if (y <= scrollSize + size + componentSize) {
                itemsFromStartToDisplayEnd = ii;
                totalItemsToDisplayEndWeight += componentSize;
                itemsFromDisplayEndToOffsetEnd = itemsFromStartToDisplayEnd + rightItemsOffset;

                if (y <= scrollSize - componentSize) {
                    switch (itemDisplayMethod) {
                        case ItemDisplayMethods.CREATE: {
                            leftSizeOfAddedItems += componentSizeDelta;
                            break;
                        }
                        case ItemDisplayMethods.UPDATE: {
                            leftSizeOfUpdatedItems += componentSizeDelta;
                            break;
                        }
                        case ItemDisplayMethods.DELETE: {
                            leftSizeOfDeletedItems += componentSizeDelta;
                            break;
                        }
                    }
                }
            } else {
                if (i < itemsFromDisplayEndToOffsetEnd) {
                    rightItemsWeight += componentSize;
                }
            }

            y += componentSize;
        }

        if (isTargetInOverscroll) {
            const { num } = this.getElementNumToEnd(
                collection.length - (checkOverscrollItemsLimit < 0 ? 0 : collection.length - checkOverscrollItemsLimit),
                collection, map, typicalItemSize, size, isVertical, collection.length - (collection.length - (targetDisplayItemIndex + 1)),
            );
            if (num > 0) {
                itemsFromStartToScrollEnd -= num;
            }
        }

        if (itemsFromStartToScrollEnd <= -1) {
            itemsFromStartToScrollEnd = 0;
        }
        if (itemsFromStartToDisplayEnd <= -1) {
            itemsFromStartToDisplayEnd = 0;
        }
        actualScrollSize = isFromId ? itemByIdPos : scrollSize;

        leftItemsWeights.splice(0, leftItemsWeights.length - leftItemsOffset);
        leftItemsWeights.forEach(v => {
            leftItemsWeight += v;
        });

        leftItemLength = Math.min(itemsFromStartToScrollEnd, leftItemsOffset);
        rightItemLength = itemsFromStartToDisplayEnd + rightItemsOffset > totalLength
            ? totalLength - itemsFromStartToDisplayEnd : rightItemsOffset;

        startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > 0 ? totalLength - 1 : 0);

        const itemsOnDisplayWeight = totalItemsToDisplayEndWeight - leftItemsWeight,
            itemsOnDisplayLength = itemsFromStartToDisplayEnd - itemsFromStartToScrollEnd,
            startPosition = leftHiddenItemsWeight - leftItemsWeight,
            renderItems = itemsOnDisplayLength + leftItemLength + rightItemLength,
            delta = leftSizeOfUpdatedItems + leftSizeOfAddedItems - leftSizeOfDeletedItems;

        const metrics: IMetrics = {
            delta,
            normalizedItemWidth: w,
            normalizedItemHeight: h,
            width,
            height,
            itemSize,
            itemsFromStartToScrollEnd,
            itemsFromStartToDisplayEnd,
            itemsOnDisplayWeight,
            itemsOnDisplayLength,
            isVertical,
            leftHiddenItemsWeight,
            leftItemLength,
            leftItemsWeight,
            renderItems,
            rightItemLength,
            rightItemsWeight,
            scrollSize: actualScrollSize,
            leftSizeOfAddedItems,
            sizeProperty,
            snap,
            snippedPos,
            startIndex,
            startPosition,
            totalItemsToDisplayEndWeight,
            totalLength,
            totalSize,
            typicalItemSize,
            isFromItemIdFound,
            rowSize,
            rowId: rowId!,
            startY,
        };
        return metrics;
    }

    clearDeltaDirection() {
        this.clearScrollDirectionCache();
    }

    clearDelta(clearDirectionDetector = false): void {
        this._deltaX = this._deltaY = 0;

        if (clearDirectionDetector) {
            this.clearScrollDirectionCache();
        }
    }

    changes(): void {
        this.bumpVersion();
    }

    protected generateDisplayCollection<I extends { id: Id, rowId?: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualGridStickyMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            width,
            height,
            normalizedItemWidth,
            normalizedItemHeight,
            itemsOnDisplayLength,
            itemsFromStartToScrollEnd,
            isVertical,
            renderItems: renderItemsLength,
            scrollSize,
            sizeProperty,
            snap,
            snippedPos,
            startPosition,
            totalLength,
            startIndex,
            typicalItemSize,
            rowSize,
            startY,
            rowId,
        } = metrics,
            displayItems: IRenderVirtualListCollection = [];
        if (items.length) {
            const actualSnippedPosition = snippedPos, isSnappingMethodAdvanced = this.isSnappingMethodAdvanced,
                boundsSize = isVertical ? height : width, actualEndSnippedPosition = boundsSize;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualListItem | undefined, nextSticky: IRenderVirtualListItem | undefined, stickyItemIndex = -1,
                stickyItemSize = 0, endStickyItem: IRenderVirtualListItem | undefined, nextEndSticky: IRenderVirtualListItem | undefined,
                endStickyItemIndex = -1, endStickyItemSize = 0;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > 0 ? itemsFromStartToScrollEnd : 0, totalLength - 1); i >= 0; i--) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, rowId = items[i].rowId, sticky = stickyMap[id], size = this.get(id)?.[sizeProperty] || typicalItemSize;
                    if (sticky === 1) {
                        const measures = {
                            x: isVertical ? 0 : actualSnippedPosition,
                            y: isVertical ? actualSnippedPosition : startY ?? 0,
                            width: isVertical ? normalizedItemWidth : size,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            isSnappingMethodAdvanced,
                            zIndex: '1',
                        };

                        const itemData: I = items[i];

                        stickyItem = { id, rowId, measures, data: itemData, config };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem!);
                        break;
                    }
                }
            }

            if (snap) {
                const startIndex = itemsFromStartToScrollEnd + itemsOnDisplayLength - 1;
                for (let i = Math.min(startIndex, totalLength > 0 ? totalLength - 1 : 0), l = totalLength; i < l; i++) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, sticky = stickyMap[id], size = this.get(id)?.[sizeProperty] || typicalItemSize;
                    if (sticky === 2) {
                        const w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight, measures = {
                            x: isVertical ? 0 : actualEndSnippedPosition - w,
                            y: isVertical ? actualEndSnippedPosition - h : startY ?? 0,
                            width: w,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            isSnappingMethodAdvanced,
                            zIndex: '1',
                        };

                        const itemData: I = items[i];

                        endStickyItem = { id, rowId, measures, data: itemData, config };
                        endStickyItemIndex = i;
                        endStickyItemSize = size;

                        displayItems.push(endStickyItem);
                        break;
                    }
                }
            }

            let i = startIndex;

            while (renderItems > 0) {
                if (i >= totalLength) {
                    break;
                }
                if (!items[i]) {
                    continue;
                }

                const id = items[i].id, size = this.get(id)?.[sizeProperty] || typicalItemSize;

                if (id !== stickyItem?.id && id !== endStickyItem?.id) {
                    const snapped = snap && (stickyMap[id] === 1 && pos <= scrollSize || stickyMap[id] === 2 && pos >= scrollSize + boundsSize - size),
                        measures = {
                            x: isVertical ? stickyMap[id] === 1 ? 0 : boundsSize - size : pos,
                            y: isVertical ? pos : stickyMap[id] === 2 ? boundsSize - size : startY ?? 0,
                            width: isVertical ? normalizedItemWidth : size,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky: stickyMap[id],
                            snap,
                            snapped: false,
                            snappedOut: false,
                            isSnappingMethodAdvanced,
                            zIndex: '0',
                        };

                    if (snapped) {
                        config.zIndex = '2';
                    }

                    const itemData: I = items[i];

                    const item: IRenderVirtualListItem = { id, rowId, measures, data: itemData, config };
                    if (!nextSticky && stickyItemIndex < i && stickyMap[id] === 1 && (pos <= scrollSize + size + stickyItemSize)) {
                        item.measures.x = isVertical ? 0 : snapped ? actualSnippedPosition : pos;
                        item.measures.y = isVertical ? snapped ? actualSnippedPosition : pos : 0;
                        nextSticky = item;
                        nextSticky.config.snapped = snapped;
                        nextSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                        nextSticky.config.zIndex = '3';
                    } else if (!nextEndSticky && endStickyItemIndex > i && stickyMap[id] === 2 && (pos >= scrollSize + boundsSize - size - endStickyItemSize)) {
                        item.measures.x = isVertical ? 0 : snapped ? actualEndSnippedPosition - size : pos;
                        item.measures.y = isVertical ? snapped ? actualEndSnippedPosition - size : pos : 0;
                        nextEndSticky = item;
                        nextEndSticky.config.zIndex = '3';
                        nextEndSticky.config.snapped = snapped;
                        nextEndSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                    }

                    displayItems.push(item);
                }

                renderItems -= 1;
                pos += size;
                i++;
            }

            const axis = isVertical ? Y_PROP_NAME : X_PROP_NAME;

            if (nextSticky && stickyItem && nextSticky.measures[axis] <= scrollSize + stickyItemSize) {
                if (nextSticky.measures[axis] > scrollSize) {
                    stickyItem.measures[axis] = nextSticky.measures[axis] - stickyItemSize;
                    stickyItem.config.snapped = nextSticky.config.snapped = false;
                    stickyItem.config.snappedOut = true;
                    stickyItem.config.sticky = 1;
                    stickyItem.measures.delta = isVertical ? stickyItem.measures.y - scrollSize : stickyItem.measures.x - scrollSize;
                } else {
                    nextSticky.config.snapped = true;
                    nextSticky.measures.delta = isVertical ? nextSticky.measures.y - scrollSize : nextSticky.measures.x - scrollSize;
                }
            }

            if (nextEndSticky && endStickyItem && nextEndSticky.measures[axis] >= scrollSize + boundsSize - endStickyItemSize - nextEndSticky.measures[sizeProperty]) {
                if (nextEndSticky.measures[axis] < scrollSize + boundsSize - endStickyItemSize) {
                    endStickyItem.measures[axis] = nextEndSticky.measures[axis] + nextEndSticky.measures[sizeProperty];
                    endStickyItem.config.snapped = nextEndSticky.config.snapped = false;
                    endStickyItem.config.snappedOut = true;
                    endStickyItem.config.sticky = 2;
                    endStickyItem.measures.delta = isVertical ? endStickyItem.measures.y - scrollSize : endStickyItem.measures.x - scrollSize;
                } else {
                    nextEndSticky.config.snapped = true;
                    nextEndSticky.measures.delta = isVertical ? nextEndSticky.measures.y - scrollSize : nextEndSticky.measures.x - scrollSize;
                }
            }
        }
        return displayItems;
    }

    /**
     * tracking by propName
     */
    track(): void {
        if (!this._items || !this._displayComponents) {
            return;
        }

        this._tracker.track(this._items, this._displayComponents, this._snapedDisplayComponent, this.scrollDirectionX);
    }

    setDisplayObjectIndexMapById(v: { [id: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    untrackComponentByIdProperty(component?: C | undefined) {
        this._tracker.untrackComponentByIdProperty(component);
    }

    getItemBounds(id: Id): ISize | undefined {
        if (this.has(id)) {
            return this.get(id);
        }
        return undefined;
    }

    protected cacheElements(): void {
        if (!this._displayComponents) {
            return;
        }

        const rowDict: { [id: Id]: number } = {};
        for (let i = 0, l = this._displayComponents.length; i < l; i++) {
            const component: ComponentRef<C> = this._displayComponents[i], rowId = component.instance.rowId, itemId = component.instance.itemId;
            if (itemId === undefined) {
                continue;
            }
            if (this._customSizeMap.get(itemId)) {
                continue;
            }
            const bounds = component.instance.getBounds();
            this._map.set(itemId, { ...this.get(itemId), ...bounds } as any);
            if (rowId !== undefined) {
                if (!rowDict.hasOwnProperty(rowId)) {
                    rowDict[rowId] = 0;
                }
                rowDict[rowId] = Math.max(rowDict[rowId], bounds.height);
            }
        }
        for (let id in rowDict) {
            if (this._customSizeMap.get(id)) {
                continue;
            }
            const rowBounds = this.get(id);
            this._map.set(id, { width: rowBounds?.width, height: rowDict[id] } as any);
        }
    }

    override dispose() {
        super.dispose();

        this.disposeClearBufferSizeTimer();

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
