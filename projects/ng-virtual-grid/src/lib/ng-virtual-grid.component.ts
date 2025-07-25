import {
  ChangeDetectionStrategy, Component, input, InputSignal, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BaseVirtualListItemComponent, Component$1, Direction, Directions, NgVirtualListComponent, SnappingMethod, SnappingMethods,
} from 'ng-virtual-list';
import { TNgVirtualGridItemComponent } from './components/ng-virtual-grid-item.component';

/**
 * Virtual grid component.
 * Maximum performance for extremely large grids.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/ng-virtual-grid.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid',
  imports: [CommonModule],
  templateUrl: './ng-virtual-grid.component.html',
  styleUrl: './ng-virtual-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NgVirtualGridComponent extends NgVirtualListComponent {
  private _snappingMethodOptions = {
    transform: (v: SnappingMethod | undefined) => {
      if (v !== 'normal' || v !== SnappingMethods.NORMAL) {
        throw Error('NgVirtualGrid only supports the "normal" snappingMethod value');
      }
      return 'normal';
    }
  } as any;
  /** @internal */
  /**
   * Snapping method. Only supports the 'normal' value.
   */
  override snappingMethod = input<SnappingMethod>('normal', { ...this._snappingMethodOptions });

  private _directionOptions = {
    transform: (v: Direction | undefined) => {
      if (v !== 'vertical' || v !== Directions.VERTICAL) {
        throw Error('NgVirtualGrid only supports the "vertical" direction value');
      }
      return 'normal';
    }
  } as any;
  /** @internal */
  /**
   * Snapping method. Only supports the 'vertical' value.
   */
  override direction = input<Direction>('vertical', { ...this._directionOptions });

  protected override _itemComponentClass: Component$1<BaseVirtualListItemComponent> = TNgVirtualGridItemComponent;
  constructor() {
    super();
  }
}
