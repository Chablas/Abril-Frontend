import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraMobile } from './camera-mobile';

describe('CameraMobile', () => {
  let component: CameraMobile;
  let fixture: ComponentFixture<CameraMobile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraMobile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CameraMobile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
