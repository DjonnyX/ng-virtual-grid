import { Id } from "../types/id";

/**
 * Virtual grid element model
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/item.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export type IVirtualGridItem<E = Object> = E & {
    /**
     * Unique identifier of the element.
     */
    id: Id;
    [x: string]: any;
};
