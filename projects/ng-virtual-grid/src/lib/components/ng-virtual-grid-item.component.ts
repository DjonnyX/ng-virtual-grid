import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseVirtualListItemComponent, NgVirtualListItemComponent } from 'ng-virtual-grid';

/**
 * Virtual list grid component
 * @link https://github.com/DjonnyX/ng-virtual-grid/blob/19.x/projects/ng-virtual-grid/src/lib/components/ng-virtual-grid-item.component.ts
 * @author Evgenii Grebennikov
 * @email djonnyx@gmail.com
 */
@Component({
  selector: 'ng-virtual-grid-item',
  imports: [CommonModule],
  templateUrl: './ng-virtual-grid-item.component.html',
  styleUrl: './ng-virtual-grid-item.component.scss',
  host: {
    'class': 'ngvl__item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgVirtualGridItemComponent extends NgVirtualListItemComponent implements BaseVirtualListItemComponent {
  constructor() {
    super();
  }
}

export const TNgVirtualGridItemComponent = NgVirtualGridItemComponent; 
