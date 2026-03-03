import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IvtControlService } from "../../../../core/services/ivtControl.service";
import { forkJoin, scheduled } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { TableComponentData } from "../../../../core/models/ivtControl/tableComponentData.model";
import { ProjectService } from '../../../../core/services/project.service';
import { CreateModalData } from "../../../../core/models/ivtControl/createModalData.model";
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-ivt-control',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './ivt-control.html',
  styleUrl: './ivt-control.css',
})
export class IvtControl {
  /*ivtControls: IvtControlPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };*/

  tableComponentData: TableComponentData = {
    tableData: [],
    iframeUrl: null,
  };

  createModalData: CreateModalData = {
    projectOptions: [],
    createDto: {
      scheduleId: 0,
      pdf: null,
    },
    selectedFileName: null,
    selectedFileSize: null,
    showImageAdder: true,
  };

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  constructor(
    private ivtControlService: IvtControlService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private projectService: ProjectService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(page: number = 1) {
    this.loader = true;
    forkJoin({
      ivts: this.ivtControlService.getIvtControlPaged(page),
    }).subscribe({
      next: ({ ivts }) => {
        this.tableComponentData.tableData = ivts.data;
        this.currentPage = ivts.page;
        this.totalPages = ivts.totalPages;
        this.pageSize = ivts.pageSize;
        this.totalRecords = ivts.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCreateFilters() {
    this.loader = true;
    this.projectService.getWithResidentByUserId().subscribe({
      next: (data) => {
        this.createModalData.projectOptions = data;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.loadCreateFilters();
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.createModalData.showImageAdder = true;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.createModalData.showImageAdder = true;
    }
  }

  loadIvtControls(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.ivtControlService.getIvtControlPaged(page).subscribe({
      next: (response) => {
        this.tableComponentData.tableData = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer?.files) return;
    const file = e.dataTransfer.files[0];
    if (file.type !== 'application/pdf') {
      return;
    }
    this.assignFile(file);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.assignFile(file);
    }
  }

  removeFile() {
    this.createModalData.createDto.pdf = null;
    this.createModalData.selectedFileName = null;
    this.createModalData.selectedFileSize = null;
    this.createModalData.showImageAdder = true;
    this.cdr.detectChanges();
  }

  private assignFile(file: File) {
    if (file.type !== 'application/pdf') return;

    this.createModalData.createDto.pdf = file;

    this.createModalData.selectedFileName = file.name;
    this.createModalData.selectedFileSize = this.formatFileSize(file.size);
    this.createModalData.showImageAdder = false;
    this.cdr.detectChanges();
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  showPdf(event: MouseEvent, fileUrl: string) {
    event.stopPropagation();
    this.tableComponentData.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    this.cdr.detectChanges();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadIvtControls(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadIvtControls(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadIvtControls(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  saveIvtControl() {
    this.loader = true;
    const formData = new FormData();
    formData.append('scheduleId', this.createModalData.createDto.scheduleId.toString());
    if (this.createModalData.createDto.pdf) {
      formData.append('pdf', this.createModalData.createDto.pdf);
    }
    this.ivtControlService.createIvtControl(formData).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createModalData.createDto = { scheduleId: 0, pdf: null };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadIvtControls();

        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
