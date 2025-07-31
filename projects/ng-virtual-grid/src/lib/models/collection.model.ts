import { VirtualGridRow } from "./collection-row.model";

/**
 * Virtual grid collection interface
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/collection.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualGridCollection<R = Object, C = Object> extends Array<VirtualGridRow<R, C>> { };