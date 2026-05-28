import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { ProgramacionClinicaDto, ClinicaAccionDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { CompletarEmo } from './components/completar-emo/completar-emo';

type FiltroEstado = '' | 'Programado' | 'Aceptado por Clínica' | 'En Atención' | 'Completado' | 'Rechazado';

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

  selectedDate = new Date().toISOString().split('T')[0];
  filtroEstado: FiltroEstado = '';
  busqueda = '';

  modalAceptar: { open: boolean; item: ProgramacionClinicaDto | null; nuevaFecha: string } = {
    open: false,
    item: null,
    nuevaFecha: '',
  };

  completandoItem: ProgramacionClinicaDto | null = null;

  readonly estadosFiltro: { key: FiltroEstado; label: string }[] = [
    { key: '', label: 'Todos' },
    { key: 'Programado', label: 'Programado' },
    { key: 'Aceptado por Clínica', label: 'Aceptado' },
    { key: 'En Atención', label: 'En Atención' },
    { key: 'Completado', label: 'Completado' },
    { key: 'Rechazado', label: 'Rechazado' },
  ];

  constructor(
    private svc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.loadAgenda(this.selectedDate);
  }

  loadAgenda(fecha: string): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getProgramacionesFiltradas({ desde: fecha, hasta: fecha }).subscribe({
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

  onDateChange(): void {
    this.loadAgenda(this.selectedDate);
  }

  // ── Counts ───────────────────────────────────────────────
  get totalHoy(): number { return this.items.length; }
  get countProgramados(): number { return this.items.filter(i => i.estado === 'Programado').length; }
  get countAceptados(): number { return this.items.filter(i => i.estado === 'Aceptado por Clínica').length; }
  get countEnAtencion(): number { return this.items.filter(i => i.estado === 'En Atención').length; }
  get countCompletados(): number { return this.items.filter(i => i.estado === 'Completado').length; }
  get countRechazados(): number {
    return this.items.filter(i =>
      ['Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(i.estado),
    ).length;
  }

  countForFiltro(key: FiltroEstado): number {
    switch (key) {
      case '': return this.totalHoy;
      case 'Programado': return this.countProgramados;
      case 'Aceptado por Clínica': return this.countAceptados;
      case 'En Atención': return this.countEnAtencion;
      case 'Completado': return this.countCompletados;
      case 'Rechazado': return this.countRechazados;
    }
  }

  // ── Filter ───────────────────────────────────────────────
  get programacionesFiltradas(): ProgramacionClinicaDto[] {
    let base = this.items;
    if (this.filtroEstado === 'Rechazado') {
      base = base.filter(i =>
        ['Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(i.estado),
      );
    } else if (this.filtroEstado) {
      base = base.filter(i => i.estado === this.filtroEstado);
    }
    if (this.busqueda.trim()) {
      const q = this.busqueda.trim().toLowerCase();
      base = base.filter(i =>
        i.workerNombre.toLowerCase().includes(q) || i.workerDni.includes(q),
      );
    }
    return base;
  }

  // ── Modal Aceptar ────────────────────────────────────────
  abrirAceptar(item: ProgramacionClinicaDto): void {
    this.modalAceptar = { open: true, item, nuevaFecha: item.fechaProgramada ?? '' };
  }

  cancelarAceptar(): void {
    this.modalAceptar = { open: false, item: null, nuevaFecha: '' };
  }

  confirmarAceptar(): void {
    const item = this.modalAceptar.item;
    if (!item) return;
    const body: ClinicaAccionDto = {
      id: item.id,
      accion: 'Aceptar',
      fechaNueva: this.modalAceptar.nuevaFecha,
    };
    this.cancelarAceptar();
    this.ejecutarAccion(item.id, body);
  }

  // ── Rechazar (SweetAlert2) ───────────────────────────────
  rechazar(item: ProgramacionClinicaDto): void {
    Swal.fire({
      title: 'Rechazar programación',
      html: `<span style="font-size:0.87rem;color:#94a3b8">${item.workerNombre}</span>`,
      input: 'text',
      inputPlaceholder: 'Motivo de rechazo *',
      inputAttributes: { autocomplete: 'off' },
      background: '#1e293b',
      color: '#f1f5f9',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      preConfirm: (motivo: string) => {
        if (!motivo?.trim()) {
          Swal.showValidationMessage('Ingresa el motivo de rechazo');
          return false;
        }
        return motivo.trim();
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.ejecutarAccion(item.id, {
          id: item.id,
          accion: 'Rechazar',
          motivoRechazo: result.value,
        });
      }
    });
  }

  // ── CheckIn ──────────────────────────────────────────────
  checkIn(item: ProgramacionClinicaDto): void {
    const hora = new Date().toTimeString().slice(0, 5);
    this.ejecutarAccion(item.id, { id: item.id, accion: 'CheckIn', checkInHora: hora });
  }

  // ── Completar EMO ────────────────────────────────────────
  abrirCompletar(item: ProgramacionClinicaDto): void {
    this.completandoItem = item;
  }

  onCompletado(): void {
    this.completandoItem = null;
    this.loadAgenda(this.selectedDate);
  }

  // ── Shared ───────────────────────────────────────────────
  private ejecutarAccion(id: number, body: ClinicaAccionDto): void {
    this.accionando = id;
    this.svc.accionClinica(id, body).subscribe({
      next: () => {
        this.accionando = null;
        this.loadAgenda(this.selectedDate);
      },
      error: (err) => {
        this.accionando = null;
        this.errorService.handleError(err);
      },
    });
  }

  // ── CSS helpers ──────────────────────────────────────────
  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'chip-blue',
      'Aceptado por Clínica': 'chip-violet',
      'En Atención': 'chip-orange',
      'Completado': 'chip-green',
      'Rechazado por Clínica': 'chip-slate',
      'Cancelado': 'chip-slate',
      'No se presentó': 'chip-slate',
    };
    return map[estado] ?? 'chip-slate';
  }

  cardBorderClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'card-bl-blue',
      'Aceptado por Clínica': 'card-bl-violet',
      'En Atención': 'card-bl-orange',
      'Completado': 'card-bl-green',
      'Rechazado por Clínica': 'card-bl-slate',
      'Cancelado': 'card-bl-slate',
      'No se presentó': 'card-bl-slate',
    };
    return map[estado] ?? 'card-bl-slate';
  }

  filtroClass(key: FiltroEstado): string {
    const map: Record<string, string> = {
      'Programado': 'pill-blue',
      'Aceptado por Clínica': 'pill-violet',
      'En Atención': 'pill-orange',
      'Completado': 'pill-green',
      'Rechazado': 'pill-slate',
    };
    return map[key] ?? '';
  }

  esTerminal(estado: string): boolean {
    return ['Completado', 'Rechazado por Clínica', 'Cancelado', 'No se presentó'].includes(estado);
  }

  fechaClass(fecha: string): string {
    const hoy = new Date().toISOString().split('T')[0];
    if (fecha === hoy) return 'fecha-hoy';
    if (fecha < hoy) return 'fecha-pasada';
    return 'fecha-futura';
  }
}
