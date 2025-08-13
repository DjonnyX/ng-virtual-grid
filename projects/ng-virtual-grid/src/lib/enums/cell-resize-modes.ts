/**
 * Cell resize modes.
 * - "SELF" All edges are responsible for changing the size of the target cell.
 * - "ADJACENT" The left and top edges are responsible for changing the size of neighboring cells, 
 * the right and bottom edges are responsible for changing the size of the target cell.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/enums/cell-resize-modes.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export enum CellResizeModes {
    /**
     * All edges are responsible for changing the size of the target cell.
     */
    SELF = 'self',
    /**
     * The left and top edges are responsible for changing the size of neighboring cells, 
     * the right and bottom edges are responsible for changing the size of the target cell.
     */
    ADJACENT = 'adjacent',
}