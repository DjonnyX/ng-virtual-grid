import {
    BaseVirtualListItemComponent, CMap, Id, IMetrics, IRecalculateMetricsOptions, IRenderVirtualListCollection, IRenderVirtualListItem, ISize, ItemDisplayMethods, IUpdateCollectionOptions, IUpdateCollectionReturns, IVirtualListStickyMap, TrackBox,
    Tracker,

} from "ng-virtual-list";
import { VirtualGridRow } from "../models";
import { GridTracker } from "./grid-tracker";
import { X_PROP_NAME, Y_PROP_NAME } from "../const";

export interface IGridUpdateCollectionOptions<I extends {
    id: Id;
}, C extends Array<I>> extends IUpdateCollectionOptions<I, C> {
    rowSize: number;
}

export interface IGridRecalculateMetricsOptions<I extends {
    id: Id;
}, C extends Array<I>> extends IRecalculateMetricsOptions<I, C> {
    rowSize: number;
    y: number;
}

export interface IGridMetrics {
    rowSize: number;
    startY: number;
}

export class GridTrackBox<C extends BaseVirtualListItemComponent = any>
    extends TrackBox<C> {

    protected _rowSizeMap = new CMap<Id, number>();

    constructor(trackingPropertyName: string) {
        super(trackingPropertyName);
    }

    protected override initialize() {
        this._tracker = new GridTracker(this._trackingPropertyName);
    }

    /**
     * Update the cache of items from the list
     */
    protected override updateCache<I extends VirtualGridRow = any, C extends Array<I> = any>(previousCollection: C | null | undefined, currentCollection: C | null | undefined,
        itemSize: number): void {
        let crudDetected = false;

        if (!currentCollection || currentCollection.length === 0) {
            if (previousCollection) {
                // deleted
                for (let i = 0, l = previousCollection.length; i < l; i++) {
                    const collection = previousCollection[i];
                    for (let j = 0, l1 = collection.columns.length; j < l1; j++) {
                        const item = collection.columns[j], id = item.id;
                        crudDetected = true;
                        if (this._map.has(id)) {
                            this._map.delete(id);
                        }
                    }
                }
            }
            return;
        }
        if (!previousCollection || previousCollection.length === 0) {
            if (currentCollection) {
                // added
                for (let i = 0, l = currentCollection.length; i < l; i++) {
                    const collection = currentCollection[i];
                    for (let j = 0, l1 = collection.columns.length; j < l1; j++) {
                        crudDetected = true;
                        const item = collection.columns[j], id = item.id;
                        this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
                    }
                }
            }
            return;
        }
        const collectionDict: { [id: Id]: I } = {};
        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const collection = currentCollection[i];
            for (let j = 0, l1 = collection.columns.length; j < l1; j++) {
                const item = collection.columns[i];
                if (item) {
                    collectionDict[item.id] = item as any;
                }
            }
        }
        const notChangedMap: { [id: Id]: I } = {}, deletedMap: { [id: Id]: I } = {}, deletedItemsMap: { [index: number]: ISize } = {}, updatedMap: { [id: Id]: I } = {};
        for (let i = 0, l = previousCollection.length; i < l; i++) {
            const collection = previousCollection[i];
            for (let j = 0, l1 = collection.columns.length; j < l1; j++) {
                const item = collection.columns[i], id = item.id;
                if (item) {
                    if (collectionDict.hasOwnProperty(id)) {
                        if (item === collectionDict[id]) {
                            // not changed
                            notChangedMap[item.id] = item as any;
                            this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: itemSize }), method: ItemDisplayMethods.NOT_CHANGED });
                            continue;
                        } else {
                            // updated
                            crudDetected = true;
                            updatedMap[item.id] = item as any;
                            this._map.set(id, { ...(this._map.get(id) || { width: itemSize, height: itemSize }), method: ItemDisplayMethods.UPDATE });
                            continue;
                        }
                    }

                    // deleted
                    crudDetected = true;
                    deletedMap[item.id] = item as any;
                    deletedItemsMap[i] = this._map.get(item.id);
                    this._map.delete(id);
                }
            }
        }

        for (let i = 0, l = currentCollection.length; i < l; i++) {
            const collection = currentCollection[i];
            for (let j = 0, l1 = collection.columns.length; j < l1; j++) {
                const item = collection.columns[i], id = item.id;
                if (item && !deletedMap.hasOwnProperty(id) && !updatedMap.hasOwnProperty(id) && !notChangedMap.hasOwnProperty(id)) {
                    // added
                    crudDetected = true;
                    this._map.set(id, { width: itemSize, height: itemSize, method: ItemDisplayMethods.CREATE });
                }
            }
        }
        this._crudDetected = crudDetected;
        this._deletedItemsMap = deletedItemsMap;
    }

    /**
     * Updates the collection of display objects
     */
    override updateCollection(items: Array<any>, stickyMap: IVirtualListStickyMap,
        options: IGridUpdateCollectionOptions<any, any>): IUpdateCollectionReturns {
        const opt = { stickyMap, ...options }, crudDetected = this._crudDetected, deletedItemsMap = this._deletedItemsMap;
        this.cacheElements();
        this._defaultBufferSize = opt.bufferSize;
        this._maxBufferSize = opt.maxBufferSize;

        this._previousTotalSize = 0;

        const currentDelta = this._delta;

        let maxDelta = -1, maxTotalSize = 0, displayItemCollection = Array<any>();

        let y = 0;
        for (let i = 0, l = items.length; i < l; i++) {
            const item = items[i], columnsCollection = item.columns;
            let delta = 0;
            const metrics = this.recalculateMetrics({
                ...opt,
                collection: columnsCollection,
                previousTotalSize: this._previousTotalSize,
                crudDetected: this._crudDetected,
                deletedItemsMap,
                y,
            });

            delta = currentDelta + metrics.delta;
            maxDelta = Math.max(maxDelta, delta);

            console.log(metrics.totalSize)

            maxTotalSize = Math.max(metrics.totalSize, maxTotalSize);

            this.updateAdaptiveBufferParams(metrics, columnsCollection.length); // ???

            this._previousTotalSize = Math.max(metrics.totalSize, this._previousTotalSize);

            const displayItems = this.generateDisplayCollection(columnsCollection, stickyMap, { ...metrics, });

            displayItemCollection.push(displayItems);

            const rowSize = (metrics as unknown as IGridMetrics).rowSize;

            this._rowSizeMap.set(item.id, rowSize);

            y += rowSize;
        }

        this._delta += maxDelta;

        this._deletedItemsMap = {};

        this._crudDetected = false;

        if (opt.dynamicSize) {
            this.snapshot();
        }

        return { displayItems: displayItemCollection.flat(), totalSize: maxTotalSize, delta: this._delta, crudDetected };
    }


    /**
     * Calculates list metrics
     */
    protected override recalculateMetrics<I extends { id: Id }, C extends Array<I>>(options: IGridRecalculateMetricsOptions<I, C>,): IMetrics {
        const { fromItemId, bounds, collection, dynamicSize, isVertical, itemSize,
            bufferSize: minBufferSize, scrollSize, snap, stickyMap, enabledBufferOptimization,
            previousTotalSize, crudDetected, deletedItemsMap, y: startY } = options as IGridRecalculateMetricsOptions<I, C> & {
                stickyMap: IVirtualListStickyMap,
            };

        const bufferSize = Math.max(minBufferSize, this._bufferSize),
            { width, height } = bounds, sizeProperty = isVertical ? 'height' : 'width',
            size = isVertical ? height : width, totalLength = collection.length, typicalItemSize = itemSize,
            w = isVertical ? width : typicalItemSize, h = isVertical ? typicalItemSize : height,
            map = this._map, snapshot = this._snapshot, checkOverscrollItemsLimit = Math.ceil(size / typicalItemSize),
            snippedPos = Math.floor(scrollSize), leftItemsWeights: Array<number> = [],
            isFromId = fromItemId !== undefined && (typeof fromItemId === 'number' && fromItemId > -1)
                || (typeof fromItemId === 'string' && fromItemId > '-1');

        let leftItemsOffset = 0, rightItemsOffset = 0;
        if (enabledBufferOptimization) {
            switch (this.scrollDirection) {
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
            rowSize = 0;

        // If the list is dynamic or there are new elements in the collection, then it switches to the long algorithm.
        if (dynamicSize) {
            let y = startY, stickyCollectionItem: I | undefined = undefined, stickyComponentSize = 0;
            for (let i = 0, l = collection.length; i < l; i++) {
                const ii = i + 1, collectionItem = collection[i], id = collectionItem.id;

                let componentSize = 0, componentSizeDelta = 0, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
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

                    rowSize = Math.max(bounds.height, rowSize);
                } else {
                    rowSize = Math.max(typicalItemSize, height);
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

        } else
        // Buffer optimization does not work on fast linear algorithm
        {
            if (crudDetected) {
                let y = startY;
                for (let i = 0, l = collection.length; i < l; i++) {
                    const collectionItem = collection[i], id = collectionItem.id;
                    let componentSize = typicalItemSize, itemDisplayMethod: ItemDisplayMethods = ItemDisplayMethods.NOT_CHANGED;
                    if (map.has(id)) {
                        const bounds = map.get(id)!;
                        itemDisplayMethod = bounds?.method ?? ItemDisplayMethods.UPDATE;
                        if (itemDisplayMethod === ItemDisplayMethods.CREATE) {
                            map.set(id, { ...bounds, method: ItemDisplayMethods.NOT_CHANGED });
                        }

                        rowSize = Math.max(bounds.height, rowSize);
                    } else {
                        rowSize = Math.max(typicalItemSize, height);
                    }



                    if (deletedItemsMap.hasOwnProperty(i)) {
                        const bounds = deletedItemsMap[i], size = bounds?.[sizeProperty] ?? typicalItemSize;
                        if (y < scrollSize - size) {
                            leftSizeOfDeletedItems += size;
                        }
                    }

                    if (y < scrollSize - componentSize) {
                        switch (itemDisplayMethod) {
                            case ItemDisplayMethods.CREATE: {
                                leftSizeOfUpdatedItems += componentSize;
                                break;
                            }
                            case ItemDisplayMethods.UPDATE: {
                                leftSizeOfUpdatedItems += componentSize;
                                break;
                            }
                            case ItemDisplayMethods.DELETE: {
                                leftSizeOfDeletedItems += componentSize;
                                break;
                            }
                        }
                    }
                    y += componentSize;
                }
            } else {
                for (let i = 0, l = collection.length; i < l; i++) {
                    const item = collection[i], itemH = this.get(item.id)?.height ?? 0;
                    rowSize = Math.max(itemH, rowSize);
                }
            }
            itemsFromStartToScrollEnd = Math.floor(scrollSize / typicalItemSize);
            itemsFromStartToDisplayEnd = Math.ceil((scrollSize + size) / typicalItemSize);
            leftItemLength = Math.min(itemsFromStartToScrollEnd, bufferSize);
            rightItemLength = itemsFromStartToDisplayEnd + bufferSize > totalLength
                ? totalLength - itemsFromStartToDisplayEnd : bufferSize;
            leftItemsWeight = leftItemLength * typicalItemSize;
            rightItemsWeight = rightItemLength * typicalItemSize;
            leftHiddenItemsWeight = itemsFromStartToScrollEnd * typicalItemSize;
            totalItemsToDisplayEndWeight = itemsFromStartToDisplayEnd * typicalItemSize;
            totalSize = totalLength * typicalItemSize;

            const k = totalSize !== 0 ? previousTotalSize / totalSize : 0;
            actualScrollSize = scrollSize * k;
        }
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
            dynamicSize,
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
            startY,
            rowSize,
        } as unknown as any;

        return metrics;
    }

    protected override generateDisplayCollection<I extends { id: Id }, C extends Array<I>>(items: C, stickyMap: IVirtualListStickyMap,
        metrics: IMetrics): IRenderVirtualListCollection {
        const {
            width,
            height,
            normalizedItemWidth,
            normalizedItemHeight,
            dynamicSize,
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
        } = metrics,
            { startY, rowSize, } = metrics as unknown as IGridMetrics,
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
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;
                    if (sticky === 1) {
                        const measures = {
                            x: isVertical ? 0 : actualSnippedPosition,
                            y: isVertical ? actualSnippedPosition : startY,
                            width: isVertical ? normalizedItemWidth : size,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            dynamic: dynamicSize,
                            isSnappingMethodAdvanced,
                            zIndex: '1',
                        };

                        const itemData: I = items[i];

                        stickyItem = { id, measures, data: itemData, config };
                        stickyItemIndex = i;
                        stickyItemSize = size;

                        displayItems.push(stickyItem);
                        break;
                    }
                }
            }

            if (snap) {
                const startIndex = itemsFromStartToScrollEnd + itemsOnDisplayLength - 1;
                for (let i = Math.min(startIndex, totalLength > 0 ? totalLength - 1 : 0), l = totalLength; i < l; i++) {
                    const id = items[i].id, sticky = stickyMap[id], size = dynamicSize
                        ? this.get(id)?.[sizeProperty] || typicalItemSize
                        : typicalItemSize;
                    if (sticky === 2) {
                        const w = isVertical ? normalizedItemWidth : size, h = isVertical ? size : normalizedItemHeight, measures = {
                            x: isVertical ? 0 : actualEndSnippedPosition - w,
                            y: isVertical ? actualEndSnippedPosition - h : startY,
                            width: w,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky,
                            snap,
                            snapped: true,
                            snappedOut: false,
                            dynamic: dynamicSize,
                            isSnappingMethodAdvanced,
                            zIndex: '1',
                        };

                        const itemData: I = items[i];

                        endStickyItem = { id, measures, data: itemData, config };
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

                const id = items[i].id, size = dynamicSize ? this.get(id)?.[sizeProperty] || typicalItemSize : typicalItemSize;

                if (id !== stickyItem?.id && id !== endStickyItem?.id) {
                    const snapped = snap && (stickyMap[id] === 1 && pos <= scrollSize || stickyMap[id] === 2 && pos >= scrollSize + boundsSize - size),
                        measures = {
                            x: isVertical ? stickyMap[id] === 1 ? 0 : boundsSize - size : pos,
                            y: isVertical ? pos : stickyMap[id] === 2 ? boundsSize - size : startY,
                            width: isVertical ? normalizedItemWidth : size,
                            height: rowSize,
                            delta: 0,
                        }, config = {
                            isVertical,
                            sticky: stickyMap[id],
                            snap,
                            snapped: false,
                            snappedOut: false,
                            dynamic: dynamicSize,
                            isSnappingMethodAdvanced,
                            zIndex: '0',
                        };

                    if (snapped) {
                        config.zIndex = '2';
                    }

                    const itemData: I = items[i];

                    const item: IRenderVirtualListItem = { id, measures, data: itemData, config };
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
    override track(): void {
        if (!this._items || !this._displayComponents) {
            return;
        }

        this._tracker.track(this._items, this._displayComponents, this._snapedDisplayComponent, this.scrollDirection);
    }
}