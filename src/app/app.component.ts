import { Component, viewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgVirtualGridComponent, IColumnsSize, IRowsSize, IVirtualGridCollection, IVirtualGridColumnCollection, IVirtualGridColumnConfigMap,
  IVirtualGridRowConfigMap, IRenderVirtualGridItem, Id, ISize,
} from '../../projects/ng-virtual-grid/src/public-api';
import { LOGO } from './const';
import { PersistentStore } from './utils';

const ROWS = 1000, COLUMNS = 100, DYNAMIC_ROWS = 2000, DYNAMIC_COLUMNS = 50;

interface IRowData { }

interface IColumnData {
  value: string;
  isBorderStart?: boolean;
  isBorderEnd?: boolean;
}

const CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

const generateLetter = () => {
  return CHARS[Math.round(Math.random() * CHARS.length)];
}

const generateWord = () => {
  const length = 5 + Math.floor(Math.random() * 20), result = [];
  while (result.length < length) {
    result.push(generateLetter());
  }
  return `${result.join('')}`;
};

const generateText = () => {
  const length = 1 + Math.floor(Math.random() * 10), result = [];
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
  num++;
  return String(n);
}

const GROUP_DYNAMIC_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP: IVirtualGridRowConfigMap = {},
  GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP: IVirtualGridColumnConfigMap = {},
  GROUP_DYNAMIC_COLUMNS_SIZE_MAP: IColumnsSize = {},
  GROUP_DYNAMIC_ROWS_SIZE_MAP: IRowsSize = {};

const GROUP_DYNAMIC_ITEMS1: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1: IVirtualGridRowConfigMap = {},
  GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP1: IVirtualGridColumnConfigMap = {},
  GROUP_DYNAMIC_COLUMNS_SIZE_MAP1: IColumnsSize = {},
  GROUP_DYNAMIC_ROWS_SIZE_MAP1: IRowsSize = {};

const GROUP_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualGridRowConfigMap = {};

let index = 0;
for (let i = 0, l = DYNAMIC_ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index;
  index++;
  if (i === 0 || i === l - 20 || i === l - 1) {
    if (!GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId]) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId] = {};
    }
    if (i === 0) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId].sticky = 1;
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId].resizable = false;
    } else if (i === l - 1) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId].sticky = 2;
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId].resizable = false;
    }
  }
  for (let j = 0, l1 = DYNAMIC_COLUMNS; j < l1; j++) {
    index++;
    const id = index;
    if (j === 0 || j === l1 - 1) {
      if (i === 0 || i === l - 1) {
        GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP[j] = {};
        if (j === 0) {
          GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP[j].resizable = false;
        } else if (j === l1 - 1) {
          GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP[j].resizable = false;
        }
      }
      GROUP_DYNAMIC_COLUMNS_SIZE_MAP[j] = 36;
    }
    let value: string, isBorderStart: boolean = false, isBorderEnd: boolean = false;
    if ((i === 0 && j === 0) || (i === 0 && j === l1 - 1)) {
      value = '№';
    } else if ((i === l - 1 && j === 0) || (i === l - 1 && j === l1 - 1)) {
      value = '';
    } else if (i === 0 || i === l - 1) {
      value = String(j);
    } else if (j === 0 || j === l1 - 1) {
      value = String(i);
    } else {
      value = `${id} ${generateText()}`;
    }
    columns.push({ id: id, value, isBorderStart, isBorderEnd });
  }
  if (i === 0 || i === l - 1) {
    GROUP_DYNAMIC_ROWS_SIZE_MAP[rowId] = 40;
  }
  GROUP_DYNAMIC_ITEMS.push({ id: rowId, columns });
}

