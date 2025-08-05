import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, map, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class PointerDetectService {
  private _$coordinates = new BehaviorSubject<{ clientX: number, clientY: number, target: EventTarget | null }>({ clientX: 0, clientY: 0, target: null });
  $coordinates = this._$coordinates.asObservable();

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
