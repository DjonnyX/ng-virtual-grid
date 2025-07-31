import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgVirtualGridItemComponent } from './ng-virtual-grid-item.component';

describe('NgVirtualGridItemComponent', () => {
  let component: NgVirtualGridItemComponent;
  let fixture: ComponentFixture<NgVirtualGridItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualGridItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgVirtualGridItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
