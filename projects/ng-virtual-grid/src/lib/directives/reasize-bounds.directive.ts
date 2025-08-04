import { Directive, ElementRef, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, filter, fromEvent, map, tap } from 'rxjs';

export class ResizeEvent {
  private _dx: number = 0;
  get dx() { return this._dx; }

  private _dy: number = 0;
  get dy() { return this._dy; }

  constructor(dx: number, dy: number) {
    this._dx = dx;
    this._dy = dy;
  }
}

enum CaptureSide {
  NONE,
  LEFT,
  RIGHT,
  TOP,
  BOTTOM,
};

@Directive({
  selector: '[reasizeBounds]'
})
export class ReasizeBoundsDirective {

  resize = output<ResizeEvent>();

  private _threshold = 10;

  constructor(private _element: ElementRef<HTMLDivElement>) {
    const element = this._element.nativeElement, threshold = this._threshold;

    const _$capture = new BehaviorSubject<CaptureSide>(CaptureSide.NONE), $capture = _$capture.asObservable(),
      _$start = new BehaviorSubject<{ clientX: number, clientY: number }>({ clientX: 0, clientY: 0 }), $start = _$start.asObservable(),
      _$down = new BehaviorSubject<boolean>(false), $down = _$down.asObservable();

    const $mouseMove = fromEvent(window, 'mousemove').pipe(
      takeUntilDestroyed(),
      map((v: any) => ({ clientX: v.clientX, clientY: v.clientY })),
    );

    fromEvent(element, 'mousedown').pipe(
      takeUntilDestroyed(),
      tap(() => {
        _$down.next(true);
      }),
    ).subscribe();

    fromEvent(window, 'mouseup').pipe(
      takeUntilDestroyed(),
      tap(() => {
        _$down.next(false);
      }),
    ).subscribe();

    combineLatest([$down, $mouseMove]).pipe(
      takeUntilDestroyed(),
      filter(([down]) => !down),
      map(([, coords]) => ({ coords })),
      tap(({ coords }) => {
        const { x, y, width, height } = element.getBoundingClientRect(),
          cx = coords.clientX - x, cy = coords.clientY - y;
        if (cx >= 0 && cx <= threshold) {
          _$start.next({ clientX: coords.clientX, clientY: coords.clientY });
          _$capture.next(CaptureSide.LEFT);
          element.style.cursor = 'col-resize';
          element.style.userSelect = 'none';
          return;
        } else if (cx >= width - threshold && cx <= width) {
          _$start.next({ clientX: coords.clientX, clientY: coords.clientY });
          _$capture.next(CaptureSide.RIGHT);
          element.style.cursor = 'col-resize';
          element.style.userSelect = 'none';
          return;
        } else if (cy >= 0 && cy <= threshold) {
          _$start.next({ clientX: coords.clientX, clientY: coords.clientY });
          _$capture.next(CaptureSide.TOP);
          element.style.cursor = 'row-resize';
          element.style.userSelect = 'none';
          return;
        } else if (cy >= height - threshold && cy <= height) {
          _$start.next({ clientX: coords.clientX, clientY: coords.clientY });
          _$capture.next(CaptureSide.BOTTOM);
          element.style.cursor = 'row-resize';
          element.style.userSelect = 'none';
          return;
        }
        element.style.cursor = element.style.userSelect = 'auto';
      }),
    ).subscribe();

    combineLatest([$down, $capture, $start, $mouseMove]).pipe(
      takeUntilDestroyed(),
      filter(([down, capture]) => down && capture !== CaptureSide.NONE),
      map(([, capture, start, mouseEvent]) => ({ capture, start, ...mouseEvent })),
      tap(({ capture, start, clientX, clientY }) => {
        const dx = clientX - start.clientX, dy = clientY - start.clientY,
          event = new ResizeEvent(capture === CaptureSide.LEFT || capture === CaptureSide.RIGHT ? dx : 0,
            capture === CaptureSide.TOP || capture === CaptureSide.BOTTOM ? dy : 0);
        this.resize.emit(event);
      }),
    ).subscribe();
  }
}
