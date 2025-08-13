# NgVirtualGrid

Maximum performance for extremely large grids.<br/>

<img width="1033" height="171" alt="logo" src="https://github.com/user-attachments/assets/b559cfde-405a-4361-b71b-6715478d997d" />

Angular version 19.X.X.

[Live Examples](https://ng-virtual-grid.eugene-grebennikov.pro/)

## Installation

```bash
npm i ng-virtual-grid
```

## Examples

### Virtual grid with regular cells

![Preview](https://github.com/user-attachments/assets/d3d080c8-93f8-4954-8f08-5a75c3defe8c)

Template:
```html
<ng-virtual-grid class="grid regular" [items]="groupItems" [itemRenderer]="itemRenderer" [columnSize]="90"
    [rowSize]="38" [bufferSize]="0"></ng-virtual-grid>

<ng-template #itemRenderer let-data="data" let-measures="measures">
    @if (data) {
        <div class="grid__item-container" [part]="data.isBorderStart ? 'border-start' : data.isBorderEnd ? 'border-end' : 'simple'"
        [class.border]="data.isBorder">
        <span>{{data.value}}</span>
        </div>
    }
</ng-template>
```

Component:
```ts
import { Component } from '@angular/core';
import { NgVirtualGridComponent, IVirtualGridCollection, IVirtualGridColumnCollection } from 'ng-virtual-grid';

const ROWS = 1000, COLUMNS = 100;

interface IRowData { }

interface IColumnData {
  value: string;
  isBorderStart?: boolean;
  isBorderEnd?: boolean;
}

let num = 1;
const generateNumber = () => {
  const n = num;
  num++;
  return String(n);
}

const GROUP_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [];

let index1 = 0;
for (let i = 0, l = ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index1;
  index1++;
  const type = i === 0 || Math.random() > .895 ? 'group-header' : 'item';
  for (let j = 0, l1 = COLUMNS; j < l1; j++) {
    index1++;
    const id = index1;
    columns.push({ id: id, value: generateNumber() });
  }
  GROUP_ITEMS.push({ id: rowId, columns });
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgVirtualGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  groupItems = GROUP_ITEMS;
  groupItemsStickyMap = GROUP_ITEMS_STICKY_MAP;
}
```

### Virtual grid with dynamic row size and cell resizing

![Preview](https://github.com/user-attachments/assets/99c81b7e-6b62-4e4c-b57e-40996d3aa487)

Template:
```html
<ng-virtual-grid class="grid" [resizeRowsEnabled]="true" [resizeColumnsEnabled]="true" [items]="groupDynamicItems"
        [columnsSize]="groupDynamicColumnsSize" [rowsSize]="groupDynamicRowsSize" [itemRenderer]="itemRenderer"
        cellResizeMode="adjacent" [minColumnSize]="32" [minRowSize]="32" [columnSize]="300" [rowSize]="32"
        [bufferSize]="0" [snap]="true" [cellConfigRowsMap]="groupDynamicItemsRowConfigMap"
        (onRowsSizeChanged)="onRowsSizeChangedHandler($event)"
        (onColumnsSizeChanged)="onColumnsSizeChangedHandler($event)"></ng-virtual-grid>

<ng-template #itemRenderer let-data="data" let-measures="measures">
    @if (data) {
        <div class="grid__item-container" [part]="data.isBorderStart ? 'border-start' : data.isBorderEnd ? 'border-end' : 'simple'"
        [class.border]="data.isBorder">
        <span>{{data.value}}</span>
        </div>
    }
</ng-template>
```

Component:
```ts
import { Component } from '@angular/core';
import { NgVirtualGridComponent, IColumnsSize, IRowsSize, IVirtualGridCollection, IVirtualGridColumnCollection, IVirtualGridRowConfigMap, Id } from 'ng-virtual-grid';
import { PersistentStore } from './utils';

const DYNAMIC_ROWS = 2000, DYNAMIC_COLUMNS = 50;

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

const GROUP_DYNAMIC_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP: IVirtualGridRowConfigMap = {},
  GROUP_DYNAMIC_COLUMNS_SIZE_MAP: IColumnsSize = {},
  GROUP_DYNAMIC_ROWS_SIZE_MAP: IRowsSize = {};

const GROUP_ITEMS: IVirtualGridCollection<IRowData, IColumnData> = [],
  GROUP_ITEMS_STICKY_MAP: IVirtualGridRowConfigMap = {};

let index = 0;
for (let i = 0, l = DYNAMIC_ROWS; i < l; i++) {
  const columns: IVirtualGridColumnCollection<IColumnData> = [];
  const rowId = index;
  index++;
  if (i === 0) {
    GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId] = {
        sticky: 1,
    };
  } else if (i === l - 20) {
    GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId] = {
        sticky: 1,
    };
  } else if (i === l - 1) {
    GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP[rowId] = {
        sticky: 2,
    };
  }
  for (let j = 0, l1 = DYNAMIC_COLUMNS; j < l1; j++) {
    index++;
    const id = index;
    if (j === 0 || j === l1 - 1) {
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
      value = generateText();
    }
    columns.push({ id: id, value, isBorderStart, isBorderEnd });
  }
  if (i === 0 || i === l - 1) {
    GROUP_DYNAMIC_ROWS_SIZE_MAP[rowId] = 40;
  }
  GROUP_DYNAMIC_ITEMS.push({ id: rowId, columns });
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
})
export class AppComponent {
  readonly logo = LOGO;

  groupDynamicItems = GROUP_DYNAMIC_ITEMS;
  groupDynamicItemsRowConfigMap = GROUP_DYNAMIC_ITEMS_ROW_CONFIG_MAP;
  groupDynamicColumnsSize = getDynamicColumnsSize();
  groupDynamicRowsSize = getDynamicRowsSize();

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
}
```

## Stylization

Grid items are encapsulated in shadowDOM, so to override default styles you need to use ::part access

- Customize a scroll area of grid
```css
.grid::part(scroller) {
    scroll-behavior: auto;

    /* custom scrollbar */
    &::-webkit-scrollbar {
        width: 16px;
        height: 16px;
    }

    &::-webkit-scrollbar-track {
        background-color: #ffffff;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #d6dee1;
        border-radius: 20px;
        border: 6px solid transparent;
        background-clip: content-box;
        min-width: 60px;
        min-height: 60px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: #a8bbbf;
    }
}

.grid {
    border-radius: 3px;
    box-shadow: 1px 2px 8px 4px rgba(0, 0, 0, 0.075);
    border: 1px solid rgba(0, 0, 0, 0.1);
}
```

- Set up the grid item canvas
```css
.grid::part(grid) {
    background-color: #ffffff;
}
```

- Set up the grid item
```css
.grid::part(grid-item) {
    background-color: unset; // override default styles
}
```

- Set up the grid row odd item
```css
.grid::part(item-row-odd) {
    background-color: rgb(48, 48, 48);
}
```

- Set up the grid row even item
```css
.grid::part(item-row-even) {
    background-color: #363636;
}

- Set up the grid row border item
```css
.grid::part(item-row-border) {
    background-color: #272727;
}
```

## API

[NgVirtualGridComponent](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/ng-virtual-grid.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualGridCollection](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/collection.model.ts) | Collection of grid items. The collection of elements must be immutable. |
| cellResizeMode | [CellResizeMode](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/enums/cell-resize-mode.ts) = "self" | Cell resize mode. Default value is "self". |
| columnSize | number? = 24 | Typical column size. Default value is 24. |
| rowSize | number? = 24 | Typical row size. Default value is 24. |
| minColumnSize | number? = 12 | Minimum column size. Default value is 12. |
| minRowSize | number? = 12 | Minimum row size. Default value is 12. |
| bufferSize | number? = 2 | Number of elements outside the scope of visibility. Default value is 2. |
| maxBufferSize | number? = 2 | Maximum number of elements outside the scope of visibility. Default value is 2. If maxBufferSize is set to be greater than bufferSize, then adaptive buffer mode is enabled. The greater the scroll size, the more elements are allocated for rendering. |
| itemRenderer | TemplateRef | Rendering element template. |
| stickyRowsMap | [IVirtualGridRowConfigMap?](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/sticky-map.model.ts) | Dictionary zIndex by id of the grid row element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element. 1 - position start, 2 - position end. |
| snap | boolean? = false | Determines whether elements will snap. Default value is "false". |
| enabledBufferOptimization | boolean? = true | Experimental! Enables buffer optimization. Can only be used if items in the collection are not added or updated. |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onScroll | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/scroll-event.model.ts)) => void | Fires when the grid has been scrolled. |
| onScrollEnd | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/scroll-event.model.ts)) => void | Fires when the grid has completed scrolling. |
| onRowsSizeChanged | [IRowsSize](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/rows-size.model.ts) | Fires when the row size is changed. |
| onColumnsSizeChanged | [IColumnsSize](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/columns-size.model.ts) | Fires when the column size is changed. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/types/id.ts), behavior: ScrollBehavior = 'auto') => number | The method scrolls the list to the element with the given id and returns the value of the scrolled area. Behavior accepts the values ​​"auto", "instant" and "smooth". |
| scrollToEnd | (behavior?: ScrollBehavior) => void | Scrolls the scroll area to the desired element with the specified ID. |
| getItemBounds | (id: [Id](https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/types/id.ts), behavior?: ScrollBehavior) => void | Returns the bounds of an element with a given id |

<br/>

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Licence

MIT License

Copyright (c) 2025 djonnyx (Evgenii Grebennikov)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
