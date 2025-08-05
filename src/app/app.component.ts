import { Component, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgVirtualGridComponent } from '../../projects/ng-virtual-grid/src/public-api';
import { LOGO } from './const';
import { IVirtualGridCollection, IVirtualGridColumnCollection, IVirtualGridStickyMap, VirtualGridRow } from '../../projects/ng-virtual-grid/src/lib/models';
import { Id } from '../../projects/ng-virtual-grid/src/lib/types';

const ROWS = 1000, COLUMNS = 100;

interface IRowData { }

interface IColumnData {
  value: string;
}

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

const generateLetter = () => {
  return CHARS[Math.round(Math.random() * CHARS.length)];
}

const generateWord = () => {
  const length = 5 + Math.floor(Math.random() * 50), result = [];
  while (result.length < length) {
    result.push(generateLetter());
  }
  return `${result.join('')}`;
};

const generateText = () => {
  const length = 1 + Math.floor(Math.random() * 8), result = [];
  while (result.length < length) {
    result.push(generateWord());
  }
  let firstWord = '';
  for (let i = 0, l = result[0].length; i < l; i++) {
    const letter = result[0].charAt(i);
    firstWord += i === 0 ? letter.toUpperCase() : letter;
  }
  result[0] = firstWord;
  return `${result.join(' ')}.`;
};

let num = 1;
const generateNumber = () => {
  const n = num;
  num ++;
  return String(n);
}

const GROUP_DYNAMIC_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_DYNAMIC_ITEMS_STICKY_MAP: IVirtualGridStickyMap = {};

const GROUP_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualGridStickyMap = {};

let index = 0;
for (let i = 0, l = ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index;
  index++;
  const type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  for (let j = 0, l1 = COLUMNS; j < l1; j++) {
    index++;
    const id = index;
    GROUP_DYNAMIC_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
    columns.push({ id: id, value: generateText() });
  }
  GROUP_DYNAMIC_ITEMS.push({ id: rowId, columns });
}

let index1 = 0;
for (let i = 0, l = ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index1;
  index1++;
  const type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  for (let j = 0, l1 = COLUMNS; j < l1; j++) {
    index1++;
    const id = index1;
    GROUP_ITEMS_STICKY_MAP[id] = type === 'group-header' ? 1 : 0;
    columns.push({ id: id, value: generateNumber() });
  }
  GROUP_ITEMS.push({ id: rowId, columns });
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly logo = LOGO;

  protected _listContainerRef = viewChild('virtualList', { read: NgVirtualGridComponent });

  protected _dynamicListContainerRef = viewChild('dynamicList', { read: NgVirtualGridComponent });

  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsStickyMap = GROUP_DYNAMIC_ITEMS_STICKY_MAP;

  private _minId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[0].id : 0;
  get minId() { return this._minId; };

  private _maxId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[this.groupDynamicItems.length - 1].id : 0;
  get maxId() { return this._maxId; };

  itemId: Id = this._minId;

  private _minDlId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[0].id : 0;
  get minDlId() { return this._minDlId; };

  private _maxDlId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[this.groupDynamicItems.length - 1].id : 0;
  get maxDlId() { return this._maxDlId; };

  dlItemId: Id = this._minDlId;

  onButtonScrollToIdClickHandler = (e: Event) => {
    const list = this._listContainerRef();
    if (list && this.itemId !== undefined) {
      list.scrollTo(this.itemId, 'smooth');
    }
  }

  onButtonScrollDLToIdClickHandler = (e: Event) => {
    const list = this._dynamicListContainerRef();
    if (list && this.dlItemId !== undefined) {
      list.scrollTo(this.dlItemId, 'instant');
    }
  }

  onItemClick(data: VirtualGridRow) {
    // console.info(`Click: Item ${data['name']} (ID: ${data.id})`);
  }
}
