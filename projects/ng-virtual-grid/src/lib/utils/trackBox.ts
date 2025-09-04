import { ComponentRef } from "@angular/core";
import { IRenderVirtualGridCollection, } from "../models/render-collection.model";
import { IRenderVirtualGridItem } from "../models/render-item.model";
import { Id } from "../types/id";
import { CacheMap, CMap } from "./cacheMap";
import { Tracker } from "./tracker";
import { IPoint, ISize } from "../types";
import {
    DEFAULT_BUFFER_SIZE, DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE, DEFAULT_MIN_ROW_SIZE, DEFAULT_ROW_SIZE, HEIGHT_PROP_NAME, SIZE_AUTO,
    SIZE_PERSENT, SIZE_FR, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME, X_PROP_NAME, Y_PROP_NAME, DIG_M_1, DIG_0, DIG_1, DIG_2,
    DEFAULT_MAX_COLUMN_SIZE, DEFAULT_MAX_ROW_SIZE,
} from "../const";
import { IColumnsSize, IRowsSize, IVirtualGridColumnCollection, IVirtualGridRowConfigMap, VirtualGridRow } from "../models";
import { bufferInterpolation } from "./buffer-interpolation";
import { BaseVirtualGridItemComponent } from "../models/base-virtual-grid-item-component";
import { normalizeDeltaX } from "./delta";
import { NgVirtualGridRowComponent } from "../components/ng-virtual-grid-row/ng-virtual-grid-row.component";
import { RowSize } from "../types/row-size";
import { ColumnSize } from "../types/column-size";

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
    rowSize: number;
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
    extends Omit<IRecalculateMetricsOptions<I, C>, 'collection' | 'previousTotalSize' | 'crudDetected' | 'deletedItemsMap' | 'isVertical' | 'scrollSize'> {
    scrollSizeX: number;
    scrollSizeY: number;
}

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
    columnsLength: number;
    displayItems: Array<IRenderVirtualGridCollection>;
    rowDisplayItems: IRenderVirtualGridCollection;
    totalSize: number;
    totalHeight: number;
    delta: number;
    crudDetected: boolean;
}

const DEFAULT_BUFFER_EXTREMUM_THRESHOLD = 15,
    DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH = 30,
    DEFAULT_RESET_BUFFER_SIZE_TIMEOUT = 10000,
    BUFFER_RAW_SIZE_SCALE = 5,
    PERSENTS_100 = 100,
    PERSENTS_1 = 1,
    TYPE_STRING = 'string',
    TYPE_NUMBER = 'number',
    FROM_ITEM_ID_NONE = '-1',
    CHAR_NONE = '',
    Z_INDEX_0 = '0',
    Z_INDEX_2 = '2',
    Z_INDEX_3 = '3',
    Z_INDEX_4 = '4',
    BUFFER_SIZE_X_PROP_NAME = '_bufferSizeX',
    BUFFER_SIZE_Y_PROP_NAME = '_bufferSizeY',
    BUFFER_SIZE_SEQUENCE_X_PROP_NAME = '_bufferSizeSequenceX',
    BUFFER_SIZE_SEQUENCE_Y_PROP_NAME = '_bufferSizeSequenceY';

const FLEXIBLE_COLUMN_PATTERN = /^([\d]+fr)$/, PERCENTAGE_COLUMN_PATTERN = /^([\d]+%)$/;

const isFlexibleColumn = (value: ColumnSize) => {
    if (value === undefined || typeof value === TYPE_NUMBER) {
        return false;
    }
    return FLEXIBLE_COLUMN_PATTERN.test(value as string);
};

const isPercentageColumn = (value: ColumnSize) => {
    if (value === undefined || typeof value === TYPE_NUMBER) {
        return false;
    }
    return PERCENTAGE_COLUMN_PATTERN.test(value as string);
};

const parseColumnValue = (value: ColumnSize, boundsWidth: number): number => {
    const isFlexible = isFlexibleColumn(value), isPercentage = isPercentageColumn(value);
    if (isFlexible || isPercentage) {
        const v = parseFloat(String(value).replace(SIZE_FR, CHAR_NONE).replace(SIZE_PERSENT, CHAR_NONE));
        return (boundsWidth * v) / (isPercentage ? PERSENTS_100 : PERSENTS_1);
    }
    return value as number;
}

const getColumnsSizeWithExclude = (v: IColumnsSize, boundsWidth: number, minColumnSize: number, maxColumnSize: number, excludeIds: Array<Id>) => {
    let result = DIG_0;
    for (let columnId in v) {
        if (excludeIds.includes(columnId)) {
            continue;
        }
        const value = v[columnId],
            // isFlexible = isFlexibleColumn(value),
            // isPercentage = isFlexibleColumn(value),
            val = parseColumnValue(value, boundsWidth);
        result += normalizeValue(val, minColumnSize, maxColumnSize);
    }
    return result;
};

const normalizeValue = (value: number, min: number, max: number) => {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    }
    return value;
}

const setCahce = (id: Id, value: ICacheItem, cacheMap: CMap<Id, ICacheItem>,
    minRowSize: number, maxRowSize: number, minColumnSize: number, maxColumnSize: number,
): CMap<Id, ICacheItem> => {
    const { width, height, method } = value;
    return cacheMap.set(id, {
        method,
        width: normalizeValue(width, minColumnSize, maxColumnSize),
        height: normalizeValue(height, minRowSize, maxRowSize),
    });
}

interface ICacheItem extends ISize {
    method: ItemDisplayMethods | undefined;
}

