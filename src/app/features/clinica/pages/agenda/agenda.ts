import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { ProgramacionClinicaDto, ClinicaAccionDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CompletarEmo } from './components/completar-emo/completar-emo';

@Component({
  selector: 'app-clinica-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CompletarEmo],
  templateUrl: './agenda.html',
  styleUrls: ['./agenda.css'],
})
export class Agenda implements OnInit {
  items: ProgramacionClinicaDto[] = [];
  loading = false;
  accionando: number | null = null;
  motivoRechazo = '';
  rechazandoId: number | null = null;
  completandoItem: ProgramacionClinicaDto | null = null;

  constructor(
    private svc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getProgramacionesHoy().subscribe({
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

  get totalHoy(): number {
    return this.items.length;
  }

  get capacidadOcupada(): string {
    const completados = this.items.filter((i) =>
      ['Completado', 'En Atención'].includes(i.estado),
    ).length;
    return `${completados} / ${this.totalHoy}`;
  }

  get pendientes(): ProgramacionClinicaDto[] {
    return this.items.filter((i) => i.estado === 'Programado');
  }

  get aceptados(): ProgramacionClinicaDto[] {
    return this.items.filter((i) => ['Aceptado por Clínica', 'En Atención'].includes(i.estado));
  }

  get completados(): ProgramacionClinicaDto[] {
    return this.items.filter((i) =>
      ['Completado', 'No se presentó', 'Cancelado', 'Rechazado por Clínica'].includes(i.estado),
    );
  }

  aceptar(item: ProgramacionClinicaDto): void {
    Swal.fire({
      title: 'Confirmar programación',
      html: `<div style="text-align:left;margin-bottom:8px">Trabajador: <b>${item.workerNombre}</b></div>
             <label style="display:block;margin-bottom:4px;font-size:0.9rem">Hora de la cita *</label>
             <input type="time" id="swal-hora" class="swal2-input" style="width:100%">`,
      confirmButtonText: 'Aceptar programación',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      preConfirm: () => {
        const hora = (document.getElementById('swal-hora') as HTMLInputElement).value;
        if (!hora) {
          Swal.showValidationMessage('La hora es obligatoria');
          return false;
        }
        return hora;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarAccion(item.id, { id: item.id, accion: 'Aceptar', checkInHora: result.value });
      }
    });
  }

  iniciarRechazo(id: number): void {
    this.rechazandoId = id;
    this.motivoRechazo = '';
  }

  confirmarRechazo(item: ProgramacionClinicaDto): void {
    if (!this.motivoRechazo.trim()) return;
    this.ejecutarAccion(item.id, {
      id: item.id,
      accion: 'Rechazar',
      motivoRechazo: this.motivoRechazo,
    });
    this.rechazandoId = null;
  }

  checkIn(item: ProgramacionClinicaDto): void {
    const hora = new Date().toTimeString().slice(0, 5);
    this.ejecutarAccion(item.id, { id: item.id, accion: 'CheckIn', checkInHora: hora });
  }

  abrirCompletar(item: ProgramacionClinicaDto): void {
    this.completandoItem = item;
  }

  onCompletado(): void {
    this.completandoItem = null;
    this.load();
  }

  private ejecutarAccion(id: number, body: ClinicaAccionDto): void {
    this.accionando = id;
    this.svc.accionClinica(id, body).subscribe({
      next: () => {
        this.accionando = null;
        this.load();
      },
      error: (err) => {
        this.accionando = null;
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

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  initials(nombre: string): string {
    const parts = nombre.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  avatarBg(nombre: string): string {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
    let hash = 0;
    for (const c of nombre) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[hash % colors.length];
  }

  timelineDot(estado: string): string {
    return estado === 'En Atención' ? 'dot-orange' : 'dot-green-sm';
  }
}
