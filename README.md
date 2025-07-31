# NgVirtualGrid

Maximum performance for extremely large grids.<br/>
Animation of elements is supported.

<img width="1033" height="171" alt="logo" src="https://github.com/user-attachments/assets/b559cfde-405a-4361-b71b-6715478d997d" />

Angular version 19.X.X.

## Installation

```bash
npm i ng-virtual-grid
```

## Examples

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
.grid::part(item) {
    background-color: unset; // override default styles
}
```

## API

[NgVirtualGridComponent](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/ng-virtual-grid.component.ts)

Inputs

| Property | Type | Description |
|---|---|---|
| id | number | Readonly. Returns the unique identifier of the component. | 
| items | [IVirtualGridCollection](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/collection.model.ts) | Collection of list items.  The collection of elements must be immutable. |
| itemSize | number? = 24 | If direction = 'vertical', then the height of a typical element. If direction = 'horizontal', then the width of a typical element. Ignored if the dynamicSize property is true. |
| itemsOffset | number? = 2 | Number of elements outside the scope of visibility. Default value is 2. |
| itemRenderer | TemplateRef | Rendering element template. |
| stickyMap | [IVirtualGridStickyMap?](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/sticky-map.model.ts) | Dictionary zIndex by id of the list element. If the value is not set or equal to 0, then a simple element is displayed, if the value is greater than 0, then the sticky position mode is enabled for the element. 1 - position start, 2 - position end. |
| snap | boolean? = false | Determines whether elements will snap. Default value is "false". |
| dynamicSize | boolean? = false | If true then the items in the list can have different sizes and the itemSize property is ignored. If false then the items in the list have a fixed size specified by the itemSize property. The default value is false. |
| enabledBufferOptimization | boolean? = true | Experimental! Enables buffer optimization. Can only be used if items in the collection are not added or updated. |
| trackBy | string? = 'id' | The name of the property by which tracking is performed. |

<br/>

Outputs

| Event | Type | Description |
|---|---|---|
| onScroll | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has been scrolled. |
| onScrollEnd | ([IScrollEvent](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/models/scroll-event.model.ts)) => void | Fires when the list has completed scrolling. |

<br/>

Methods

| Method | Type | Description |
|--|--|--|
| scrollTo | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/types/id.ts), behavior: ScrollBehavior = 'auto') => number | The method scrolls the list to the element with the given id and returns the value of the scrolled area. Behavior accepts the values ​​"auto", "instant" and "smooth". |
| scrollToEnd | (behavior?: ScrollBehavior) => void | Scrolls the scroll area to the desired element with the specified ID. |
| getItemBounds | (id: [Id](https://github.com/DjonnyX/ng-virtual-list/blob/19.x/projects/ng-virtual-list/src/lib/types/id.ts), behavior?: ScrollBehavior) => void | Returns the bounds of an element with a given id |

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
