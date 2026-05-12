import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaMotivoSalidaService } from '../services/motivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GaMotivoSalidaConfigItemDto } from '../dtos/ga-motivo.dto';
import { GaMotivoCreate } from '../components/create/create';
import { GaMotivoEdit } from '../components/edit/edit';
import { BtnNew } from '../../../../../../shared/components/btn-new/btn-new';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';

@Component({
  standalone: true,
  selector: 'app-ga-motivos',
  imports: [CommonModule, GaMotivoCreate, GaMotivoEdit, BtnNew, StatusBadge],
  templateUrl: './motivos.html',
})
export class GaMotivos implements OnInit {
  motivos: GaMotivoSalidaConfigItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  motivoToEdit: GaMotivoSalidaConfigItemDto | null = null;

  constructor(
    private service: GaMotivoSalidaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.motivos = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(motivo: GaMotivoSalidaConfigItemDto): void {
    this.loaderService.show();
    this.service.toggle(motivo.id).subscribe({
      next: (res) => {
        motivo.activo = res.activo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(motivo: GaMotivoSalidaConfigItemDto): void {
    this.motivoToEdit = motivo;
    this.showEditModal = true;
  }
}
