import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import { LessonService } from '../../../../../core/services/lesson.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { LessonDetailDTO, LessonImageDTO } from '../../../../../core/dtos/lesson/lessonDetail.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { environment } from '../../../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail-lesson',
  standalone: true,
  imports: [CommonModule, BaseModal, DraggableImage],
  templateUrl: './detail.html',
})
export class DetailLesson implements OnInit {
  @Input() lessonId!: number;
  @Input() currentUserId!: number;
  @Input() defaultTab: 'general' | 'images' = 'general';
  @Output() closeModal = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  lesson: LessonDetailDTO | null = null;
  activeTab: 'general' | 'images' = 'general';
  opportunityImages: LessonImageDTO[] = [];
  improvementImages: LessonImageDTO[] = [];
  apiUrl = environment.apiUrl;

  constructor(
    private lessonService: LessonService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.activeTab = this.defaultTab;
    this.loadLesson();
  }

  private loadLesson(): void {
    this.loaderService.show();
    this.lessonService.getById(this.lessonId).subscribe({
      next: (data) => {
        this.lesson = data;
        this.opportunityImages = data.images?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages = data.images?.filter(img => img.imageTypeDescription === 'MEJORA') || [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  deleteLesson(event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estas seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Si, eliminalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loaderService.show();
        this.lessonService.deleteLesson(this.lesson?.lessonId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loaderService.hide();
            Swal.fire({
              title: 'Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
            this.deleted.emit();
            this.closeModal.emit();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }
}
