import { IScrollEvent, ScrollDirection } from "../models";

interface IScrollEventParams {
    directionX: ScrollDirection;
    directionY: ScrollDirection;
    container: HTMLElement;
    grid: HTMLElement;
    deltaX: number;
    deltaY: number;
    scrollDeltaX: number;
    scrollDeltaY: number;
}

/**
 * Scroll event.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/utils/scrollEvent.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export class ScrollEvent implements IScrollEvent {
    private _directionX: ScrollDirection = 1;
    get directionX() { return this._directionX; }

    private _directionY: ScrollDirection = 1;
    get directionY() { return this._directionY; }

    private _scrollSizeX: number = 0;
    get scrollSizeX() { return this._scrollSizeX; }

    private _scrollSizeY: number = 0;
    get scrollSizeY() { return this._scrollSizeY; }

    private _scrollWeightX: number = 0;
    get scrollWeightX() { return this._scrollWeightX; }

    private _scrollWeightY: number = 0;
    get scrollWeightY() { return this._scrollWeightY; }

    private _gridWidth: number = 0;
    get gridWidth() { return this._gridWidth; }

    private _gridHeight: number = 0;
    get gridHeight() { return this._gridHeight; }

    private _width: number = 0;
    get width() { return this._width; }

    private _height: number = 0;
    get height() { return this._height; }

    private _isStartX: boolean = true;
    get isStartX() { return this._isStartX; }

    private _isStartY: boolean = true;
    get isStartY() { return this._isStartY; }

    private _isEndX: boolean = false;
    get isEndX() { return this._isEndX; }

    private _isEndY: boolean = false;
    get isEndY() { return this._isEndY; }

    private _deltaX: number = 0;
    get deltaX() { return this._deltaX; }

    private _deltaY: number = 0;
    get deltaY() { return this._deltaY; }

    private _scrollDeltaX: number = 0;
    get scrollDeltaX() { return this._scrollDeltaX; }

    private _scrollDeltaY: number = 0;
    get scrollDeltaY() { return this._scrollDeltaY; }

    constructor(params: IScrollEventParams) {
        const { directionX, directionY, container, grid, deltaX, deltaY, scrollDeltaX, scrollDeltaY } = params;
        this._directionX = directionX;
        this._directionY = directionY;
        this._scrollSizeX = container.scrollLeft;
        this._scrollSizeY = container.scrollTop;
        this._scrollWeightX = container.scrollWidth;
        this._scrollWeightY = container.scrollHeight;
        this._gridWidth = grid.offsetWidth;
        this._gridHeight = grid.offsetHeight;
        this._width = container.offsetWidth;
        this._height = container.offsetHeight;
        this._isEndX = (this._scrollSizeX + this._width) === this._scrollWeightX;
        this._isEndY = (this._scrollSizeY + this._height) === this._scrollWeightY;
        this._deltaX = deltaX;
        this._deltaY = deltaY;
        this._scrollDeltaX = scrollDeltaX;
        this._scrollDeltaY = scrollDeltaY;
        this._isStartX = this._scrollSizeX === 0;
        this._isStartY = this._scrollSizeY === 0;
    }
}