import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseVirtualListItemComponent, Component$1, NgVirtualListItemComponent } from 'ng-virtual-list';
import { POSITION_ABSOLUTE, POSITION_STICKY, PX, SIZE_100_PERSENT, SIZE_AUTO, TRANSLATE_3D, ZEROS_TRANSLATE_3D } from '../../const';

/**
 * Virtual list grid item component
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/components/ng-virtual-grid-item/ng-virtual-grid-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid-item',
  imports: [CommonModule],
  templateUrl: './ng-virtual-grid-item.component.html',
  styleUrl: './ng-virtual-grid-item.component.scss',
  host: {
    'class': 'ngvg__item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualGridItemComponent extends NgVirtualListItemComponent implements BaseVirtualListItemComponent {
  constructor() {
    super();
  }

  protected override  update() {
    const data = this._data, regular = this.regular, length = this._regularLength;
    if (data) {
      const styles = this._elementRef.nativeElement.style;
      styles.zIndex = data.config.zIndex;
      if (data.config.snapped) {
        styles.transform = data.config.sticky === 1 ? ZEROS_TRANSLATE_3D : `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.x}${PX}, ${data.config.isVertical ? data.measures.y : 0}${PX} , 0)`;;
        if (!data.config.isSnappingMethodAdvanced) {
          styles.position = POSITION_STICKY;
        }
      } else {
        styles.position = POSITION_ABSOLUTE;
        if (regular) {
          styles.transform = `${TRANSLATE_3D}(${data.config.isVertical ? 0 : data.measures.delta}${PX}, ${data.config.isVertical ? data.measures.delta : 0}${PX} , 0)`;
        } else {
          styles.transform = `${TRANSLATE_3D}(${data.measures.x}${PX}, ${data.measures.y}${PX} , 0)`;
        }
      }
      styles.height = data.config.isVertical ? data.config.dynamic ? SIZE_AUTO : `${data.measures.height}${PX}` : regular ? length : SIZE_AUTO;
      styles.width = data.config.isVertical ? regular ? length : SIZE_AUTO : data.config.dynamic ? SIZE_AUTO : `${data.measures.width}${PX}`;

      const listItem = this._listItemRef();
      if (listItem) {
        const liElement = listItem.nativeElement;
        liElement.style.height = `${data.measures.height}${PX}`;
      }
    }
  }
}

export const TNgVirtualGridItemComponent = NgVirtualGridItemComponent satisfies Component$1<BaseVirtualListItemComponent>;