let index2 = 0;
for (let i = 0, l = DYNAMIC_ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index2;
  index2++;
  if (i === 0 || i === l - 20 || i === l - 1) {
    if (!GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId]) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId] = {};
    }
    if (i === 0) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId].sticky = 1;
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId].resizable = false;
    } else if (i === l - 1) {
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId].sticky = 2;
      GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1[rowId].resizable = false;
    }
  }
  for (let j = 0, l1 = 3; j < l1; j++) {
    index2++;
    const id = index2;
    GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP1[j] = { resizable: false };
    if (j === 0 || j === l1 - 1) {
      GROUP_DYNAMIC_COLUMNS_SIZE_MAP1[j] = 36;
    }
    if (j === 1) {
      GROUP_DYNAMIC_COLUMNS_SIZE_MAP1[j] = '1fr';
    }
    let value: string, isBorderStart: boolean = false, isBorderEnd: boolean = false;
    if ((i === 0 && j === 0) || (i === 0 && j === l1 - 1)) {
      value = '№';
    } else if ((i === l - 1 && j === 0) || (i === l - 1 && j === l1 - 1)) {
      value = '';
    } else if (i === 0 || i === l - 1) {
      value = String(j);
    } else if (j === 0 || j === l1 - 1) {
      value = String(i);
    } else {
      value = `${id} ${generateText()}`;
    }
    columns.push({ id: id, value, isBorderStart, isBorderEnd });
  }
  if (i === 0 || i === l - 1) {
    GROUP_DYNAMIC_ROWS_SIZE_MAP1[rowId] = 40;
  }
  GROUP_DYNAMIC_ITEMS1.push({ id: rowId, columns });
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
    GROUP_ITEMS_STICKY_MAP[id] = {
      sticky: type === 'group-header' ? 1 : 0,
    };
    columns.push({ id: id, value: generateNumber() });
  }
  GROUP_ITEMS.push({ id: rowId, columns });
}

const getDynamicRowsSize = () => {
  const defaultValue = GROUP_DYNAMIC_ROWS_SIZE_MAP,
    storedValue = PersistentStore.get('rows'),
    result = { ...defaultValue, ...storedValue || {} };
  return result;
};

const getDynamicColumnsSize = () => {
  const defaultValue = GROUP_DYNAMIC_COLUMNS_SIZE_MAP,
    storedValue = PersistentStore.get('columns'),
    result = { ...defaultValue, ...storedValue || {} };
  return result;
};

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  readonly logo = LOGO;

  protected _gridContainerRef = viewChild('grid', { read: NgVirtualGridComponent });

  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsRowConfigMap = GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP;
  groupDynamicItemsColumnConfigMap = GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP;
  groupDynamicColumnsSize = getDynamicColumnsSize();
  groupDynamicRowsSize = getDynamicRowsSize();

  groupDynamicItems1 = GROUP_DYNAMIC_ITEMS1;
  groupDynamicItemsRowConfigMap1 = GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP1;
  groupDynamicItemsColumnConfigMap1 = GROUP_DYNAMIC_ITEMS_COLUMN_CONFIG_MAP1;
  groupDynamicColumnsSize1 = { ...GROUP_DYNAMIC_COLUMNS_SIZE_MAP1 };
  groupDynamicRowsSize1 = { ...GROUP_DYNAMIC_ROWS_SIZE_MAP1 };

  private _minId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[0].id : 0;
  get minId() { return this._minId; };

  private _maxId: Id = this.groupDynamicItems.length > 0 ? this.groupDynamicItems[this.groupDynamicItems.length - 1].id : 0;
  get maxId() { return this._maxId; };

  itemId: Id = this._minId;

  onButtonScrollToIdClickHandler = (e: Event) => {
    const grid = this._gridContainerRef();
    if (grid && this.itemId !== undefined) {
      grid.scrollTo(this.itemId, 'instant');
    }
  }

  onItemClick(item: IRenderVirtualGridItem<IColumnData> | undefined) {
    if (item) {
      console.info(`Click: (ID: ${item.data.id}) Item ${item.data.value}`);
    }
  }

  onRowsSizeChangedHandler(data: IRowsSize) {
    let rowsData = PersistentStore.get('rows');
    if (rowsData) {
      rowsData = { ...rowsData, ...data };
      PersistentStore.set('rows', rowsData);
      return;
    }

    PersistentStore.set('rows', data);
  }

  onColumnsSizeChangedHandler(data: IColumnsSize) {
    let coolumnsData = PersistentStore.get('columns');
    if (coolumnsData) {
      coolumnsData = { ...coolumnsData, ...data };
      PersistentStore.set('columns', coolumnsData);
      return;
    }

    PersistentStore.set('columns', data);
  }

  onViewportChangeHandler(size: ISize) {
    console.info(`Viewport changed: ${JSON.stringify(size)}`);
  }
}
