import { BaseVirtualListItemComponent, Tracker } from "ng-virtual-list";

export class GridTracker<C extends BaseVirtualListItemComponent> extends Tracker<C> { }