/**
 * An object that performs tracking, calculations and caching.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/utils/trackBox.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class TrackBox<C extends BaseVirtualGridItemComponent = any>
    extends CacheMap<Id, ICacheItem, CacheMapEvents, CacheMapListeners> {

    protected _tracker!: Tracker<C>;

    protected _items: Array<IRenderVirtualGridCollection> | null | undefined;

    set items(v: Array<IRenderVirtualGridCollection> | null | undefined) {
        if (this._items === v) {
            return;
        }

        this._items = v;
    }

    protected _rowItems: IRenderVirtualGridCollection | null | undefined;

    set rowItems(v: IRenderVirtualGridCollection | null | undefined) {
        if (this._rowItems === v) {
            return;
        }

        this._rowItems = v;
    }

    protected _rowDisplayComponents: Array<ComponentRef<C>> | null | undefined;

    set rowDisplayComponents(v: Array<ComponentRef<C>> | null | undefined) {
        if (this._rowDisplayComponents === v) {
            return;
        }

        this._rowDisplayComponents = v;
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

    protected storeCache(id: Id, value: ICacheItem, checkVersion: boolean = false): CMap<Id, ICacheItem> {
        if (checkVersion) {
            if (this._map.has(id)) {
                const b = this._map.get(id);
                if (b?.width === value.width && b.height === value.height) {
                    return this._map;
                }
            }

            const v = setCahce(id, value, this._map, this._minRowSize, this._maxRowSize,
                this._minColumnSize, this._maxColumnSize,
            );

            this.bumpVersion();
            return v;
        }

        return setCahce(id, value, this._map, this._minRowSize, this._maxRowSize,
            this._minColumnSize, this._maxColumnSize,
        );
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

    protected _previousScrollSizeY = DIG_0;

    protected _scrollDeltaX: number = DIG_0;
    get scrollDeltaX() { return this._scrollDeltaX; }

    protected _scrollDeltaY: number = DIG_0;
    get scrollDeltaY() { return this._scrollDeltaY; }

    isAdaptiveBuffer = true;

    protected _bufferSequenceExtraThreshold = DEFAULT_BUFFER_EXTREMUM_THRESHOLD;

    protected _maxBufferSequenceLength = DEFAULT_MAX_BUFFER_SEQUENCE_LENGTH;

    protected _bufferSizeSequenceX: Array<number> = [];

    protected _bufferSizeSequenceY: Array<number> = [];

    protected _bufferSizeX: number = DIG_0;
    get bufferSizeX() { return this._bufferSizeX; }

    protected _bufferSizeY: number = DIG_0;
    get bufferSizeY() { return this._bufferSizeY; }

    protected _defaultBufferSize: number = DIG_0;

    protected _maxBufferSize: number = this._defaultBufferSize;

    protected _resetBufferSizeTimeout: number = DEFAULT_RESET_BUFFER_SIZE_TIMEOUT;

    protected _resetBufferSizeTimer: number | undefined;

    protected _isRenderedMap = new CMap<Id, boolean | undefined>();

    protected _customSizeMap = new CMap<Id, number | undefined>();

    protected _customColumnsSizeMap = new CMap<Id, number | undefined>();

    protected _customRowsSizeMap = new CMap<Id, RowSize>();

    protected _columnsMap = new CMap<Id, IVirtualGridColumnCollection>();

    protected _columnsStructureMap = new CMap<Id, boolean>();

    protected _rowByCellMap = new CMap<Id, Id>();

    protected _minColumnSize = DEFAULT_MIN_COLUMN_SIZE;
    set minColumnSize(v: number) {
        if (this._minColumnSize !== v) {
            this._minColumnSize = v;
        }
    }

    protected _maxColumnSize = DEFAULT_MAX_COLUMN_SIZE;
    set maxColumnSize(v: number) {
        if (this._maxColumnSize !== v) {
            this._maxColumnSize = v;
        }
    }

    protected _minRowSize = DEFAULT_MIN_ROW_SIZE;
    set minRowSize(v: number) {
        if (this._minRowSize !== v) {
            this._minRowSize = v;
        }
    }

    protected _maxRowSize = DEFAULT_MAX_ROW_SIZE;
    set maxRowSize(v: number) {
        if (this._maxRowSize !== v) {
            this._maxRowSize = v;
        }
    }

    updateRowsSize(v: IRowsSize) {
        if (!v) {
            return;
        }
        for (let rowId in v) {
            const value = v[rowId];
            if (value === undefined) {
                this._customRowsSizeMap.delete(rowId);
            } else {
                this._customRowsSizeMap.set(rowId, value);
            }
            if (value !== undefined) {
                const cacheItem = this.get(rowId) || {};
                if (value !== SIZE_AUTO) {
                    this.storeCache(rowId, { ...cacheItem, height: value, method: ItemDisplayMethods.UPDATE } as ICacheItem, true);
                }
            }
        }
    }

    getRowSizeById(id: Id) {
        return this.get(id)?.height ?? DEFAULT_ROW_SIZE;
    }

    updateColumnSize(v: IColumnsSize, boundsWidth: number) {
        if (!v) {
            return;
        }
        const bw = boundsWidth;
        for (let columnId in v) {
            const value = v[columnId], items = this._columnsMap.get(columnId);
            this._columnsStructureMap.set(columnId, value !== undefined);
            const isFlexible = isFlexibleColumn(value), /*isPercentage = isFlexibleColumn(value),*/
                val = parseColumnValue(value, bw) - (isFlexible ? getColumnsSizeWithExclude(v, bw, this._minColumnSize, this._maxColumnSize,
                    [columnId]) : DIG_0);
            if (value === undefined) {
                this._customColumnsSizeMap.delete(columnId);
            } else {
                this._customColumnsSizeMap.set(columnId, val);
            }
            if (Array.isArray(items)) {
                for (let i = DIG_0, l = items.length; i < l; i++) {
                    const item = items[i], id = item.id;
                    if (val !== undefined) {
                        const cacheItem = this.get(id);
                        this.storeCache(id, { ...cacheItem || {}, width: val, method: ItemDisplayMethods.UPDATE } as ICacheItem, true);
                    }
                }
            }
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
    resetCollection<I extends { id: Id; columns: Array<I & { rowId?: Id; columnId?: Id }>; },
        C extends Array<I>>(currentCollection: C | null | undefined, rowSize: number, itemSize: number): void {

        if (currentCollection !== undefined && currentCollection !== null && currentCollection === this._previousCollection) {
            console.warn('Attention! The collection must be immutable.');
            return;
        }

        const colMap = this._columnsMap, rowByCellMap = this._rowByCellMap;

        if (currentCollection) {
            const collection: Array<I> = [];
            for (let i = DIG_0, l = currentCollection.length; i < l; i++) {
                const item = currentCollection[i], subCollection = item.columns as IVirtualGridColumnCollection, rowId = item.id,
                    rowHeight = this._customRowsSizeMap.get(rowId) ?? rowSize;
                this.storeCache(rowId, {
                    width: itemSize, height: rowHeight === SIZE_AUTO ? rowSize : rowHeight,
                    method: ItemDisplayMethods.NOT_CHANGED
                });
                for (let j = DIG_0, l1 = subCollection.length; j < l1; j++) {
                    const cell = subCollection[j];
                    cell.rowId = rowId;
                    cell.columnId = j;
                    if (!colMap.has(j)) {
                        colMap.set(j, []);
                    }
                    rowByCellMap.set(cell.id, item.id);
                    colMap.get(j).push(cell);
                    collection.push(cell as I);
                }
            }
            this.updateCache(this._previousCollection, collection, rowSize, itemSize);
            this._previousCollection = collection;
        } else {
            this._previousCollection = null;
        }
    }

    /**
     * Update the cache of items from the grid
     */
    protected updateCache<I extends { id: Id; rowId?: Id, columnId?: Id; }, C extends Array<I>>(
        previousCollection: C | null | undefined, currentCollection: C | null | undefined, rowSize: number, itemSize: number): void {
        let crudDetected = false;

        if (!currentCollection || currentCollection.length === DIG_0) {
            if (previousCollection) {
                // deleted
                for (let i = DIG_0, l = previousCollection.length; i < l; i++) {
                    const item = previousCollection[i], id = item.id;
                    crudDetected = true;
                    if (this._map.has(id)) {
                        this._map.delete(id);
                    }
                }
            }
            return;
        }
        if (!previousCollection || previousCollection.length === DIG_0) {
            if (currentCollection) {
                // added
                for (let i = DIG_0, l = currentCollection.length; i < l; i++) {
                    crudDetected = true;
                    const item = currentCollection[i], id = item.id, rowId = item.rowId, columnId = item.columnId,
                        rowHeight = rowId !== undefined ? this._customRowsSizeMap.get(rowId) ?? rowSize : rowSize,
                        itemWidth = columnId !== undefined ? this._customColumnsSizeMap.get(columnId) ?? itemSize : itemSize;
                    this.storeCache(id, {
                        width: itemWidth, height: rowHeight === SIZE_AUTO ? rowSize : rowHeight,
                        method: ItemDisplayMethods.CREATE
                    });
                }
            }
            return;
        }
        const collectionDict: { [id: Id]: I } = {};
        for (let i = DIG_0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i];
            if (item) {
                collectionDict[item.id] = item;
            }
        }
        const notChangedMap: { [id: Id]: I } = {}, deletedMap: { [id: Id]: I } = {}, deletedItemsMap: { [index: number]: ISize } = {},
            updatedMap: { [id: Id]: I } = {};
        for (let i = DIG_0, l = previousCollection.length; i < l; i++) {
            const item = previousCollection[i], id = item.id, rowId = item.rowId, columnId = item.columnId,
                rowHeight = rowId !== undefined ? this._customRowsSizeMap.get(rowId) ?? rowSize : rowSize,
                itemWidth = columnId !== undefined ? this._customColumnsSizeMap.get(columnId) ?? itemSize : itemSize;
            if (item) {
                if (collectionDict.hasOwnProperty(id)) {
                    if (item === collectionDict[id]) {
                        // not changed
                        notChangedMap[item.id] = item;
                        this.storeCache(id, {
                            ...(this._map.get(id) || { width: itemWidth, height: rowHeight === SIZE_AUTO ? rowSize : rowHeight }),
                            method: ItemDisplayMethods.NOT_CHANGED,
                        });
                        continue;
                    } else {
                        // updated
                        crudDetected = true;
                        updatedMap[item.id] = item;
                        this.storeCache(id, {
                            ...(this._map.get(id) || { width: itemWidth, height: rowHeight === SIZE_AUTO ? rowSize : rowHeight }),
                            method: ItemDisplayMethods.UPDATE,
                        });
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

        for (let i = DIG_0, l = currentCollection.length; i < l; i++) {
            const item = currentCollection[i], id = item.id, rowId = item.rowId, columnId = item.columnId,
                rowHeight = rowId !== undefined ? this._customRowsSizeMap.get(rowId) ?? rowSize : rowSize,
                itemWidth = columnId !== undefined ? this._customColumnsSizeMap.get(columnId) ?? itemSize : itemSize;
            if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) && !notChangedMap.hasOwnProperty(id)) {
                // added
                crudDetected = true;
                this.storeCache(id, {
                    width: itemWidth, height: rowHeight === SIZE_AUTO ? rowSize : rowHeight,
                    method: ItemDisplayMethods.CREATE,
                });
            }
        }
        this._crudDetected = crudDetected;
        this._deletedItemsMap = deletedItemsMap;
    }

    /**
     * Finds the position of a collection element by the given Id
     */
    getItemPosition<I extends { id: Id }, C extends Array<I>>(id: Id, items: C, cellConfigRowsMap: IVirtualGridRowConfigMap,
        cellConfigColumnsMap: IVirtualGridRowConfigMap, options: IGetItemPositionOptions<I, C>): IPoint {
        const opt = { fromItemId: id, cellConfigRowsMap, ...options }, rowByCellMap = this._rowByCellMap, crudDetected = this._crudDetected,
            deletedItemsMap = this._deletedItemsMap;

        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        let isRowId = true, rowId = id;
        if (rowByCellMap.has(id)) {
            isRowId = false;
            rowId = rowByCellMap.get(id)
        }

        const rowMetrics = this.recalculateMetrics({
            ...opt,
            collection: items,
            scrollSize: opt.scrollSizeY,
            crudDetected,
            cellConfigMap: cellConfigRowsMap,
            itemSize: opt.rowSize,
            deletedItemsMap,
            isVertical: true,
            bufferSize: this._bufferSizeY,
            fromItemId: rowId,
            y: DIG_0,
        } as any);

        if (isRowId && rowMetrics.isFromItemIdFound) {
            return {
                x: NaN,
                y: rowMetrics.scrollSize,
            };
        }

        const rowDisplayItems = this.generateDisplayCollection(items, cellConfigRowsMap, { ...rowMetrics } as any);

        for (let i = DIG_0, l = rowDisplayItems.length; i < l; i++) {
            const item = rowDisplayItems[i], columnsCollection = ((item as any).data as VirtualGridRow).columns,
                customRowSize = this._customRowsSizeMap.get(item.id);
            const metrics = this.recalculateMetrics({
                ...opt,
                collection: columnsCollection,
                scrollSize: opt.scrollSizeX,
                crudDetected: this._crudDetected,
                cellConfigMap: cellConfigColumnsMap,
                deletedItemsMap,
                isVertical: false,
                fromItemId: id,
                bufferSize: this._bufferSizeX ?? DEFAULT_BUFFER_SIZE,
                rowSize: customRowSize !== undefined && customRowSize !== SIZE_AUTO ? customRowSize : this.get(item.id)?.height ?? rowMetrics.rowSize,
                y: item.measures.y,
            } as any);

            if (metrics.isFromItemIdFound) {
                return {
                    x: metrics.scrollSize,
                    y: item.measures.y,
                };
            }
        }

        return {
            x: NaN,
            y: NaN,
        };
    }

    /**
     * Updates the collection of display objects
     */
    updateCollection<I extends { id: Id, rowId?: Id }, C extends Array<I>>(items: C, cellConfigRowsMap: IVirtualGridRowConfigMap,
        cellConfigColumnsMap: IVirtualGridRowConfigMap,
        options: IUpdateCollectionOptions<I, C>): IUpdateCollectionReturns {
        const opt = { cellConfigRowsMap, cellConfigColumnsMap, ...options }, crudDetected = this._crudDetected,
            deletedItemsMap = this._deletedItemsMap;

        this.cacheElements();

        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        let columnsTotalSize = DIG_0, columnsLength = DIG_0, displayItemCollection = Array<any>();

        const rowMetrics = this.recalculateMetrics({
            ...opt,
            collection: items,
            scrollSize: opt.scrollSizeY,
            crudDetected,
            cellConfigMap: cellConfigRowsMap,
            itemSize: opt.rowSize,
            deletedItemsMap,
            isVertical: true,
            bufferSize: this._bufferSizeY,
            y: DIG_0,
        } as any);

        const rowDisplayItems = this.generateDisplayCollection(items, cellConfigRowsMap, { ...rowMetrics } as any),
            deltaXSequence: Array<number> = [];

        let prevRowId: Id | undefined;
        for (let i = DIG_0, l = rowDisplayItems.length; i < l; i++) {
            const item = rowDisplayItems[i], rowId = item.id, columnsCollection = (item.data as VirtualGridRow).columns,
                customRowSize = this._customRowsSizeMap.get(item.id);
            const metrics = this.recalculateMetrics({
                ...opt,
                collection: columnsCollection,
                scrollSize: opt.scrollSizeX,
                crudDetected: this._crudDetected,
                cellConfigMap: cellConfigColumnsMap,
                deletedItemsMap,
                isVertical: false,
                bufferSize: this._bufferSizeX ?? DEFAULT_BUFFER_SIZE,
                rowSize: customRowSize !== undefined && customRowSize !== SIZE_AUTO ? customRowSize : this.get(item.id)?.height ?? rowMetrics.rowSize,
                y: item.measures.y,
            } as any);

            deltaXSequence.push(metrics.delta);

            columnsTotalSize = Math.max(metrics.totalSize, columnsTotalSize);

            const { scrollSize, bufferSize } = this.updateAdaptiveBufferParams(metrics, l, metrics.delta,
                this._previousScrollSizeX[rowId] ?? DIG_0, BUFFER_SIZE_X_PROP_NAME, BUFFER_SIZE_SEQUENCE_X_PROP_NAME);
            this._previousScrollSizeX[rowId] = scrollSize;
            this._bufferSizeX = bufferSize;

            const displayItems = this.generateDisplayCollection(columnsCollection, cellConfigColumnsMap, { ...metrics, rowId }, {
                prevRowId,
                rowDisplayObject: item,
                rowResizable: cellConfigRowsMap[rowId]?.resizable,
            });

            columnsLength = Math.max(displayItems.length, columnsLength);

            displayItemCollection.push(displayItems);

            prevRowId = item.id;
        }

        const deltaX = normalizeDeltaX(deltaXSequence);

        this.snapshot();

        this._deltaX += deltaX;

        this._deltaY += rowMetrics.delta;

        const { scrollSize, bufferSize } = this.updateAdaptiveBufferParams(rowMetrics, rowDisplayItems.length,
            rowMetrics.delta, this._previousScrollSizeY, BUFFER_SIZE_Y_PROP_NAME, BUFFER_SIZE_SEQUENCE_Y_PROP_NAME);
        this._previousScrollSizeY = scrollSize;
        this._bufferSizeY = bufferSize;

        this._deletedItemsMap = {};

        this._crudDetected = false;

        return {
            rowDisplayItems, displayItems: displayItemCollection, totalSize: columnsTotalSize, totalHeight: rowMetrics.totalSize,
            delta: rowMetrics.delta, crudDetected, columnsLength,
        };
    }

    /**
     * Finds the closest element in the collection by scrollSize
     */
    getNearestItem<I extends { id: Id }, C extends Array<I>>(scrollSize: number, items: C, itemSize: number, isVertical: boolean): I | undefined {
        return this.getElementFromStart(scrollSize, items, this._map, itemSize, isVertical);
    }

    protected updateAdaptiveBufferParams(metrics: IMetrics, totalItemsLength: number, delta: number,
        previousScrollSize: number, bufferSizeName: string, bufferSizeSequenceName: string) {
        this.disposeClearBufferSizeTimer();

        const ctx = this as { [propName: string]: any };
        const scrollSize = metrics.scrollSize + delta, actualDelta = Math.abs(previousScrollSize - scrollSize);
        const bufferRawSize = Math.min(Math.floor(actualDelta / metrics.typicalItemSize) * BUFFER_RAW_SIZE_SCALE, totalItemsLength),
            minBufferSize = bufferRawSize < this._defaultBufferSize ? this._defaultBufferSize : bufferRawSize,
            bufferValue = minBufferSize > this._maxBufferSize ? this._maxBufferSize : minBufferSize;

        const buffPropertyValue = ctx[bufferSizeName];
        const bufferSize = bufferInterpolation(buffPropertyValue,
            ctx[bufferSizeSequenceName], bufferValue, {
            extremumThreshold: this._bufferSequenceExtraThreshold,
            bufferSize: this._maxBufferSequenceLength,
        });

        this.startResetBufferSizeTimer(bufferSizeName, bufferSizeSequenceName);

        return { scrollSize, bufferSize };
    }

    protected startResetBufferSizeTimer(bufferSizeName: string, bufferSizeSequenceName: string) {
        this._resetBufferSizeTimer = setTimeout(() => {
            const ctx = this as { [propName: string]: any };
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
        let offset = DIG_0;
        for (let i = DIG_0, l = collection.length; i < l; i++) {
            const item = collection[i];
            let itemSize = DIG_0;
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
        size: number, isVertical: boolean, indexOffset: number = DIG_0): { num: number, offset: number } {
        const sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME;
        let offset = DIG_0, num = DIG_0;
        for (let j = collection.length - indexOffset - DIG_1; j >= i; j--) {
            const item = collection[j];
            let itemSize = DIG_0;
            if (map.has(item.id)) {
                const bounds = map.get(item.id);
                itemSize = bounds ? bounds[sizeProperty] : typicalItemSize;
            } else {
                itemSize = typicalItemSize;
            }
            offset += itemSize;
            num++;
            if (offset > size) {
                return { num: DIG_0, offset };
            }
        }
        return { num, offset };
    }

    /**
     * Calculates grid metrics
     */
    protected recalculateMetrics<I extends { id: Id }, C extends Array<I>>(options: IRecalculateMetricsOptions<I, C>): IMetrics {
        const { fromItemId, bounds, collection, isVertical, itemSize, rowSize: typicalRowSize,
            bufferSize: actualBufferSize, scrollSize, snap, cellConfigMap, enabledBufferOptimization,
            deletedItemsMap, y: startY, rowId } = options as IRecalculateMetricsOptions<I, C> & {
                cellConfigMap: IVirtualGridRowConfigMap,
            };

        const bufferSize = actualBufferSize,
            { width, height } = bounds, sizeProperty = isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME,
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, checkOverscrollItemsLimit = Math.ceil(size / typicalItemSize),
            snippedPos = Math.floor(scrollSize), leftItemsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === TYPE_NUMBER && (fromItemId as number) > DIG_M_1)
                || (typeof fromItemId === TYPE_STRING && (fromItemId as string) > FROM_ITEM_ID_NONE);

        let leftItemsOffset = DIG_0, rightItemsOffset = DIG_0;
        if (enabledBufferOptimization) {
            switch (isVertical ? this.scrollDirectionY : this.scrollDirectionX) {
                case DIG_1: {
                    leftItemsOffset = DIG_0;
                    rightItemsOffset = bufferSize;
                    break;
                }
                case DIG_M_1: {
                    leftItemsOffset = bufferSize;
                    rightItemsOffset = DIG_0;
                    break;
                }
                case DIG_0:
                default: {
                    leftItemsOffset = rightItemsOffset = bufferSize;
                }
            }
        } else {
            leftItemsOffset = rightItemsOffset = bufferSize;
        }

        let itemsFromStartToScrollEnd: number = DIG_M_1, itemsFromDisplayEndToOffsetEnd = DIG_0, itemsFromStartToDisplayEnd = DIG_M_1,
            leftItemLength = DIG_0, rightItemLength = DIG_0,
            leftItemsWeight = DIG_0, rightItemsWeight = DIG_0,
            leftHiddenItemsWeight = DIG_0,
            totalItemsToDisplayEndWeight = DIG_0,
            leftSizeOfAddedItems = DIG_0,
            leftSizeOfUpdatedItems = DIG_0,
            leftSizeOfDeletedItems = DIG_0,
            itemById: I | undefined = undefined,
            itemByIdPos: number = DIG_0,
            targetDisplayItemIndex: number = DIG_M_1,
            isTargetInOverscroll: boolean = false,
            actualScrollSize = itemByIdPos,
            totalSize = DIG_0,
            startIndex: number,
            isFromItemIdFound = false,
            rowSize = typicalRowSize;

        // If the grid is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        let y = DIG_0, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = DIG_0;
        for (let i = DIG_0, l = collection.length; i < l; i++) {
            const ii = i + DIG_1, collectionItem = collection[i], id = collectionItem.id, sticky = cellConfigMap ? isVertical ? cellConfigMap[id]?.sticky ?? DIG_0 : cellConfigMap[i]?.sticky ?? DIG_0 : undefined;

            let componentSize = isVertical ? typicalRowSize : typicalItemSize, componentSizeDelta = DIG_0,
                itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
            if (map.has(id)) {
                const bounds = map.get(id) || { width: typicalItemSize, height: typicalItemSize },
                    actualSize = isVertical
                        ? this._customRowsSizeMap.get(id) !== SIZE_AUTO ? this._customRowsSizeMap.get(id) ?? this._customSizeMap.get(id) ?? bounds.height : this._customSizeMap.get(id) ?? bounds.height
                        : this._customColumnsSizeMap.get(i) ?? this._customSizeMap.get(id) ?? bounds.width,
                    actualBounds: Partial<ISize> = { [sizeProperty]: actualSize };
                componentSize = actualSize as number;
                if (!isVertical && this._columnsStructureMap.get(i)) {
                    itemDisplayMethod = ItemDisplayMethods.UPDATE;
                    map.set(id, { ...bounds, method: ItemDisplayMethods.UPDATE });
                } else {
                    itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                    switch (itemDisplayMethod) {
                        case ItemDisplayMethods.UPDATE: {
                            const snapshotBounds = snapshot.get(id);
                            const componentSnapshotSize = componentSize - (snapshotBounds ? snapshotBounds[sizeProperty] : typicalItemSize);
                            componentSizeDelta = componentSnapshotSize;
                            map.set(id, { ...bounds, ...actualBounds, method: ItemDisplayMethods.UPDATE });
                            break;
                        }
                        case ItemDisplayMethods.CREATE: {
                            componentSizeDelta = typicalItemSize;
                            map.set(id, { ...bounds, ...actualBounds, method: ItemDisplayMethods.UPDATE });
                            break;
                        }
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
                    if (id !== fromItemId && sticky === DIG_1) {
                        stickyComponentSize = componentSize;
                        stickyCollectionItem = collectionItem;
                    }

                    if (id === fromItemId) {
                        isFromItemIdFound = true;
                        targetDisplayItemIndex = i;
                        if (stickyCollectionItem && cellConfigMap) {
                            const { num } = this.getElementNumToEnd(i, collection, map, typicalItemSize, size, isVertical);
                            if (num > DIG_0) {
                                isTargetInOverscroll = true;
                                y -= size - componentSize;
                            } else {
                                const sticky = isVertical ? cellConfigMap[collectionItem.id]?.sticky ?? DIG_0 : cellConfigMap[i]?.sticky ?? DIG_0;
                                if (cellConfigMap && sticky && y >= scrollSize && y < scrollSize + stickyComponentSize) {
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

                if (y <= scrollSize) {
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
                collection.length - (checkOverscrollItemsLimit < DIG_0 ? DIG_0 : collection.length - checkOverscrollItemsLimit),
                collection, map, typicalItemSize, size, isVertical, collection.length - (collection.length - (targetDisplayItemIndex + DIG_1)),
            );
            if (num > DIG_0) {
                itemsFromStartToScrollEnd -= num;
            }
        }

        if (itemsFromStartToScrollEnd <= DIG_M_1) {
            itemsFromStartToScrollEnd = DIG_0;
        }
        if (itemsFromStartToDisplayEnd <= DIG_M_1) {
            itemsFromStartToDisplayEnd = DIG_0;
        }
        actualScrollSize = isFromId ? itemByIdPos : scrollSize;

        leftItemsWeights.splice(0, leftItemsWeights.length - leftItemsOffset);
        leftItemsWeights.forEach(v => {
            leftItemsWeight += v;
        });

        leftItemLength = Math.min(itemsFromStartToScrollEnd, leftItemsOffset);
        rightItemLength = itemsFromStartToDisplayEnd + rightItemsOffset > totalLength
            ? totalLength - itemsFromStartToDisplayEnd : rightItemsOffset;

        startIndex = Math.min(itemsFromStartToScrollEnd - leftItemLength, totalLength > DIG_0 ? totalLength - DIG_1 : DIG_0);

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
        this._deltaX = this._deltaY = DIG_0;

        if (clearDirectionDetector) {
            this.clearScrollDirectionCache();
        }
    }

    changes(): void {
        this.bumpVersion();
    }

    protected generateDisplayCollection<I extends { id: Id, rowId?: Id }, C extends Array<I>>(
        items: C,
        cellConfigMap: IVirtualGridRowConfigMap,
        metrics: IMetrics,
        options?: {
            prevRowId?: Id | undefined;
            rowDisplayObject?: IRenderVirtualGridItem;
            rowResizable: boolean | undefined;
        }): IRenderVirtualGridCollection {
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
            rowResizable = options?.rowResizable,
            prevRowId = options?.prevRowId,
            rowDisplayObject = options?.rowDisplayObject,
            displayItems: IRenderVirtualGridCollection = [];

        if (items.length) {
            const actualSnippedPosition = snippedPos,
                boundsSize = isVertical ? height : width, actualEndSnippedPosition = boundsSize;
            let pos = startPosition,
                renderItems = renderItemsLength,
                stickyItem: IRenderVirtualGridItem | undefined, nextSticky: IRenderVirtualGridItem | undefined, stickyItemIndex = DIG_M_1,
                stickyItemSize = DIG_0, endStickyItem: IRenderVirtualGridItem | undefined, nextEndSticky: IRenderVirtualGridItem | undefined,
                endStickyItemIndex = DIG_M_1, endStickyItemSize = DIG_0;

            if (snap) {
                for (let i = Math.min(itemsFromStartToScrollEnd > DIG_0 ? itemsFromStartToScrollEnd : DIG_0, totalLength - DIG_1); i >= DIG_0; i--) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, columnId = i,
                        sticky = isVertical ? cellConfigMap[id]?.sticky ?? DIG_0 : cellConfigMap[i]?.sticky ?? DIG_0,
                        columnResizable = isVertical ? cellConfigMap[id]?.resizable : cellConfigMap[i]?.resizable,
                        stickyWithRow = rowDisplayObject?.config.sticky ?? DIG_0,
                        size = this.get(id)?.[sizeProperty] || typicalItemSize;
                    if (sticky === DIG_1) {
                        const measures = {
                            x: isVertical ? DIG_0 : actualSnippedPosition,
                            y: isVertical ? DIG_0 : DIG_0,
                            width: isVertical ? normalizedItemWidth : size,
                            height: isVertical ? size : rowSize,
                            delta: DIG_0,
                        }, config = {
                            customSize: (rowId !== undefined && this._customRowsSizeMap.get(rowId) !== undefined &&
                                this._customRowsSizeMap.get(rowId) !== SIZE_AUTO) || this._customSizeMap.get(id) !== undefined,
                            isVertical,
                            sticky,
                            columnResizable,
                            rowResizable,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            zIndex: stickyWithRow && sticky ? Z_INDEX_4 : Z_INDEX_2,
                            prevColId: i > DIG_0 ? i - DIG_1 : undefined,
                            prevRowId,
                            border: i === DIG_0 || i === totalLength - DIG_1,
                        };

                        const itemData: I = items[i];

                        stickyItem = { index: i, id, rowId, columnId, measures, data: itemData, config };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem!);
                        break;
                    }
                }
            }

            if (snap) {
                const startIndex = itemsFromStartToScrollEnd + itemsOnDisplayLength - DIG_1;
                for (let i = Math.min(startIndex, totalLength > DIG_0 ? totalLength - DIG_1 : DIG_0), l = totalLength; i < l; i++) {
                    if (!items[i]) {
                        continue;
                    }
                    const id = items[i].id, columnId = i,
                        sticky = isVertical ? cellConfigMap[id]?.sticky ?? DIG_0 : cellConfigMap[i]?.sticky ?? DIG_0,
                        columnResizable = isVertical ? cellConfigMap[id]?.resizable : cellConfigMap[i]?.resizable,
                        stickyWithRow = rowDisplayObject?.config.sticky ?? DIG_0,
                        size = this.get(id)?.[sizeProperty] || typicalItemSize;
                    if (sticky === DIG_2) {
                        const w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight, measures = {
                            x: isVertical ? DIG_0 : actualSnippedPosition + actualEndSnippedPosition - w,
                            y: isVertical ? actualEndSnippedPosition - h : DIG_0,
                            width: w,
                            height: isVertical ? size : rowSize,
                            delta: DIG_0,
                        }, config = {
                            customSize: (rowId !== undefined && this._customRowsSizeMap.get(rowId) !== undefined &&
                                this._customRowsSizeMap.get(rowId) !== SIZE_AUTO) || this._customSizeMap.get(id) !== undefined,
                            isVertical,
                            sticky,
                            columnResizable,
                            rowResizable,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            zIndex: stickyWithRow && sticky ? Z_INDEX_4 : Z_INDEX_2,
                            prevColId: i > DIG_0 ? i - DIG_1 : undefined,
                            prevRowId,
                            border: i === DIG_0 || i === totalLength - DIG_1,
                        };

                        const itemData: I = items[i];

                        endStickyItem = { index: i, id, rowId, columnId, measures, data: itemData, config };
                        endStickyItemIndex = i;
                        endStickyItemSize = size;

                        displayItems.push(endStickyItem);
                        break;
                    }
                }
            }

            let i = startIndex;

            while (renderItems > DIG_0) {
                if (i >= totalLength) {
                    break;
                }
                if (!items[i]) {
                    continue;
                }

                const id = items[i].id, columnId = i, bounds = this.get(id), size = bounds?.[sizeProperty] || typicalItemSize;
                if (id !== stickyItem?.id && id !== endStickyItem?.id) {
                    const w = isVertical ? normalizedItemWidth : size,
                        sticky = isVertical ? cellConfigMap[id]?.sticky ?? DIG_0 : cellConfigMap[i]?.sticky ?? DIG_0,
                        columnResizable = isVertical ? cellConfigMap[id]?.resizable : cellConfigMap[i]?.resizable,
                        stickyWithRow = rowDisplayObject?.config.sticky ?? DIG_0,
                        snapped = ((snap && sticky === DIG_1 && pos <= scrollSize) || (snap && sticky === DIG_2 && (pos >= (scrollSize + boundsSize - size)))),
                        measures = {
                            x: isVertical ? DIG_0 : snapped && sticky === DIG_1 ? DIG_0 : snapped && sticky === DIG_2 ? actualSnippedPosition + actualEndSnippedPosition - w : pos,
                            y: isVertical ? snapped && sticky === DIG_1 ? DIG_0 : snapped && sticky === DIG_2 ? actualEndSnippedPosition - size : pos : DIG_0,
                            width: w,
                            height: rowSize,
                            delta: DIG_0,
                        }, config = {
                            customSize: (rowId !== undefined && this._customRowsSizeMap.get(rowId) !== undefined &&
                                this._customRowsSizeMap.get(rowId) !== SIZE_AUTO) || this._customSizeMap.get(id) !== undefined,
                            isVertical,
                            sticky,
                            columnResizable,
                            rowResizable,
                            snap,
                            snapped: false,
                            snappedOut: false,
                            zIndex: sticky || stickyWithRow ? String(sticky || stickyWithRow) : Z_INDEX_0,
                            prevColId: i > DIG_0 ? i - DIG_1 : undefined,
                            prevRowId,
                            border: i === DIG_0 || i === totalLength - DIG_1,
                        };

                    if (snapped) {
                        config.zIndex = Z_INDEX_3;
                    }

                    const itemData: I = items[i];

                    const item: IRenderVirtualGridItem = { index: i, id, rowId, columnId, measures, data: itemData, config };
                    if (snap && !nextSticky && stickyItemIndex < i && sticky === DIG_1 && (pos <= scrollSize + size + stickyItemSize)) {
                        item.measures.x = isVertical ? DIG_0 : snapped ? actualSnippedPosition : pos;
                        item.measures.y = isVertical ? snapped ? actualSnippedPosition : pos : DIG_0;
                        nextSticky = item;
                        nextSticky.config.snapped = snapped;
                        nextSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                        nextSticky.config.zIndex = Z_INDEX_4;
                    } else if (snap && !nextEndSticky && endStickyItemIndex > i && sticky === DIG_2 &&
                        (pos >= scrollSize + boundsSize - size - endStickyItemSize)) {
                        item.measures.x = isVertical ? DIG_0 : snapped ? actualEndSnippedPosition - size : pos;
                        item.measures.y = isVertical ? snapped ? actualEndSnippedPosition - size : pos : DIG_0;
                        nextEndSticky = item;
                        nextEndSticky.config.zIndex = Z_INDEX_4;
                        nextEndSticky.config.snapped = snapped;
                        nextEndSticky.measures.delta = isVertical ? (item.measures.y - scrollSize) : (item.measures.x - scrollSize);
                    }

                    displayItems.push(item);
                }

                renderItems -= DIG_1;
                pos += size;
                i++;
            }

            const axis = isVertical ? Y_PROP_NAME : X_PROP_NAME;

            if (nextSticky && stickyItem && nextSticky.measures[axis] <= scrollSize + stickyItemSize) {
                if (nextSticky.measures[axis] > scrollSize) {
                    stickyItem.measures[axis] = nextSticky.measures[axis] - stickyItemSize;
                    stickyItem.config.snapped = nextSticky.config.snapped = false;
                    stickyItem.config.snappedOut = true;
                    stickyItem.config.sticky = DIG_1;
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
                    endStickyItem.config.sticky = DIG_2;
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
        if (!this._items || !this._rowItems) {
            return;
        }

        this._tracker.track(this._rowItems, this._items, this._rowDisplayComponents);
    }

    setDisplayObjectIndexMapById(v: { [componentId: number]: number }): void {
        this._tracker.displayObjectIndexMapById = v;
    }

    getItemBounds(id: Id): ISize | undefined {
        if (this.has(id)) {
            return this.get(id);
        }
        return undefined;
    }

    private _rowsCache: { [id: Id]: { [colId: Id]: number } } = {};

    getCacheByRowId(id: Id) {
        return this._isRenderedMap.get(id) && this._customRowsSizeMap.has(id) ? this._customRowsSizeMap.get(id) ?? SIZE_AUTO : SIZE_AUTO;
    }

    protected cacheElements(): void {
        if (!this._rowDisplayComponents) {
            return;
        }

        const rowDict = this._rowsCache;
        for (const rowIndex in this._rowDisplayComponents) {
            const row = this._rowDisplayComponents[rowIndex] as unknown as ComponentRef<NgVirtualGridRowComponent>,
                components = row.instance.components;
            for (let j = DIG_0, l1 = components.length; j < l1; j++) {
                const component: ComponentRef<BaseVirtualGridItemComponent> = components[j],
                    rowId = component.instance.rowId, columnId = component.instance.columnId, itemId = component.instance.itemId;
                if (itemId === undefined) {
                    continue;
                }
                const itemCache = this.get(itemId);
                if (columnId !== undefined && !this._columnsStructureMap.has(columnId)) {
                    this._columnsStructureMap.set(columnId, this._columnsStructureMap.get(columnId) ||
                        itemCache?.method === ItemDisplayMethods.NOT_CHANGED || itemCache?.method === ItemDisplayMethods.UPDATE);
                }
                if (this._customSizeMap.get(itemId) ||
                    (rowId !== undefined && this._customRowsSizeMap.get(rowId) !== SIZE_AUTO && this._customRowsSizeMap.get(rowId))) {
                    continue;
                }
                const bounds = component.instance.getBounds();
                this._isRenderedMap.set(itemId, true);
                this.storeCache(itemId, { ...itemCache, height: bounds.height } as ICacheItem);
                if (rowId !== undefined) {
                    if (!rowDict.hasOwnProperty(rowId)) {
                        rowDict[rowId] = {};
                    }
                    const bounds = component.instance.getContentBounds();
                    rowDict[rowId][itemId] = bounds.height;
                }
            }
        }
        for (let rowId in rowDict) {
            const row = rowDict[rowId], customRowSize = this._customRowsSizeMap.get(rowId);
            if (customRowSize !== undefined && customRowSize !== SIZE_AUTO) {
                continue;
            }
            let maxSize = this._minRowSize;
            for (let colId in row) {
                maxSize = Math.max(maxSize, row[colId]);
            }
            const rowBounds = this.get(rowId);
            this._isRenderedMap.set(rowId, true);
            this.storeCache(rowId, { ...rowBounds, width: rowBounds!.width, height: maxSize } as ICacheItem);
        }
    }

    override dispose() {
        super.dispose();

        this.disposeClearBufferSizeTimer();

        if (this._columnsMap) {
            this._columnsMap.clear();
        }

        if (this._customColumnsSizeMap) {
            this._customColumnsSizeMap.clear();
        }

        if (this._customRowsSizeMap) {
            this._customRowsSizeMap.clear();
        }

        if (this._columnsStructureMap) {
            this._columnsStructureMap.clear();
        }

        if (this._rowByCellMap) {
            this._rowByCellMap.clear();
        }

        if (this._tracker) {
            this._tracker.dispose();
        }
    }
}
