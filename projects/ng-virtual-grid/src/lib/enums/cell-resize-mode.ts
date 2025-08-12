import { CellResizeModes } from "./cell-resize-modes";

/**
 * Cell resize method.
 * 'self'
 * 'adjacent'
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/enums/cell-resize-mode.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type CellResizeMode = CellResizeModes | 'self' | 'adjacent';