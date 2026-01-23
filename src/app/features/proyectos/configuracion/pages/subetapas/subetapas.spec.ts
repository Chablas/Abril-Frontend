import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subetapas } from './subetapas';

describe('Subetapas', () => {
  let component: Subetapas;
  let fixture: ComponentFixture<Subetapas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subetapas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Subetapas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
