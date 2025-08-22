import { Id } from "../types";

/**
 * Column size interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/columns-size.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IColumnsSize {
    /**
     * Column width by columnId
     */
    [columnId: Id]: number | `${number}%` | `${number}fr` | undefined;
}