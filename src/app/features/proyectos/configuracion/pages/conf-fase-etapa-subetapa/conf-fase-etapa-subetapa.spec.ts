import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfFaseEtapaSubetapa } from './conf-fase-etapa-subetapa';

describe('ConfFaseEtapaSubetapa', () => {
  let component: ConfFaseEtapaSubetapa;
  let fixture: ComponentFixture<ConfFaseEtapaSubetapa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfFaseEtapaSubetapa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfFaseEtapaSubetapa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
