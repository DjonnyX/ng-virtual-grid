import { Id } from "../types";

/**
 * Object with configuration parameters for IRenderVirtualListItem
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/20.x/projects/ng-virtual-list/src/lib/models/render-item-config.model.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 * 
 */
export interface IRenderVirtualListItemConfig {
    /**
     * Determines whether the content has custom dimensions.
     */
    customSize: boolean;
    /**
     * If greater than 0, the element will have a sticky position with the given zIndex.
     */
    sticky: number;
    /**
     * Specifies whether the element will snap.
     */
    snap: boolean;
    /**
     * Indicates that the element is snapped.
     */
    snapped: boolean;
    /**
     * Indicates that the element is being shifted by another snap element.
     */
    snappedOut: boolean;
    /**
     * Indicates that the element is a vertical list item.
     */
    isVertical: boolean;
    /**
     * Returns true if the snapping method is advanced
     */
    isSnappingMethodAdvanced: boolean;
    /**
     * z-index
     */
    zIndex: string;
}