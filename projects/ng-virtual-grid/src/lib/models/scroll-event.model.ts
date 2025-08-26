import { ScrollDirection } from "./scroll-direction.model";

/**
 * Interface IScrollEvent.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/scroll-event.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IScrollEvent {
    /**
     * Scroll area offset
     */
    scrollSizeX: number;
    /**
     * Scroll area offset
     */
    scrollSizeY: number;
    /**
     * Full size of the scroll area
     */
    scrollWeightX: number;
    /**
     * Full size of the scroll area
     */
    scrollWeightY: number;
    /**
     * Viewport size
     */
    width: number;
    /**
     * Viewport size
     */
    height: number;
    /**
     * Size of the grid of elements
     */
    gridWidth: number;
    /**
     * Size of the grid of elements
     */
    gridHeight: number;
    /**
     * A value of -1 indicates the direction is up or left (if the grid direction is horizontal).
     * A value of 1 indicates the direction is down or right (if the grid direction is horizontal).
     */
    directionX: ScrollDirection;
    /**
     * A value of -1 indicates the direction is up or left (if the grid direction is horizontal).
     * A value of 1 indicates the direction is down or right (if the grid direction is horizontal).
     */
    directionY: ScrollDirection;
    /**
     * If true then indicates that the grid has been scrolled to the end.
     */
    isStartX: boolean;
    /**
     * If true then indicates that the grid has been scrolled to the end.
     */
    isStartY: boolean;
    /**
     * If true then indicates that the grid has been scrolled to the end.
     */
    isEndX: boolean;
    /**
     * If true then indicates that the grid has been scrolled to the end.
     */
    isEndY: boolean;
    /**
     * Delta of marked and unmarked area
     */
    deltaX: number;
    /**
     * Delta of marked and unmarked area
     */
    deltaY: number;
    /**
     * Scroll delta
     */
    scrollDeltaX: number;
    /**
     * Scroll delta
     */
    scrollDeltaY: number;
}
