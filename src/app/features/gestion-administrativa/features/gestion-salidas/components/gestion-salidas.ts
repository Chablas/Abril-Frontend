import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { GestionSalidasService } from '../services/gestion-salidas.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  GestionSalidaListItemDto,
  TrabajadorOptionDto,
  LugarProyectoOptionDto,
} from '../dtos/gestion-salida.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';

@Component({
  standalone: true,
  selector: 'app-gestion-salidas',
  imports: [CommonModule, StatusBadge, SearchSelect],
  templateUrl: './gestion-salidas.html',
})
export class GestionSalidas implements OnInit {
  salidas: GestionSalidaListItemDto[] = [];

  trabajadorOptions: any[] = [];
  lugarProyectoOptions: any[] = [];

  filters = {
    workerId:        null as number | null,
    lugarProyectoId: null as number | null,
  };

  constructor(
    private service:       GestionSalidasService,
    private loaderService: LoaderService,
    private errorService:  ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadFilterData();
    this.load();
  }

  loadFilterData(): void {
    this.service.getFilterData().subscribe({
      next: (data) => {
        this.trabajadorOptions = [
          { workerId: null, nombreCompleto: 'Todos los trabajadores' },
          ...data.trabajadores,
        ];
        this.lugarProyectoOptions = [
          { gaLugarId: null, nombreDisplay: 'Todos los proyectos' },
          ...data.lugaresProyecto,
        ];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll(this.filters.workerId, this.filters.lugarProyectoId).subscribe({
      next: (data) => {
        this.salidas = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearch(): void {
    this.load();
  }

  exportarExcel(): void {
    this.loaderService.show();
    this.service.downloadExcel(this.filters.workerId, this.filters.lugarProyectoId).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'Gestion_Salidas.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async aprobar(salida: GestionSalidaListItemDto): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Aprobar solicitud?',
      html: `Se aprobará la solicitud de <b>${salida.trabajador}</b>.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.aprobar(salida.id).subscribe({
      next: () => {
        salida.estado = 'Aprobado';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async rechazar(salida: GestionSalidaListItemDto): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Rechazar solicitud',
      html: `¿Rechazar la solicitud de <b>${salida.trabajador}</b>?`,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!result.isConfirmed) return;

    this.loaderService.show();
    this.service.rechazar(salida.id).subscribe({
      next: () => {
        salida.estado = 'Rechazado';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  estadoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }
}
