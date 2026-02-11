import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fases } from './fases';

describe('Fases', () => {
  let component: Fases;
  let fixture: ComponentFixture<Fases>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fases]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fases);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
