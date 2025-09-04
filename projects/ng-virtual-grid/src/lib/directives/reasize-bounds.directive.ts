import { Directive, ElementRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, filter, fromEvent, map, tap } from 'rxjs';
import { DEFAULT_RESIZE_COLUMNS_ENABLED, DEFAULT_RESIZE_ROWS_ENABLED } from '../const';
import { PointerDetectService } from '../service/pointer-detect.service';
import { NgVirtualGridService } from '../ng-virtual-grid.service';

/**
 * Resize event
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/directives/reasize-bounds.directive.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class ResizeEvent {
  private _width: number = 0;
  get width() { return this._width; }

  private _height: number = 0;
  get height() { return this._height; }

  private _method: CaptureSide = CaptureSide.NONE;
  get method() { return this._method; }

  constructor(width: number, height: number, method: CaptureSide) {
    this._width = width;
    this._height = height;
    this._method = method;
  }
}

/**
 * Resize capture type
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/directives/reasize-bounds.directive.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum CaptureSide {
  NONE,
  LEFT,
  RIGHT,
  TOP,
  BOTTOM,
};

const CURSOR_COL_RESIZE = 'col-resize',
  CURSOR_ROW_RESIZE = 'row-resize',
  CURSOR_INITIAL = 'initial',
  USER_SELECT_INITIAL = 'initial',
  USER_SELECT_NONE = 'none';

/**
 * Resize bounds directive
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/directives/reasize-bounds.directive.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Directive({
  selector: '[reasizeBounds]'
})
export class ReasizeBoundsDirective {

  private _service = inject(NgVirtualGridService);

  private _pointerDetectService = inject(PointerDetectService);

  resize = output<ResizeEvent>();

  resizeRowsEnabled = input<boolean>(DEFAULT_RESIZE_ROWS_ENABLED);

  resizeColumnsEnabled = input<boolean>(DEFAULT_RESIZE_COLUMNS_ENABLED);

  leftLiId = input<string | undefined>();

  topLiId = input<string | undefined>();

  private _threshold = 10;

  private _element = inject(ElementRef<HTMLDivElement>);

  constructor() {
    const element = this._element.nativeElement, threshold = this._threshold;

    const _$capture = new BehaviorSubject<CaptureSide>(CaptureSide.NONE), $capture = _$capture.asObservable(),
      _$start = new BehaviorSubject<{ clientX: number, clientY: number, width: number; height: number }>
        ({ clientX: 0, clientY: 0, width: 0, height: 0 }),
      $start = _$start.asObservable(),
      _$down = new BehaviorSubject<boolean>(false), $down = _$down.asObservable();

    const $resizeRowsEnabled = toObservable(this.resizeRowsEnabled),
      $resizeColumnsEnabled = toObservable(this.resizeColumnsEnabled);

    fromEvent<PointerEvent>(element, 'pointerdown', { passive: false }).pipe(
      takeUntilDestroyed(),
      tap((event) => {
        const resizeColumnsEnabled = this.resizeColumnsEnabled(), resizeRowsEnabled = this.resizeRowsEnabled(),
          { x, y, width, height } = element.getBoundingClientRect(),
          cx = event.clientX - x, cy = event.clientY - y;
        if (resizeColumnsEnabled && cx >= (width - threshold) && cx <= width) {
          this._pointerDetectService.target = event.target;
          _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
          _$capture.next(CaptureSide.RIGHT);
          _$down.next(true);
          element.style.cursor = CURSOR_COL_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        } else if (this._service.isAjacentResizeCellMode && resizeColumnsEnabled && cx >= 0 && cx <= threshold) {
          if (this._service.isAjacentResizeCellMode) {
            const hostElement = this._service.host?.nativeElement, adjacentId = this.leftLiId(),
              adjacentTarget = (adjacentId && hostElement ? hostElement.querySelector(`#${adjacentId}`) : null) as EventTarget;
            this._pointerDetectService.target = adjacentTarget;
            if (adjacentTarget) {
              const adjacentElement = adjacentTarget as HTMLElement, { x, y, width, height } = adjacentElement.getBoundingClientRect();
              _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
              _$capture.next(CaptureSide.LEFT);
              _$down.next(true);
              element.style.cursor = CURSOR_COL_RESIZE;
              element.style.userSelect = USER_SELECT_NONE;
            }
          } else {
            _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
            _$capture.next(CaptureSide.LEFT);
            _$down.next(true);
            element.style.cursor = CURSOR_COL_RESIZE;
            element.style.userSelect = USER_SELECT_NONE;
          }
          return;
        } else if (resizeRowsEnabled && cy >= (height - threshold) && cy <= height) {
          this._pointerDetectService.target = event.target;
          _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
          _$capture.next(CaptureSide.BOTTOM);
          _$down.next(true);
          element.style.cursor = CURSOR_ROW_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        } else if (this._service.isAjacentResizeCellMode && resizeRowsEnabled && cy >= 0 && cy <= threshold) {
          if (this._service.isAjacentResizeCellMode) {
            const hostElement = this._service.host?.nativeElement, adjacentId = this.topLiId(),
              adjacentTarget = (adjacentId && hostElement ? hostElement.querySelector(`#${adjacentId}`) : null) as EventTarget;
            this._pointerDetectService.target = adjacentTarget;
            if (adjacentTarget) {
              const adjacentElement = adjacentTarget as HTMLElement, { width, height } = adjacentElement.getBoundingClientRect();
              _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
              _$capture.next(CaptureSide.TOP);
              _$down.next(true);
              element.style.cursor = CURSOR_ROW_RESIZE;
              element.style.userSelect = USER_SELECT_NONE;
            }
          } else {
            _$start.next({ clientX: event.clientX, clientY: event.clientY, width, height });
            _$capture.next(CaptureSide.TOP);
            _$down.next(true);
            element.style.cursor = CURSOR_ROW_RESIZE;
            element.style.userSelect = USER_SELECT_NONE;
          }
          return;
        }
        element.style.cursor = CURSOR_INITIAL;
        element.style.userSelect = USER_SELECT_INITIAL;
        this._pointerDetectService.target = null;
        _$capture.next(CaptureSide.NONE);
      }),
    ).subscribe();

    this._pointerDetectService.$up.pipe(
      takeUntilDestroyed(),
      tap(() => {
        this._pointerDetectService.target = null;
        _$down.next(false);
      }),
    ).subscribe();

    combineLatest([$resizeRowsEnabled, $resizeColumnsEnabled, $down, this._pointerDetectService.$coordinates]).pipe(
      takeUntilDestroyed(),
      filter(([resizeRowsEnabled, resizeColumnsEnabled, down]) => (resizeRowsEnabled || resizeColumnsEnabled) && !down),
      map(([resizeRowsEnabled, resizeColumnsEnabled, , event]) => ({ resizeRowsEnabled, resizeColumnsEnabled, event })),
      tap(({ resizeRowsEnabled, resizeColumnsEnabled, event }) => {
        const { x, y, width, height } = element.getBoundingClientRect(),
          cx = event.clientX - x, cy = event.clientY - y;
        if (resizeColumnsEnabled && cx >= (width - threshold) && cx <= width) {
          element.style.cursor = CURSOR_COL_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        } else if (this._service.isAjacentResizeCellMode && resizeColumnsEnabled && cx >= 0 && cx <= threshold) {
          element.style.cursor = CURSOR_COL_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        } else if (resizeRowsEnabled && cy >= (height - threshold) && cy <= height) {
          element.style.cursor = CURSOR_ROW_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        } else if (this._service.isAjacentResizeCellMode && resizeRowsEnabled && cy >= 0 && cy <= threshold) {
          element.style.cursor = CURSOR_ROW_RESIZE;
          element.style.userSelect = USER_SELECT_NONE;
          return;
        }
        element.style.cursor = CURSOR_INITIAL;
        element.style.userSelect = USER_SELECT_INITIAL;
      }),
    ).subscribe();

    combineLatest([$resizeRowsEnabled, $resizeColumnsEnabled, $down, $capture, $start, this._pointerDetectService.$coordinates]).pipe(
      takeUntilDestroyed(),
      filter(([resizeRowsEnabled, resizeColumnsEnabled, down, capture]) => (resizeRowsEnabled || resizeColumnsEnabled) && down && capture !== CaptureSide.NONE),
      map(([resizeRowsEnabled, resizeColumnsEnabled, , capture, start, mouseEvent]) => ({ resizeRowsEnabled, resizeColumnsEnabled, capture, start, ...mouseEvent })),
      tap(({ resizeRowsEnabled, resizeColumnsEnabled, capture, start, clientX, clientY }) => {
        const width = start.width + (clientX - start.clientX), height = start.height + (clientY - start.clientY);
        let w = 0, h = 0;
        if (resizeColumnsEnabled) {
          if ((capture === CaptureSide.LEFT || capture === CaptureSide.RIGHT)) {
            w = width > this._service.minColumnSize ? width > this._service.maxColumnSize ? this._service.maxColumnSize : width : this._service.minColumnSize;
          }
        }
        if (resizeRowsEnabled) {
          if (capture === CaptureSide.TOP || capture === CaptureSide.BOTTOM) {
            h = height > this._service.minRowSize ? height > this._service.maxRowSize ? this._service.maxRowSize : height : this._service.minRowSize;
          }
        }
        const event = new ResizeEvent(w, h, capture);
        this.resize.emit(event);
      }),
    ).subscribe();
  }
}
