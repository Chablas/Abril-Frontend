import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { ReportViewActiveTab } from './report-view-active-tab/report-view-active-tab';
import { ReportViewDetail } from './report-view-detail/report-view-detail';
import { ReportViewImages } from './report-view-images/report-view-images';
import { ResidentReportIncidenceDTO } from '../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';

@Component({
  selector: 'app-report-view-modal',
  imports: [CommonModule, ReportViewActiveTab, ReportViewDetail, ReportViewImages, BaseModal],
  templateUrl: './report-view-modal.html',
  styleUrl: './report-view-modal.css',
})
export class ReportViewModal {
  activeTab: string = 'general';
  @Input() selectedIncidence: ResidentReportIncidenceDTO = {
    residentReportIncidenceId: 0,
    residentReportIncidenceDescription: '',
    projectId: 0,
    projectDescription: '',
    stateId: 0,
    stateDescription: '',
    images: [],
    residentReportResponseDescriptions: []
  };
  @Output() closeReportViewModal = new EventEmitter();

  onModalTabChange(tab: string) {
    this.activeTab = tab;
  }
}
