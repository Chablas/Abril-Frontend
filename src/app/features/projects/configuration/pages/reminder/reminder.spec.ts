import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reminder } from './reminder';

describe('Reminder', () => {
  let component: Reminder;
  let fixture: ComponentFixture<Reminder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reminder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reminder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
