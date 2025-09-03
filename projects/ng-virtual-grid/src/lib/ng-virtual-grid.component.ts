import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, OnInit, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, debounceTime, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualGridItemComponent } from './components/ng-virtual-grid-item/ng-virtual-grid-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_BUFFER_SIZE, DEFAULT_GRID_SIZE, DEFAULT_SNAP, HEIGHT_PROP_NAME, LEFT_PROP_NAME,
  MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE, DEFAULT_ROW_SIZE, DEFAULT_COLUMN_SIZE, DEFAULT_RESIZE_ROWS_ENABLED,
  DEFAULT_RESIZE_COLUMNS_ENABLED, DEFAULT_MIN_ROW_SIZE, DEFAULT_MIN_COLUMN_SIZE,
} from './const';
import { IColumnsSize, IRowsSize, IScrollEvent, IVirtualGridCollection, IVirtualGridColumnConfigMap, IVirtualGridRowConfigMap } from './models';
import { Id, ISize } from './types';
import { RowSize } from './types/row-size';
import { IRenderVirtualGridCollection } from './models/render-collection.model';
import { CellResizeMode, CellResizeModes } from './enums';
import { ScrollEvent } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME, TrackBox } from './utils/trackBox';
import { BaseVirtualGridItemComponent } from './models/base-virtual-grid-item-component';
import { Component$1 } from './models/component.model';
import { NgVirtualGridService } from './ng-virtual-grid.service';
import { PointerDetectService } from './service/pointer-detect.service';
import { isAdjacentCellMode } from './utils/isAdjacentCellMode';
import { NgVirtualGridRowComponent } from './components/ng-virtual-grid-row/ng-virtual-grid-row.component';

