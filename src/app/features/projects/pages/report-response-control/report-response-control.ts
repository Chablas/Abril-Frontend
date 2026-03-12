import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportResponseControlCreate } from './report-response-control-create/report-response-control-create';
import { ReportResponseControlList } from './report-response-control-list/report-response-control-list';

@Component({
  selector: 'app-report-response-control',
  imports: [CommonModule, ReportResponseControlCreate, ReportResponseControlList],
  templateUrl: './report-response-control.html',
  styleUrl: './report-response-control.css',
})
export class ReportResponseControl {
  showCreateModal = false;

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }
}
