import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Etapas } from './etapas';

describe('Etapas', () => {
  let component: Etapas;
  let fixture: ComponentFixture<Etapas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Etapas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Etapas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
