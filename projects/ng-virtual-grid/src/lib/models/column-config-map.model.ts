/**
 * Sets sticky position and resizable for the grid column element. If sticky position is greater than 0, then sticky position is applied.
 * If the value is greater than 0, then the sticky position mode is enabled for the element. 1 - position start, 2 - position end.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/models/column-config-map.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export interface IVirtualGridColumnConfigMap {
    [id: string]: {
        /**
         * Sets sticky position for the element. If sticky position is greater than 0, then sticky position is applied.
         * 1 - position start, 2 - position end.
         */
        sticky?: 0 | 1 | 2;
        /**
         * Determines whether the cell can be resized.
         * Takes precedence over resizeRowsEnabled and resizeColumnsEnabled properties.
         */
        resizable?: boolean;
    }
}