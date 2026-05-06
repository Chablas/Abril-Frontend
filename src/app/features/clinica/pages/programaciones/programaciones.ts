import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { ProgramacionClinicaDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-clinica-programaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programaciones.html',
  styleUrls: ['./programaciones.css'],
})
export class ProgramacionesClinica implements OnInit {
  items: ProgramacionClinicaDto[] = [];
  loading = false;
  filtroEstado = '';
  filtroDesde = '';
  filtroHasta = '';

  readonly estados: string[] = [
    'Programado',
    'Aceptado por Clínica',
    'Rechazado por Clínica',
    'En Atención',
    'Completado',
    'No se presentó',
    'Cancelado',
  ];

  constructor(
    private svc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    this.filtroDesde = hace30.toISOString().split('T')[0];
    this.filtroHasta = hoy.toISOString().split('T')[0];
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc
      .getProgramacionesFiltradas({
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
        estado: this.filtroEstado || undefined,
      })
      .subscribe({
        next: (data) => {
          this.items = data;
          this.loading = false;
          this.loaderService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'chip-blue',
      'Aceptado por Clínica': 'chip-green',
      'Rechazado por Clínica': 'chip-red',
      'En Atención': 'chip-orange',
      'Completado': 'chip-green',
      'No se presentó': 'chip-gray',
      'Cancelado': 'chip-gray',
    };
    return map[estado] ?? 'chip-gray';
  }
}
