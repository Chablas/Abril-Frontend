import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterconsultaService } from '../../../ssoma/salud-ocupacional/services/interconsulta.service';
import {
  InterconsultaListDto,
  InterconsultaDetalleDto,
  InterconsultaUpdateDto,
} from '../../../ssoma/salud-ocupacional/dtos/interconsulta.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-interconsultas-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interconsultas.html',
  styleUrls: ['./interconsultas.css'],
})
export class InterconsultasClinica implements OnInit {
  items: InterconsultaListDto[] = [];
  loading = false;
  filtroEstado = 'Pendiente';
  filtroSearch = '';

  resolviendo: InterconsultaDetalleDto | null = null;
  form: InterconsultaUpdateDto = {};
  saving = false;

  readonly estados = ['', 'Pendiente', 'Atendida', 'Cancelada'];

  constructor(
    private svc: InterconsultaService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getInterconsultas({
      estado: this.filtroEstado || undefined,
      search: this.filtroSearch || undefined,
      pageSize: 100,
    }).subscribe({
      next: (res: any) => {
        this.items = res.items ?? res.data ?? res ?? [];
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: any) => { this.loading = false; this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  abrirResolver(item: InterconsultaListDto): void {
    this.loaderService.show();
    this.svc.getInterconsulta(item.id).subscribe({
      next: (detalle: InterconsultaDetalleDto) => {
        this.resolviendo = detalle;
        this.form = {
          fechaAtencion: detalle.fechaAtencion ?? '',
          diagnostico: detalle.diagnostico ?? '',
          cie10: detalle.cie10 ?? '',
          resultado: detalle.resultado ?? '',
          urlInforme: detalle.urlInforme ?? '',
          estado: detalle.estado,
          notas: detalle.notas ?? '',
        };
        this.loaderService.hide();
      },
      error: (err: any) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  cerrarModal(): void { this.resolviendo = null; this.form = {}; }

  guardar(): void {
    if (!this.resolviendo) return;
    this.saving = true;
    this.svc.updateInterconsulta(this.resolviendo.id, this.form).subscribe({
      next: () => { this.saving = false; this.cerrarModal(); this.load(); },
      error: (err: any) => { this.saving = false; this.errorService.handleError(err); },
    });
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'chip-orange',
      'Atendida': 'chip-green',
      'Cancelada': 'chip-gray',
    };
    return map[estado] ?? 'chip-gray';
  }

  get pendientesCount(): number { return this.items.filter(i => i.estado === 'Pendiente').length; }
}
