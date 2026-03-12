import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportResponseControlList } from './report-response-control-list';

describe('ReportResponseControlList', () => {
  let component: ReportResponseControlList;
  let fixture: ComponentFixture<ReportResponseControlList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportResponseControlList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportResponseControlList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
