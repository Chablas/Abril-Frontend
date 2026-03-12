import { Component, ChangeDetectorRef, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { AreaService } from '../../../../../core/services/area.service';
import { IncidentCreateDto } from '../../../../../core/dtos/reportResponseControl/incidentCreateDto.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CameraWeb } from './camera-web/camera-web';
import { CameraMobile } from './camera-mobile/camera-mobile';
import { CameraPhoto } from "./camera-web/camera-web";
import { ImagePreview } from "./image-preview/image-preview";
import { ImageSelector, SelectedImage } from "./image-selector/image-selector";
import Swal from 'sweetalert2';

@Component({
  selector: 'app-report-response-control-create',
  imports: [FormsModule, CommonModule, CameraWeb, CameraMobile, ImagePreview, ImageSelector],
  templateUrl: './report-response-control-create.html',
  styleUrl: './report-response-control-create.css',
})
export class ReportResponseControlCreate {
  showCamera = false;
  previews: string[] = [];
  maxImages = 3;

  incidentDto: IncidentCreateDto = {
    incidentDescription: '',
    images: [] as File[],
  };

  @Input() showCreateModal: boolean = false;
  @Output() closeCreateModal = new EventEmitter<void>();

  constructor(
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.previews = [];
      this.incidentDto.images = [];
      this.closeCreateModal.emit();
      return;
    }
    if (event.target === event.currentTarget) {
      this.previews = [];
      this.incidentDto.images = [];
      this.closeCreateModal.emit();
      return;
    }
  }

  saveArea() {
    console.log(this.incidentDto);
    /*if (!this.createDto.areaDescription.trim()) {
      return;
    }
    this.loaderService.show();
    this.areaService.createArea(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeCreateModal.emit();
        this.createDto = { areaDescription: '', active: true };
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.loadAreas.emit();
        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });*/
  }

  openCamera() {
    this.showCamera = true;
  }

  onPhotoTaken(photo: CameraPhoto) {
    if (!this.canAddImage()) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `Solo puedes subir ${this.maxImages} imágenes`,
      });
      return;
    }

    this.previews.push(photo.preview);
    this.incidentDto.images.push(photo.file);

    this.showCamera = false;
  }

  removeImage(index: number) {
    URL.revokeObjectURL(this.previews[index]);
    this.previews.splice(index, 1);
    this.incidentDto.images.splice(index, 1);
  }

  onImageSelected(image: SelectedImage) {
    if (!this.canAddImage()) {
      URL.revokeObjectURL(image.preview);

      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `Solo puedes subir ${this.maxImages} imágenes`,
      });

      return;
    }

    this.previews.push(image.preview);
    this.incidentDto.images.push(image.file);
  }

  canAddImage(): boolean {
    return this.previews.length < this.maxImages;
  }
}
