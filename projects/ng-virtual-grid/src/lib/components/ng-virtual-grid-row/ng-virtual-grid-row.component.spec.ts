import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgVirtualGridRowComponent } from './ng-virtual-grid-row.component';

describe('NgVirtualGridRowComponent', () => {
  let component: NgVirtualGridRowComponent;
  let fixture: ComponentFixture<NgVirtualGridRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgVirtualGridRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgVirtualGridRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
