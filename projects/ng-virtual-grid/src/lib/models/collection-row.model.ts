import { Id } from "../types";
import { IVirtualGridColumnCollection } from "./collection-columns.model";

/**
 * Virtual grid element model
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/collection-row.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type VirtualGridRow<R = Object, C = Object> = R & {
    /**
     * Unique identifier of the element.
     */
    id: Id;
    /**
     * Columns collection
     */
    columns: IVirtualGridColumnCollection<C>;
};
