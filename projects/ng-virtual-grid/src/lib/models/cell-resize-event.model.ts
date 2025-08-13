import { Id } from "../types";

/**
 * Cell resize event
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/cell-resize-event.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface ICellResizeEvent {
    /**
     * Row id
     */
    rowId: Id;
    /**
     * Column id
     */
    columnId: Id;
    /**
     * Width
     */
    width: number;
    /**
     * Height
     */
    height: number;
}