import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewActiveTab } from './report-view-active-tab';

describe('ReportViewActiveTab', () => {
  let component: ReportViewActiveTab;
  let fixture: ComponentFixture<ReportViewActiveTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportViewActiveTab]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportViewActiveTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