/**
 * Virtual grid component.
 * Maximum performance for extremely large grids.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/ng-virtual-grid.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid',
  imports: [CommonModule],
  templateUrl: './ng-virtual-grid.component.html',
  styleUrl: './ng-virtual-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  providers: [NgVirtualGridService, PointerDetectService],
})
export class NgVirtualGridComponent implements AfterViewInit, OnInit, OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualGridComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  private _service = inject(NgVirtualGridService);

  private _pointerDetectService = inject(PointerDetectService);

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _gridContainerRef: ViewContainerRef | undefined;

  private _container = viewChild<ElementRef<HTMLDivElement>>('container');

  private _grid = viewChild<ElementRef<HTMLUListElement>>('grid');

  /**
   * Fires when the grid has been scrolled.
   */
  onScroll = output<IScrollEvent>();

  /**
   * Fires when the grid has completed scrolling.
   */
  onScrollEnd = output<IScrollEvent>();

  /**
   * Fires when the row size is changed.
   */
  onRowsSizeChanged = output<IRowsSize>();

  /**
   * Fires when the column size is changed.
   */
  onColumnsSizeChanged = output<IColumnsSize>();

  private _itemsOptions = {
    transform: (v: IVirtualGridCollection | undefined) => {
      return v;
    },
  } as any;

  /**
   * Collection of grid items.
   */
  items = input.required<IVirtualGridCollection>({
    ...this._itemsOptions,
  });

  /**
   * Determines whether elements will snap. Default value is "true".
   */
  snap = input<boolean>(DEFAULT_SNAP);

  /**
   * Experimental!
   * Enables buffer optimization.
   * Can only be used if items in the collection are not added or updated. Otherwise, artifacts in the form of twitching of the scroll area are possible.
   * Works only if the property dynamic = true
   */
  enabledBufferOptimization = input<boolean>(DEFAULT_ENABLED_BUFFER_OPTIMIZATION);

  /**
   * Rendering element template.
   */
  itemRenderer = input.required<TemplateRef<any>>();

  private _itemRenderer = signal<TemplateRef<any> | undefined>(undefined);

  /**
   * Dictionary sticky and resizable by id of the grid row element.
   * If the sticky value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, 
   * then the sticky position mode is enabled for the element. 1 - position start, 2 - position end.
   */
  cellConfigRowsMap = input<IVirtualGridRowConfigMap>({});

  /**
   * Dictionary resizable by id of the grid column element.
   */
  cellConfigColumnsMap = input<IVirtualGridColumnConfigMap>({});

  private _columnSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_COLUMN_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_COLUMN_SIZE : val;
    },
  } as any;

  /**
   * Typical column size. Default value is 24.
   */
  columnSize = input<number>(DEFAULT_COLUMN_SIZE, { ...this._columnSizeOptions });

  private _minColumnSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_MIN_COLUMN_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_MIN_COLUMN_SIZE : val;
    },
  } as any;

  /**
   * Minimum column size. Default value is 12.
   */
  minColumnSize = input<number>(DEFAULT_MIN_COLUMN_SIZE, { ...this._minColumnSizeOptions });

  private _rowSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_ROW_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_ROW_SIZE : val;
    },
  } as any;

  /**
   * Typical row size. Default value is 24.
   */
  rowSize = input<number>(DEFAULT_ROW_SIZE, { ...this._rowSizeOptions });

  private _minRowSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_MIN_ROW_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_MIN_ROW_SIZE : val;
    },
  } as any;

  /**
   * Minimum row size. Default value is 12.
   */
  minRowSize = input<number>(DEFAULT_MIN_ROW_SIZE, { ...this._minRowSizeOptions });

  /**
   * Cell resize mode. Default value is "self".
   */
  cellResizeMode = input<CellResizeMode>(CellResizeModes.SELF);

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   */
  bufferSize = input<number>(DEFAULT_BUFFER_SIZE);

  private _maxBufferSizeTransform = {
    transform: (v: number | undefined) => {
      const bufferSize = this.bufferSize();
      if (v === undefined || v <= bufferSize) {
        return bufferSize;
      }
      return v;
    }
  } as any;

  /**
   * Maximum number of elements outside the scope of visibility. Default value is 100.
   * If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled.
   * The greater the scroll size, the more elements are allocated for rendering.
   */
  maxBufferSize = input<number>(DEFAULT_MAX_BUFFER_SIZE, { ...this._maxBufferSizeTransform });

  /**
   * Column size map.
   */
  columnsSize = input<IColumnsSize>({});

  /**
   * Row size map.
   */
  rowsSize = input<IRowsSize>({});

  /**
   * Determines whether row sizes will be changed. Default value is "false".
   */
  resizeRowsEnabled = input<boolean>(DEFAULT_RESIZE_ROWS_ENABLED);

  /**
   * Determines whether column sizes will be changed. Default value is "false".
   */
  resizeColumnsEnabled = input<boolean>(DEFAULT_RESIZE_COLUMNS_ENABLED);

  /**
   * The name of the property by which tracking is performed
   */
  trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

  private _rowDisplayComponents: Array<ComponentRef<BaseVirtualGridItemComponent>> = [];

  private _bounds = signal<ISize | null>(null);

  private _scrollSizeX = signal<number>(0);

  private _scrollSizeY = signal<number>(0);

  private _scrollBarHorizontalWeight = 0;

  private _scrollBarVerticalWeight = 0;

  private _resizeObserver: ResizeObserver | null = null;

  private _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  private _onResizeHandler = () => {
    this.calculateScrollBars();

    const bounds = this._container()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._bounds.set({ width: bounds.width - this._scrollBarHorizontalWeight, height: bounds.height - this._scrollBarVerticalWeight });
    } else {
      this._bounds.set({ width: DEFAULT_GRID_SIZE - this._scrollBarHorizontalWeight, height: DEFAULT_GRID_SIZE - this._scrollBarVerticalWeight });
    }
  }

  private _onScrollHandler = (e?: Event) => {
    this.clearScrollToRepeatExecutionTimeout();

    const container = this._container()?.nativeElement;
    if (container) {
      const scrollSizeX = container.scrollLeft, scrollSizeY = container.scrollTop;
      this._scrollSizeX.set(scrollSizeX);
      this._scrollSizeY.set(scrollSizeY);
    }
  }

  private _elementRef: ElementRef<HTMLDivElement> = inject(ElementRef<HTMLDivElement>);

  private _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

  /**
   * Base class of the element row component
   */
  private _rowComponentClass: Component$1<BaseVirtualGridItemComponent> = NgVirtualGridRowComponent;

  /**
   * Base class of the element component
   */
  private _itemComponentClass: Component$1<BaseVirtualGridItemComponent> = NgVirtualGridItemComponent;

  /**
   * Base class trackBox
   */
  private _trackBoxClass: Component$1<TrackBox> = TrackBox;

  /**
   * Dictionary of element sizes by their id
   */
  private _trackBox: TrackBox = new this._trackBoxClass(this.trackBy());

  private _onTrackBoxChangeHandler = (v: number) => {
    this._cacheVersion.set(v);
  }

  private _cacheVersion = signal<number>(-1);

  constructor() {
    NgVirtualGridComponent.__nextId = NgVirtualGridComponent.__nextId + 1 === Number.MAX_SAFE_INTEGER
      ? 0 : NgVirtualGridComponent.__nextId + 1;
    this._id = NgVirtualGridComponent.__nextId;

    this._service.gridId = this._id;
    this._service.initialize(this._trackBox);
    this._pointerDetectService.capture();

    this._initialized = signal<boolean>(false);
    this.$initialized = toObservable(this._initialized);

    this._trackBox.rowDisplayComponents = this._rowDisplayComponents;

    const $trackBy = toObservable(this.trackBy),
      $rowsSize = toObservable(this.rowsSize),
      $columnsSize = toObservable(this.columnsSize),
      $resizeRowsEnabled = toObservable(this.resizeRowsEnabled),
      $resizeColumnsEnabled = toObservable(this.resizeColumnsEnabled),
      $minColumnSize = toObservable(this.minColumnSize),
      $minRowSize = toObservable(this.minRowSize),
      $cellResizeMode = toObservable(this.cellResizeMode);

    $cellResizeMode.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.isAjacentResizeCellMode = isAdjacentCellMode(v, CellResizeModes.ADJACENT);
      }),
    ).subscribe();

    $minColumnSize.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.minColumnSize = this._trackBox.minColumnSize = v;
      }),
    ).subscribe();

    $minRowSize.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.minRowSize = this._trackBox.minRowSize = v;
      }),
    ).subscribe();

    $resizeRowsEnabled.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.resizeRowsEnabled = v;
      }),
    ).subscribe();

    $resizeColumnsEnabled.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._service.resizeColumnsEnabled = v;
      }),
    ).subscribe();

    $rowsSize.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(v => {
        this._trackBox.updateRowsSize(v);
      }),
    ).subscribe();

    $trackBy.pipe(
      takeUntilDestroyed(),
      debounceTime(50),
      tap(v => {
        this._trackBox.trackingPropertyName = v;
      }),
    ).subscribe();

    const $bounds = toObservable(this._bounds).pipe(
      filter(b => !!b),
    ), $items = toObservable(this.items).pipe(
      map(i => !i ? [] : i),
    ),
      $scrollSizeX = toObservable(this._scrollSizeX),
      $scrollSizeY = toObservable(this._scrollSizeY),
      $rowSize = toObservable(this.rowSize).pipe(
        map(v => v <= 0 ? DEFAULT_ROW_SIZE : v),
      ),
      $columnSize = toObservable(this.columnSize).pipe(
        map(v => v <= 0 ? DEFAULT_COLUMN_SIZE : v),
      ),
      $bufferSize = toObservable(this.bufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = toObservable(this.maxBufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $cellConfigRowsMap = toObservable(this.cellConfigRowsMap).pipe(
        map(v => !v ? {} : v),
      ),
      $cellConfigColumnsMap = toObservable(this.cellConfigColumnsMap).pipe(
        map(v => !v ? {} : v),
      ),
      $snap = toObservable(this.snap),
      $enabledBufferOptimization = toObservable(this.enabledBufferOptimization),
      $cacheVersion = toObservable(this._cacheVersion);

    combineLatest([this.$initialized, $bounds, $columnsSize]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([init]) => !!init),
      map(([, bounds, columnsSize]) => ({ bounds, columnsSize })),
      tap(({ bounds, columnsSize }) => {
        this._trackBox.updateColumnSize(columnsSize, bounds.width);
      }),
    ).subscribe();

    combineLatest([this.$initialized, $bounds, this._service.$resize]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([init]) => !!init),
      map(([, bounds, resizeValue]) => ({ bounds, resizeValue })),
      tap(({ bounds, resizeValue }) => {
        const { rowId, columnId, width, height } = resizeValue;
        if (height !== 0 && rowId !== undefined) {
          const data: IRowsSize = { [rowId]: height };
          this._trackBox.updateRowsSize(data);
          this.onRowsSizeChanged.emit(data);
        }
        if (width !== 0 && columnId !== undefined) {
          const data: IColumnsSize = { [columnId]: width }, items = this.items();
          let rowData: { [id: Id]: RowSize } = {};
          for (let i = 0, l = items.length; i < l; i++) {
            const row = items[i], rowId = row.id;
            rowData[rowId] = this._trackBox.getCacheByRowId(rowId);
          }
          this._trackBox.updateRowsSize(rowData);
          this._trackBox.updateColumnSize(data, bounds.width);
          this.onRowsSizeChanged.emit(rowData);
          this.onColumnsSizeChanged.emit(data);
        }
      }),
    ).subscribe();

    combineLatest([$items, $rowSize, $columnSize]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      tap(([items, rowSize, columnSize]) => {
        this._trackBox.resetCollection(items, rowSize, columnSize);
      }),
    ).subscribe();

    combineLatest([this.$initialized, $bounds, $items, $cellConfigRowsMap, $cellConfigColumnsMap, $scrollSizeX, $scrollSizeY, $columnSize, $rowSize,
      $bufferSize, $maxBufferSize, $snap, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, cellConfigRowsMap, cellConfigColumnsMap, scrollSizeX, scrollSizeY, columnSize, rowSize, bufferSize, maxBufferSize,
        snap, enabledBufferOptimization, cacheVersion,
      ]) => {
        const container = this._container();

        if (container) {
          let actualScrollSizeX = container.nativeElement.scrollLeft ?? 0, actualScrollSizeY = container.nativeElement.scrollTop ?? 0;
          const { width, height } = bounds,
            opts: IUpdateCollectionOptions<any, IVirtualGridCollection> = {
              bounds: { width, height }, itemSize: columnSize, rowSize,
              bufferSize, maxBufferSize, scrollSizeX: actualScrollSizeX, scrollSizeY: actualScrollSizeY, snap, enabledBufferOptimization,
            },
            { displayItems, rowDisplayItems, totalSize, totalHeight, columnsLength } = this._trackBox.updateCollection(items, cellConfigRowsMap, cellConfigColumnsMap, opts);

          this.resetBoundsSize(false, totalSize);
          this.resetBoundsSize(true, totalHeight);

          this.createDisplayComponentsIfNeed(displayItems, rowDisplayItems, columnsLength);

          this.tracking();

          const deltaX = this._trackBox.deltaX, deltaY = this._trackBox.deltaY;
          actualScrollSizeX = actualScrollSizeX + deltaX;
          actualScrollSizeY = actualScrollSizeY + deltaY;

          this._trackBox.clearDelta();

          if (scrollSizeX !== actualScrollSizeX || scrollSizeY !== actualScrollSizeY) {
            const params: ScrollToOptions = {
              [LEFT_PROP_NAME]: actualScrollSizeX,
              [TOP_PROP_NAME]: actualScrollSizeY,
              behavior: BEHAVIOR_INSTANT,
            };

            container.nativeElement.scrollTo(params);
          }

          return of(displayItems);
        }

        return of([]);
      }),
    ).subscribe();

    const $itemRenderer = toObservable(this.itemRenderer);

    $itemRenderer.pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(v => !!v),
      tap(v => {
        this._itemRenderer.set(v);
      }),
    ).subscribe();
  }

  /** @internal */
  ngOnInit() {
    this.onInit();
  }

  private onInit() {
    this._service.host = this._grid();
    this.listenCacheChangesIfNeed(true);
    this._initialized.set(true);
  }

  private calculateScrollBars() {
    const container = this._container()?.nativeElement;
    if (container) {
      this._scrollBarHorizontalWeight = container.offsetWidth - container.clientWidth;
      this._scrollBarVerticalWeight = container.offsetHeight - container.clientHeight;
    }
  }

  private listenCacheChangesIfNeed(value: boolean) {
    if (value) {
      if (!this._trackBox.hasEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler)) {
        this._trackBox.addEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler);
      }
    } else {
      if (this._trackBox.hasEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler)) {
        this._trackBox.removeEventListener(TRACK_BOX_CHANGE_EVENT_NAME, this._onTrackBoxChangeHandler);
      }
    }
  }

  private createDisplayComponentsIfNeed(
    displayItems: Array<IRenderVirtualGridCollection> | null,
    rowDisplayItems: IRenderVirtualGridCollection | null,
    columnsLength: number,
  ) {
    if (!displayItems || !rowDisplayItems || !this._gridContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    this._trackBox.items = displayItems;

    this._trackBox.rowItems = rowDisplayItems;

    const _gridContainerRef = this._gridContainerRef;

    const maxRowsLength = rowDisplayItems.length, rowComponents = this._rowDisplayComponents;

    while (rowComponents.length < maxRowsLength) {
      if (_gridContainerRef) {
        const comp = _gridContainerRef.createComponent(this._rowComponentClass);
        rowComponents.push(comp);
      }
    }

    let maxDisplayItemsLength = columnsLength;
    for (let i = 0, l = rowComponents.length; i < l; i++) {
      const row = rowComponents[i].instance as NgVirtualGridRowComponent, listContainerRef = row.listContainerRef,
        components = row.components;

      if (listContainerRef) {
        while (components.length < maxDisplayItemsLength) {
          const comp = row.createComponent(this._itemComponentClass);
          if (comp) {
            comp.instance.renderer = this._itemRenderer();
            this._componentsResizeObserver.observe(comp.instance.element);
          }
        }
      }
    }

    this.resetRenderers();
  }

  private resetRenderers() {
    const doMap: { [componentId: number]: number } = {}, rowComponents = this._rowDisplayComponents;
    for (let i = 0, l = rowComponents.length; i < l; i++) {
      const row = rowComponents[i] as unknown as ComponentRef<NgVirtualGridRowComponent>;
      if (row) {
        const id = row.instance.id, components = row.instance.components;
        for (let j = 0, l1 = components.length; j < l1; j++) {
          const cell = components[j];
          if (cell) {
            const id = cell.instance.id;
            doMap[id] = j;
          }
        }
        doMap[id] = i;
      }
    }

    this._trackBox.setDisplayObjectIndexMapById(doMap);
  }

  /**
   * Tracking by id
   */
  private tracking() {
    this._trackBox.track();
  }

  private resetBoundsSize(isVertical: boolean, totalSize: number) {
    const g = this._grid();
    if (g) {
      g.nativeElement.style[isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME] = `${totalSize}${PX}`;
    }
  }

  /**
   * Returns the bounds of an element with a given id
   */
  getItemBounds(id: Id): ISize | undefined {
    return this._trackBox.getItemBounds(id);
  }

  /**
   * The method scrolls the grid to the element with the given id and returns the value of the scrolled area.
   * Behavior accepts the values ​​"auto", "instant" and "smooth".
   */
  scrollTo(id: Id, behavior: ScrollBehavior = BEHAVIOR_AUTO) {
    this.scrollToExecutor(id, behavior);
  }

  private _scrollToRepeatExecutionTimeout: number | undefined;

  private clearScrollToRepeatExecutionTimeout() {
    clearTimeout(this._scrollToRepeatExecutionTimeout);
  }

  private scrollToExecutor(id: Id, behavior: ScrollBehavior, iteration: number = 0, isLastIteration = false) {
    const items = this.items();
    if (!items || !items.length) {
      return;
    }

    const container = this._container(), columnSize = this.columnSize();
    if (container) {
      this.clearScrollToRepeatExecutionTimeout();

      if (container) {
        container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
      }

      const { width, height } = this._bounds() || { width: DEFAULT_GRID_SIZE, height: DEFAULT_GRID_SIZE },
        items = this.items(), deltaX = this._trackBox.deltaX,
        cellConfigRowsMap = this.cellConfigRowsMap(),
        cellConfigColumnsMap = this.cellConfigColumnsMap(),
        deltaY = this._trackBox.deltaY,
        opts: IGetItemPositionOptions<any, IVirtualGridCollection> = {
          bounds: { width, height }, itemSize: columnSize, rowSize: this.rowSize(),
          bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(),
          scrollSizeX: container.nativeElement.scrollLeft + deltaX,
          scrollSizeY: container.nativeElement.scrollTop + deltaY,
          snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
        },
        { x: scrollX, y: scrollY } = this._trackBox.getItemPosition(id, items, cellConfigRowsMap, cellConfigColumnsMap, opts),
        params: ScrollToOptions = { [LEFT_PROP_NAME]: scrollX, [TOP_PROP_NAME]: scrollY, behavior };

      if (Number.isNaN(scrollX) || scrollX === -1 || Number.isNaN(scrollY) || scrollY === -1) {
        container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
        return;
      }

      this._trackBox.clearDelta();

      if (container) {
        const { displayItems, totalSize, totalHeight, rowDisplayItems, columnsLength } = this._trackBox.updateCollection(items,
          cellConfigRowsMap, cellConfigColumnsMap, {
          ...opts, scrollSizeX: scrollX, scrollSizeY: scrollY, fromItemId: isLastIteration ? undefined : id,
        }), deltaX = this._trackBox.deltaX, deltaY = this._trackBox.deltaY;

        this._trackBox.clearDelta();

        let actualScrollSizeX = scrollX + deltaX, actualScrollSizeY = scrollY + deltaY;

        this.resetBoundsSize(false, totalSize);
        this.resetBoundsSize(true, totalHeight);

        this.createDisplayComponentsIfNeed(displayItems, rowDisplayItems, columnsLength);

        this.tracking();

        const { x: _scrollX, y: _scrollY } = this._trackBox.getItemPosition(id, items, cellConfigRowsMap, cellConfigColumnsMap,
          { ...opts, scrollSizeX: actualScrollSizeX, scrollSizeY: actualScrollSizeY, fromItemId: id });

        if (Number.isNaN(_scrollX) || _scrollX === -1 || Number.isNaN(_scrollY) || _scrollY === -1) {
          container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
          return;
        }

        const notChanged = actualScrollSizeX === _scrollX && actualScrollSizeY === _scrollY;

        if (!notChanged || iteration < MAX_SCROLL_TO_ITERATIONS) {
          this.clearScrollToRepeatExecutionTimeout();
          this._scrollToRepeatExecutionTimeout = setTimeout(() => {
            this.scrollToExecutor(id, BEHAVIOR_INSTANT, iteration + 1, notChanged);
          }) as unknown as number;
        } else {
          this._scrollSizeX.set(actualScrollSizeX);
          this._scrollSizeY.set(actualScrollSizeY);

          container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
        }
      }

      container.nativeElement.scrollTo(params);

      this._scrollSizeX.set(scrollX);
      this._scrollSizeY.set(scrollY);
    }
  }

  /**
   * Scrolls the scroll area to the desired element with the specified ID.
   */
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT) {
    const items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
  }

  private _onContainerScrollHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSizeX = containerEl.nativeElement.scrollTop, scrollSizeY = containerEl.nativeElement.scrollLeft,
        actualScrollSizeX = this._scrollSizeX(), actualScrollSizeY = this._scrollSizeY();
      this._trackBox.deltaDirectionX = actualScrollSizeX > scrollSizeX ? -1 : actualScrollSizeX < scrollSizeX ? 1 : 0;
      this._trackBox.deltaDirectionY = actualScrollSizeY > scrollSizeY ? -1 : actualScrollSizeY < scrollSizeY ? 1 : 0;

      const event = new ScrollEvent({
        directionX: this._trackBox.scrollDirectionX, directionY: this._trackBox.scrollDirectionY,
        container: containerEl.nativeElement, grid: this._grid()!.nativeElement, deltaX: this._trackBox.deltaX,
        deltaY: this._trackBox.deltaY, scrollDeltaX: this._trackBox.scrollDeltaX, scrollDeltaY: this._trackBox.scrollDeltaY,
      });

      this.onScroll.emit(event);
    }
  }

  private _onContainerScrollEndHandler = (e: Event) => {
    const containerEl = this._container();
    if (containerEl) {
      const scrollSizeX = containerEl.nativeElement.scrollTop, scrollSizeY = containerEl.nativeElement.scrollLeft,
        actualScrollSizeX = this._scrollSizeX(), actualScrollSizeY = this._scrollSizeY();
      this._trackBox.deltaDirectionX = actualScrollSizeX > scrollSizeX ? -1 : actualScrollSizeX < scrollSizeX ? 1 : 0;
      this._trackBox.deltaDirectionY = actualScrollSizeY > scrollSizeY ? -1 : actualScrollSizeY < scrollSizeY ? 1 : 0;

      const event = new ScrollEvent({
        directionX: this._trackBox.scrollDirectionX, directionY: this._trackBox.scrollDirectionY,
        container: containerEl.nativeElement, grid: this._grid()!.nativeElement, deltaX: this._trackBox.deltaX,
        deltaY: this._trackBox.deltaY, scrollDeltaX: this._trackBox.scrollDeltaX, scrollDeltaY: this._trackBox.scrollDeltaY,
      });

      this.onScrollEnd.emit(event);
    }
  }

  /** @internal */
  ngAfterViewInit(): void {
    this.afterViewInit();
  }

  private afterViewInit() {
    const containerEl = this._container();
    if (containerEl) {
      // for direction calculation
      containerEl.nativeElement.addEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.addEventListener(SCROLL_END, this._onContainerScrollEndHandler);

      containerEl.nativeElement.addEventListener(SCROLL, this._onScrollHandler);

      this._resizeObserver = new ResizeObserver(this._onResizeHandler);
      this._resizeObserver.observe(containerEl.nativeElement);

      this._onResizeHandler();
    }
  }

  /** @internal */
  ngOnDestroy(): void {
    this.dispose();
  }

  private dispose() {
    this.clearScrollToRepeatExecutionTimeout();

    if (this._trackBox) {
      this._trackBox.dispose();
    }

    if (this._componentsResizeObserver) {
      this._componentsResizeObserver.disconnect();
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    const containerEl = this._container();
    if (containerEl) {
      containerEl.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL, this._onContainerScrollHandler);
      containerEl.nativeElement.removeEventListener(SCROLL_END, this._onContainerScrollEndHandler);
    }

    // if (this._displayComponents) {
    //   for (const rowIndex in this._displayComponents) {
    //     const components = this._displayComponents[rowIndex];
    //     while (components.length > 0) {
    //       const comp = components.pop();
    //       comp?.destroy();
    //     }
    //   }
    // }
  }
}
