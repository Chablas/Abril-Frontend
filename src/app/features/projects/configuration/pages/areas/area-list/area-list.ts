import { Component, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { AreaService } from '../../../../../../core/services/area.service';
import { AreaPagedDTO } from '../../../../../../core/dtos/area/areaPaged.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { HttpErrorResponse } from '@angular/common/http';
import { AreaGetDTO } from '../../../../../../core/dtos/area/area.model';
import { AreaEdit } from "./area-edit/area-edit";
import { LoaderService } from '../../../../../../core/services/loader.service';
import { AreaEditDTO } from '../../../../../../core/dtos/area/areaEdit.model';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-area-list',
  imports: [CommonModule, FormsModule, AreaEdit],
  templateUrl: './area-list.html',
  styleUrl: './area-list.css',
})
export class AreaList implements OnInit {
  areas: AreaPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  editDto: AreaEditDTO = {
    areaId: 0,
    areaDescription: '',
    active: true,
  };

  showEditModal = false;

  @Output() pagedData = new EventEmitter<AreaPagedDTO>();

  constructor(
    private areaService: AreaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.loadAreas(1);
    });
  }

  loadAreas(page: number = 1) {
    this.loaderService.show();

    this.areaService.getAreaPaged(page).subscribe({
      next: (response) => {
        this.areas = response;
        this.pagedData.emit(response);

        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  openEditModal(area: AreaGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.areaId = area.areaId;
    this.editDto.areaDescription = area.areaDescription;
    this.editDto.active = area.active;
  }

  deleteArea(areaId: number, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loaderService.show();
        this.areaService.deleteArea(areaId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadAreas();
            this.loaderService.hide();
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.errorService.handleError(err);
          },
        });
      }
    });
  }
}
