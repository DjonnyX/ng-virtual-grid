import { Id } from "../types";
import { RowSize } from "../types/row-size";

/**
 * Row size interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/rows-size.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRowsSize {
    [id: Id]: RowSize;
}