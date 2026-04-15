import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffProjectEmailService } from '../../services/staff-project-email.service';
import { StaffProjectEmailDto } from '../../dtos/staff-project-email.dto';
import { StaffProjectEmailEditDto } from '../../dtos/staff-project-email-edit.dto';
import { StaffProjectEmailFilterDto } from '../../dtos/staff-project-email-filter.dto';
import { StaffProjectEmailEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-staff-project-email-list',
  standalone: true,
  imports: [CommonModule, StaffProjectEmailEdit],
  templateUrl: './list.html',
})
export class StaffProjectEmailList implements OnInit {
  @Input() filters: StaffProjectEmailFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<StaffProjectEmailDto>>();

  items: StaffProjectEmailDto[] = [];
  showEditModal = false;
  editDto: StaffProjectEmailEditDto = { staffProjectEmailId: 0, email: '', active: true };

  constructor(
    private service: StaffProjectEmailService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.load(1));
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged({ ...this.filters, page }).subscribe({
      next: (res) => {
        this.items = res.data;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: StaffProjectEmailDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      staffProjectEmailId: item.staffProjectEmailId,
      email: item.email,
      active: item.active,
    };
    this.showEditModal = true;
  }

  delete(id: number, event: MouseEvent): void {
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
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(id).subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Eliminado correctamente', confirmButtonColor: '#64BC04' });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
