import { IRenderVirtualGridItem } from "./render-item.model";

/**
 * Virtual list screen elements collection interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/render-collection.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IRenderVirtualGridCollection extends Array<IRenderVirtualGridItem> { };