import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaTrayectoService } from '../services/trayectos.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GaTrayectoListItemDto } from '../dtos/ga-trayecto.dto';
import { GaTrayectoCreate } from '../components/create/create';
import { GaTrayectoEdit } from '../components/edit/edit';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  standalone: true,
  selector: 'app-ga-trayectos',
  imports: [CommonModule, GaTrayectoCreate, GaTrayectoEdit, StatusBadge, AbrilPageHeaderComponent],
  templateUrl: './trayectos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaTrayectos implements OnInit {
  anioActual = new Date().getFullYear();
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
