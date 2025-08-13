import { CellResizeModes } from "./cell-resize-modes";

/**
 * Cell resize method.
 * - "self" All edges are responsible for changing the size of the target cell.
 * - "adjacent" The left and top edges are responsible for changing the size of neighboring cells, 
 * the right and bottom edges are responsible for changing the size of the target cell.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/enums/cell-resize-mode.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type CellResizeMode = CellResizeModes | 'self' | 'adjacent';