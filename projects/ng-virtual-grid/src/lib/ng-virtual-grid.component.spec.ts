import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgVirtualGridComponent } from './ng-virtual-grid.component';

describe('NgVirtualGridComponent', () => {
  let component: NgVirtualGridComponent;
  let fixture: ComponentFixture<NgVirtualGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualGridComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(NgVirtualGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
