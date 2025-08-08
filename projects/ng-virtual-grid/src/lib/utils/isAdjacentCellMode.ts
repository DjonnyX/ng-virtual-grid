import { CellResizeMode, CellResizeModes } from "../enums";

const ADJACENT_ALIASES = [CellResizeModes.ADJACENT, 'adjacent'],
    SELF_ALIASES = [CellResizeModes.SELF, 'self'];

/**
 * Determines resize cell mode.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/utils/isAdjacentCellMode.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
export const isAdjacentCellMode = (src: CellResizeMode, expected: CellResizeMode): boolean => {
    if (ADJACENT_ALIASES.includes(expected)) {
        return ADJACENT_ALIASES.includes(src);
    }
    return ADJACENT_ALIASES.includes(src);
}