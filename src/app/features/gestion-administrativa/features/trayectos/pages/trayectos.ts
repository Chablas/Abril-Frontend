import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaTrayectoService } from '../services/trayectos.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GaTrayectoListItemDto } from '../dtos/ga-trayecto.dto';
import { GaTrayectoCreate } from '../components/create/create';
import { GaTrayectoEdit } from '../components/edit/edit';
import { BtnNew } from '../../../../../shared/components/btn-new/btn-new';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';

@Component({
  standalone: true,
  selector: 'app-ga-trayectos',
  imports: [CommonModule, GaTrayectoCreate, GaTrayectoEdit, BtnNew, StatusBadge],
  templateUrl: './trayectos.html',
})
export class GaTrayectos implements OnInit {
  trayectos: GaTrayectoListItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  trayectoToEdit: GaTrayectoListItemDto | null = null;

  constructor(
    private service: GaTrayectoService,
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
        this.trayectos = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(t: GaTrayectoListItemDto): void {
    this.loaderService.show();
    this.service.toggle(t.id).subscribe({
      next: (res) => {
        t.activo = res.activo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(t: GaTrayectoListItemDto): void {
    this.trayectoToEdit = t;
    this.showEditModal = true;
  }
}
