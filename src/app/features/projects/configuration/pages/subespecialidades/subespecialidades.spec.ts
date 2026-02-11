import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subespecialidades } from './subespecialidades';

describe('Subespecialidades', () => {
  let component: Subespecialidades;
  let fixture: ComponentFixture<Subespecialidades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subespecialidades]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Subespecialidades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
