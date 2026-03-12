import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaEdit } from './area-edit';

describe('AreaEdit', () => {
  let component: AreaEdit;
  let fixture: ComponentFixture<AreaEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
