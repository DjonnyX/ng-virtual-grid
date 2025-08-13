import { IRect } from "../types";
import { Id } from "../types/id";
import { IVirtualGridItem } from "./item.model";
import { IRenderVirtualGridItemConfig } from "./render-item-config.model";

/**
 * Grid screen element model
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/render-item.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualGridItem {
    /**
     * Element index.
     */
    index: number;
    /**
     * Unique identifier of the element.
     */
    id: Id;
    /**
     * Unique identifier of the row
     */
    rowId?: Id;
    /**
     * Unique identifier of the column
     */
    columnId?: Id;
    /**
     * Element metrics.
     */
    measures: IRect & {
        /**
         * Delta is calculated for Snapping Method.ADVANCED
         */
        delta: number;
    };
    /**
     * Element data.
     */
    data: IVirtualGridItem;
    /**
     * Object with configuration parameters for IRenderVirtualGridItem.
     */
    config: IRenderVirtualGridItemConfig;
};
