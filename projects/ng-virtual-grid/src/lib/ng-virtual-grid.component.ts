import {
  AfterViewInit, ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, input,
  OnDestroy, OnInit, output, signal, TemplateRef, ViewChild, viewChild, ViewContainerRef, ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { NgVirtualGridItemComponent } from './components/ng-virtual-grid-item/ng-virtual-grid-item.component';
import {
  BEHAVIOR_AUTO, BEHAVIOR_INSTANT, CLASS_LIST_HORIZONTAL, CLASS_LIST_VERTICAL, DEFAULT_DIRECTION, DEFAULT_DYNAMIC_SIZE,
  DEFAULT_ENABLED_BUFFER_OPTIMIZATION, DEFAULT_ITEM_SIZE, DEFAULT_BUFFER_SIZE, DEFAULT_LIST_SIZE, DEFAULT_SNAP, DEFAULT_SNAPPING_METHOD,
  HEIGHT_PROP_NAME, LEFT_PROP_NAME, MAX_SCROLL_TO_ITERATIONS, PX, SCROLL, SCROLL_END, TOP_PROP_NAME, TRACK_BY_PROPERTY_NAME, WIDTH_PROP_NAME,
  DEFAULT_MAX_BUFFER_SIZE,
} from './const';
import { IScrollEvent, IVirtualGridCollection, IVirtualGridStickyMap } from './models';
import { Id, ISize } from './types';
import { IRenderVirtualListCollection } from './models/render-collection.model';
import { Direction, Directions, SnappingMethod } from './enums';
import { ScrollEvent, toggleClassName } from './utils';
import { IGetItemPositionOptions, IUpdateCollectionOptions, TRACK_BOX_CHANGE_EVENT_NAME, TrackBox } from './utils/trackBox';
import { isSnappingMethodAdvenced } from './utils/snapping-method';
import { FIREFOX_SCROLLBAR_OVERLAP_SIZE, IS_FIREFOX } from './utils/browser';
import { BaseVirtualListItemComponent } from './models/base-virtual-list-item-component';
import { Component$1 } from './models/component.model';
import { isDirection } from './utils/isDirection';

/**
 * Virtual list component.
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/ng-virtual-list.component.ts
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
})
export class NgVirtualGridComponent implements AfterViewInit, OnInit, OnDestroy {
  private static __nextId: number = 0;

  private _id: number = NgVirtualGridComponent.__nextId;
  /**
   * Readonly. Returns the unique identifier of the component.
   */
  get id() { return this._id; }

  @ViewChild('renderersContainer', { read: ViewContainerRef })
  private _listContainerRef: ViewContainerRef | undefined;

  private _container = viewChild<ElementRef<HTMLDivElement>>('container');

  private _list = viewChild<ElementRef<HTMLUListElement>>('list');

  /**
   * Fires when the list has been scrolled.
   */
  onScroll = output<IScrollEvent>();

  /**
   * Fires when the list has completed scrolling.
   */
  onScrollEnd = output<IScrollEvent>();

  private _itemsOptions = {
    transform: (v: IVirtualGridCollection | undefined) => {
      this._trackBox.resetCollection(v, this.itemSize());
      return v;
    },
  } as any;

  /**
   * Collection of list items.
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
   * Dictionary zIndex by id of the list element. If the value is not set or equal to 0,
   * then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element.
   */
  stickyMap = input<IVirtualGridStickyMap>({});

  private _itemSizeOptions = {
    transform: (v: number | undefined) => {
      if (v === undefined) {
        return DEFAULT_ITEM_SIZE;
      }
      const val = Number(v);
      return Number.isNaN(val) || val <= 0 ? DEFAULT_ITEM_SIZE : val;
    },
  } as any;

  /**
   * If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element.
   * Ignored if the dynamicSize property is true.
   */
  itemSize = input<number>(DEFAULT_ITEM_SIZE, { ...this._itemSizeOptions });

  /**
   * If true then the items in the list can have different sizes and the itemSize property is ignored.
   * If false then the items in the list have a fixed size specified by the itemSize property. The default value is false.
   */
  dynamicSize = input(DEFAULT_DYNAMIC_SIZE);

  /**
   * Determines the direction in which elements are placed. Default value is "vertical".
   */
  direction = input<Direction>(DEFAULT_DIRECTION);

  private _itemOffsetTransform = {
    transform: (v: number | undefined) => {
      throw Error('"itemOffset" parameter is deprecated. Use "bufferSize" and "maxBufferSize".');
    }
  } as any;

  /**
   * Number of elements outside the scope of visibility. Default value is 2.
   * @deprecated "itemOffset" parameter is deprecated. Use "bufferSize" and "maxBufferSize".
   */
  itemsOffset = input<number>(DEFAULT_BUFFER_SIZE, { ...this._itemOffsetTransform });

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

  private _isVertical = this.getIsVertical();

  private _displayComponents: Array<ComponentRef<BaseVirtualListItemComponent>> = [];

  private _snapedDisplayComponent: ComponentRef<BaseVirtualListItemComponent> | undefined;

  private _bounds = signal<ISize | null>(null);

  private _scrollSizeX = signal<number>(0);

  private _scrollSizeY = signal<number>(0);

  private _resizeObserver: ResizeObserver | null = null;

  private _componentsResizeObserver = new ResizeObserver(() => {
    this._trackBox.changes();
  });

  private _onResizeHandler = () => {
    const bounds = this._container()?.nativeElement?.getBoundingClientRect();
    if (bounds) {
      this._bounds.set({ width: bounds.width, height: bounds.height });
    } else {
      this._bounds.set({ width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE });
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

  private _elementRef = inject(ElementRef<HTMLDivElement>);

  private _initialized!: WritableSignal<boolean>;

  readonly $initialized!: Observable<boolean>;

  /**
   * The name of the property by which tracking is performed
   */
  trackBy = input<string>(TRACK_BY_PROPERTY_NAME);

  /**
   * Base class of the element component
   */
  private _itemComponentClass: Component$1<BaseVirtualListItemComponent> = NgVirtualGridItemComponent;

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

    this._initialized = signal<boolean>(false);
    this.$initialized = toObservable(this._initialized);

    this._trackBox.displayComponents = this._displayComponents;

    const $trackBy = toObservable(this.trackBy);

    $trackBy.pipe(
      takeUntilDestroyed(),
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
      $itemSize = toObservable(this.itemSize).pipe(
        map(v => v <= 0 ? DEFAULT_ITEM_SIZE : v),
      ),
      $bufferSize = toObservable(this.bufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $maxBufferSize = toObservable(this.maxBufferSize).pipe(
        map(v => v < 0 ? DEFAULT_BUFFER_SIZE : v),
      ),
      $stickyMap = toObservable(this.stickyMap).pipe(
        map(v => !v ? {} : v),
      ),
      $snap = toObservable(this.snap),
      $isVertical = toObservable(this.direction).pipe(
        map(v => this.getIsVertical(v || DEFAULT_DIRECTION)),
      ),
      $dynamicSize = toObservable(this.dynamicSize),
      $enabledBufferOptimization = toObservable(this.enabledBufferOptimization),
      $cacheVersion = toObservable(this._cacheVersion);

    $isVertical.pipe(
      takeUntilDestroyed(),
      tap(v => {
        this._isVertical = v;
        const el: HTMLElement = this._elementRef.nativeElement;
        toggleClassName(el, v ? CLASS_LIST_VERTICAL : CLASS_LIST_HORIZONTAL, v ? CLASS_LIST_HORIZONTAL : CLASS_LIST_VERTICAL);
      }),
    ).subscribe();

    $dynamicSize.pipe(
      takeUntilDestroyed(),
      tap(dynamicSize => {
        this.listenCacheChangesIfNeed(dynamicSize);
      })
    ).subscribe();

    combineLatest([this.$initialized, $bounds, $items, $stickyMap, $scrollSizeX, $scrollSizeY, $itemSize,
      $bufferSize, $maxBufferSize, $snap, $isVertical, $dynamicSize, $enabledBufferOptimization, $cacheVersion,
    ]).pipe(
      takeUntilDestroyed(),
      distinctUntilChanged(),
      filter(([initialized]) => !!initialized),
      switchMap(([,
        bounds, items, stickyMap, scrollSizeX, scrollSizeY, itemSize,
        bufferSize, maxBufferSize, snap, isVertical, dynamicSize, enabledBufferOptimization, cacheVersion,
      ]) => {
        const container = this._container();

        if (container) {
          let actualScrollSizeX = container.nativeElement.scrollLeft ?? 0, actualScrollSizeY = container.nativeElement.scrollTop ?? 0;
          const { width, height } = bounds,
            opts: IUpdateCollectionOptions<any, IVirtualGridCollection> = {
              bounds: { width, height }, dynamicSize, isVertical, itemSize,
              bufferSize, maxBufferSize, scrollSizeX: actualScrollSizeX, scrollSizeY: actualScrollSizeY, snap, enabledBufferOptimization,
            },
            { displayItems, totalSize, totalHeight } = this._trackBox.updateCollection(items, stickyMap, opts);

          this.resetBoundsSize(false, totalSize);
          this.resetBoundsSize(true, totalHeight);

          this.createDisplayComponentsIfNeed(displayItems);

          this.tracking();

          const deltaX = this._trackBox.deltaX;
          actualScrollSizeX = actualScrollSizeX + deltaX;
          actualScrollSizeY = actualScrollSizeY + deltaX;

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
    this._initialized.set(true);
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

  private getIsVertical(d?: Direction) {
    const dir = d || this.direction();
    return isDirection(dir, Directions.VERTICAL);
  }

  private createDisplayComponentsIfNeed(displayItems: IRenderVirtualListCollection | null) {
    if (!displayItems || !this._listContainerRef) {
      this._trackBox.setDisplayObjectIndexMapById({});
      return;
    }

    this._trackBox.items = displayItems;

    const _listContainerRef = this._listContainerRef;

    const maxLength = displayItems.length, components = this._displayComponents;

    while (components.length < maxLength) {
      if (_listContainerRef) {
        const comp = _listContainerRef.createComponent(this._itemComponentClass);
        components.push(comp);

        this._componentsResizeObserver.observe(comp.instance.element);
      }
    }

    this.resetRenderers();
  }

  private resetRenderers(itemRenderer?: TemplateRef<HTMLElement>) {
    const doMap: { [id: number]: number } = {}, components = this._displayComponents;
    for (let i = 0, l = components.length; i < l; i++) {
      const item = components[i];
      if (item) {
        const id = item.instance.id;
        item.instance.renderer = itemRenderer || this._itemRenderer();
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
    const l = this._list();
    if (l) {
      l.nativeElement.style[isVertical ? HEIGHT_PROP_NAME : WIDTH_PROP_NAME] = `${totalSize}${PX}`;
    }
  }

  /**
   * Returns the bounds of an element with a given id
   */
  getItemBounds(id: Id): ISize | undefined {
    return this._trackBox.getItemBounds(id);
  }

  /**
   * The method scrolls the list to the element with the given id and returns the value of the scrolled area.
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
    // const items = this.items();
    // if (!items || !items.length) {
    //   return;
    // }

    // const dynamicSize = this.dynamicSize(), container = this._container(), itemSize = this.itemSize();
    // if (container) {
    //   this.clearScrollToRepeatExecutionTimeout();

    //   if (dynamicSize) {
    //     if (container) {
    //       container.nativeElement.removeEventListener(SCROLL, this._onScrollHandler);
    //     }

    //     const { width, height } = this._bounds() || { width: DEFAULT_LIST_SIZE, height: DEFAULT_LIST_SIZE },
    //       stickyMap = this.stickyMap(), items = this.items(), isVertical = this._isVertical, deltaX = this._trackBox.deltaX,
    //       deltaY = this._trackBox.deltaY,
    //       opts: IGetItemPositionOptions<any, IVirtualGridCollection> = {
    //         bounds: { width, height }, collection: items, dynamicSize, isVertical: this._isVertical, itemSize,
    //         bufferSize: this.bufferSize(), maxBufferSize: this.maxBufferSize(),
    //         scrollSizeX: container.nativeElement.scrollLeft + deltaX,
    //         scrollSizeY: container.nativeElement.scrollTop + deltaY,
    //         snap: this.snap(), fromItemId: id, enabledBufferOptimization: this.enabledBufferOptimization(),
    //       },
    //       scrollSize = this._trackBox.getItemPosition(id, stickyMap, opts),
    //       params: ScrollToOptions = { [isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };

    //     if (scrollSize === -1) {
    //       container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
    //       return;
    //     }

    //     this._trackBox.clearDelta();

    //     if (container) {
    //       const { displayItems, totalSize } = this._trackBox.updateCollection(items, stickyMap, {
    //         ...opts, scrollSize, fromItemId: isLastIteration ? undefined : id,
    //       }), deltaX = this._trackBox.deltaX, deltaY = this._trackBox.deltaY;

    //       this._trackBox.clearDelta();

    //       let actualScrollSizeX = scrollSizeX + deltaX, actualScrollSizeY = scrollSizeY + deltaY;

    //       this.resetBoundsSize(isVertical, totalSize);

    //       this.createDisplayComponentsIfNeed(displayItems);

    //       this.tracking();

    //       const _scrollSize = this._trackBox.getItemPosition(id, stickyMap, { ...opts, scrollSize: actualScrollSize, fromItemId: id });

    //       if (_scrollSize === -1) {
    //         container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
    //         return;
    //       }

    //       const notChanged = actualScrollSize === _scrollSize

    //       if (!notChanged || iteration < MAX_SCROLL_TO_ITERATIONS) {
    //         this.clearScrollToRepeatExecutionTimeout();
    //         this._scrollToRepeatExecutionTimeout = setTimeout(() => {
    //           this.scrollToExecutor(id, BEHAVIOR_INSTANT, iteration + 1, notChanged);
    //         }) as unknown as number;
    //       } else {
    //         this._scrollSize.set(actualScrollSize);

    //         container.nativeElement.addEventListener(SCROLL, this._onScrollHandler);
    //       }
    //     }

    //     container.nativeElement.scrollTo(params);

    //     this._scrollSize.set(scrollSize);
    //   } else {
    //     const index = items.findIndex(item => item.id === id);
    //     if (index > -1) {
    //       const scrollSize = index * this.itemSize();
    //       const params: ScrollToOptions = { [this._isVertical ? TOP_PROP_NAME : LEFT_PROP_NAME]: scrollSize, behavior };
    //       container.nativeElement.scrollTo(params);
    //     }
    //   }
    // }
  }

  /**
   * Scrolls the scroll area to the desired element with the specified ID.
   */
  scrollToEnd(behavior: ScrollBehavior = BEHAVIOR_INSTANT) {
    const items = this.items(), latItem = items[items.length > 0 ? items.length - 1 : 0];
    this.scrollTo(latItem.id, behavior);
  }

  private _onContainerScrollHandler = (e: Event) => {
    // const containerEl = this._container();
    // if (containerEl) {
    //   const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
    //   this._trackBox.deltaDirection = this._scrollSize() > scrollSize ? -1 : this._scrollSize() < scrollSize ? 1 : 0;

    //   const event = new ScrollEvent({
    //     direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
    //     list: this._list()!.nativeElement, delta: this._trackBox.delta,
    //     scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
    //   });

    //   this.onScroll.emit(event);
    // }
  }

  private _onContainerScrollEndHandler = (e: Event) => {
    // const containerEl = this._container();
    // if (containerEl) {
    //   const scrollSize = (this._isVertical ? containerEl.nativeElement.scrollTop : containerEl.nativeElement.scrollLeft);
    //   this._trackBox.deltaDirection = this._scrollSize() > scrollSize ? -1 : 0;

    //   const event = new ScrollEvent({
    //     direction: this._trackBox.scrollDirection, container: containerEl.nativeElement,
    //     list: this._list()!.nativeElement, delta: this._trackBox.delta,
    //     scrollDelta: this._trackBox.scrollDelta, isVertical: this._isVertical,
    //   });

    //   this.onScrollEnd.emit(event);
    // }
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

    if (this._snapedDisplayComponent) {
      this._snapedDisplayComponent.destroy();
    }

    if (this._displayComponents) {
      while (this._displayComponents.length > 0) {
        const comp = this._displayComponents.pop();
        comp?.destroy();
      }
    }
  }
}
