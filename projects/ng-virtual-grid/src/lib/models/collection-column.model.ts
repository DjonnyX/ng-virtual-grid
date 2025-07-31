import { Id } from "ng-virtual-list";

/**
 * Virtual grid column model
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/collection-column.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type VirtualGridColumn<C = Object> = C & {
    /**
     * Unique identifier of the element.
     */
    id: Id;
};
