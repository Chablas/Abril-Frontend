import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonsDashboard } from './lessons-dashboard';

describe('LessonsDashboard', () => {
  let component: LessonsDashboard;
  let fixture: ComponentFixture<LessonsDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonsDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonsDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
