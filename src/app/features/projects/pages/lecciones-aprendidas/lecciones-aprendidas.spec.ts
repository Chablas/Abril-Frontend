import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeccionesAprendidas } from './lecciones-aprendidas';

describe('LeccionesAprendidas', () => {
  let component: LeccionesAprendidas;
  let fixture: ComponentFixture<LeccionesAprendidas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeccionesAprendidas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeccionesAprendidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
