import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaLugarCreate } from '../components/create/create';
import { GaLugarEdit } from '../components/edit/edit';
import { BtnNew } from '../../../../../../shared/components/btn-new/btn-new';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { GaLugarService } from '../services/lugares.service';
import { GaLugarConfigItemDto } from '../dtos/ga-lugar.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  standalone: true,
  selector: 'app-ga-lugares',
  imports: [CommonModule, GaLugarCreate, GaLugarEdit, BtnNew, StatusBadge],
  templateUrl: './lugares.html',
})
export class GaLugares implements OnInit {
  lugares: GaLugarConfigItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  lugarToEdit: GaLugarConfigItemDto | null = null;

  constructor(
    private service: GaLugarService,
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
        this.lugares = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(lugar: GaLugarConfigItemDto): void {
    this.loaderService.show();

    if (lugar.tipo === 'proyecto') {
      this.service.toggleProyecto(lugar.projectId!).subscribe({
        next: (res) => {
          this.loaderService.hide();
          lugar.activo = res.activo;
          lugar.gaLugarId = res.gaLugarId;
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    } else {
      this.service.toggle(lugar.gaLugarId!).subscribe({
        next: (res) => {
          this.loaderService.hide();
          lugar.activo = res.activo;
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    }
  }

  openEdit(lugar: GaLugarConfigItemDto): void {
    this.lugarToEdit = lugar;
    this.showEditModal = true;
  }

  get fijos(): GaLugarConfigItemDto[] {
    return this.lugares.filter((l) => l.tipo === 'fijo');
  }

  get proyectos(): GaLugarConfigItemDto[] {
    return this.lugares.filter((l) => l.tipo === 'proyecto');
  }
}
