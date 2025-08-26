import { ElementRef, Injectable, signal } from '@angular/core';
import { Id } from './types';
import { Subject } from 'rxjs';
import { ICellResizeEvent } from './models/cell-resize-event.model';
import { DEFAULT_MIN_COLUMN_SIZE, DEFAULT_MIN_ROW_SIZE, DEFAULT_RESIZE_COLUMNS_ENABLED, DEFAULT_RESIZE_ROWS_ENABLED } from './const';
import { TrackBox } from './utils/trackBox';

@Injectable({
  providedIn: 'root'
})
export class NgVirtualGridService {
  private _nextComponentId: number = 0;

  private _$resize = new Subject<ICellResizeEvent>();
  $resize = this._$resize.asObservable();

  private _resizeRowsEnabled: boolean = DEFAULT_RESIZE_ROWS_ENABLED;

  resizeRows = signal<boolean>(this._resizeRowsEnabled);

  set resizeRowsEnabled(v: boolean) {
    if (this._resizeRowsEnabled !== v) {
      this._resizeRowsEnabled = v;
      this.resizeRows.set(v);
    }
  }
  get resizeRowsEnabled() { return this._resizeRowsEnabled; }

  private _resizeColumnsEnabled: boolean = DEFAULT_RESIZE_COLUMNS_ENABLED;

  resizeColumns = signal<boolean>(this._resizeColumnsEnabled);

  set resizeColumnsEnabled(v: boolean) {
    if (this._resizeColumnsEnabled !== v) {
      this._resizeColumnsEnabled = v;
      this.resizeColumns.set(v);
    }
  }
  get resizeColumnsEnabled() { return this._resizeColumnsEnabled; }

  minColumnSize = DEFAULT_MIN_COLUMN_SIZE;

  minRowSize = DEFAULT_MIN_ROW_SIZE;

  isAjacentResizeCellMode: boolean = false;

  gridId = 0;

  host: ElementRef<HTMLUListElement> | undefined;

  private _trackBox: TrackBox | undefined;

  constructor() { }

  initialize(trackBox: TrackBox) {
    this._trackBox = trackBox;
  }

  generateComponentId() {
    return this._nextComponentId = this._nextComponentId === Number.MAX_SAFE_INTEGER
      ? 0 : this._nextComponentId + 1;
  }

  onResize(rowId: Id, columnId: Id, width: number, height: number) {
    this._$resize.next({
      rowId,
      columnId,
      width,
      height,
    });
  }

  getRowSizeById(id: Id) {
    return this._trackBox ? this._trackBox.getRowSizeById(id) : undefined;
  }
}
