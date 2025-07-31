import { VirtualGridColumn } from "./collection-column.model";

/**
 * Virtual grid columns collection interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/column-collection.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualGridColumnCollection<C = Object> extends Array<VirtualGridColumn<C>> { };