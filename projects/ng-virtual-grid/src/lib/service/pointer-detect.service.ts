import { Injectable } from '@angular/core';
import { fromEvent, map, Subject, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class PointerDetectService {
  private _$coordinates = new Subject<{ clientX: number, clientY: number, target: EventTarget | null }>();
  $coordinates = this._$coordinates.asObservable();

  private _$up = new Subject<void>();
  $up = this._$up.asObservable();

  private _target: EventTarget | null = null;

  set target(v: EventTarget | null) {
    this._target = v;
  }
  get target() { return this._target; }

  constructor() { }

  capture() {
    fromEvent<PointerEvent>(document, 'pointermove', { passive: false }).pipe(
      takeUntilDestroyed(),
      tap(e => {
        if (e.target === this._target) {
          e.preventDefault();
        }
      }),
      map(v => ({ clientX: v.clientX, clientY: v.clientY, target: v.target })),
      tap(v => {
        this._$coordinates.next(v);
      }),
    ).subscribe();

    fromEvent(document, 'pointerup').pipe(
      takeUntilDestroyed(),
      tap(() => {
        this._$up.next();
      }),
    ).subscribe();

    fromEvent<TouchEvent>(document, 'touchmove', { passive: false }).pipe(
      takeUntilDestroyed(),
      tap(e => {
        if (this._target) {
          e.preventDefault();
        }
      }),
    ).subscribe();
  }
}
