import { Component, Input } from '@angular/core';
import { ResidentReportIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';

@Component({
  selector: 'app-report-view-images',
  imports: [CommonModule, DraggableImage],
  templateUrl: './report-view-images.html',
  styleUrl: './report-view-images.css',
})
export class ReportViewImages {
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
}
