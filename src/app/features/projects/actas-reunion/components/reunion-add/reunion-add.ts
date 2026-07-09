import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import {
  ProyectoFiltroDTO,
  ReunionParticipanteInput,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';
import { ParticipanteAdd, ParticipanteSeleccionado } from '../participante-add/participante-add';

interface ParticipanteRow {
  workerId: number | null;
  nombre: string;
  cargo: string;
  iniciales: string;
  inicialesEditadas: boolean;
}

@Component({
  selector: 'app-reunion-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect, ParticipanteAdd],
  templateUrl: './reunion-add.html',
})
export class ReunionAdd implements OnInit {
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  /** Trabajadores de Abril para los desplegables de "Convocado por" y participantes. */
  @Input() trabajadores: TrabajadorAbrilDTO[] = [];
  /** Preselecciona el proyecto (al agendar desde el detalle de otra reunión). */
  @Input() projectIdFijo: number | null = null;
  /** Reunión desde la que se promueve el tema de esta nueva reunión. */
  @Input() reunionAnteriorId: number | null = null;
  @Input() reunionAnteriorLabel = '';
  /** Participantes sugeridos (se copian de la reunión anterior). */
  @Input() set participantesSugeridos(value: ReunionParticipanteInput[] | null) {
    if (value?.length) {
      this.participantes = value.map((p) => ({
        workerId: p.workerId ?? null,
        nombre: p.nombre,
        cargo: p.cargo ?? '',
        iniciales: p.iniciales ?? '',
        inicialesEditadas: !!p.iniciales,
      }));
    }
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  projectId: number | null = null;
  tema = '';
  convocadoPor = '';
  lugar = '';
  fecha: string | null = null;
  horaInicio = '';
  horaFin = '';

  participantes: ParticipanteRow[] = [];
  showParticipanteModal = false;

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.projectIdFijo != null) this.projectId = this.projectIdFijo;
  }

  /**
   * Opciones del desplegable "Convocado por": los trabajadores de Abril más, si hace
   * falta, el valor actual (por si viene precargado y no está en la lista).
   */
  get opcionesConvocadoPor(): TrabajadorAbrilDTO[] {
    const actual = this.convocadoPor.trim();
    if (!actual || this.trabajadores.some((t) => t.fullName === actual)) return this.trabajadores;
    return [{ workerId: 0, fullName: actual, cargo: null }, ...this.trabajadores];
  }

  get inicialesActuales(): string[] {
    return this.participantes.map((p) => p.iniciales).filter(Boolean);
  }

  addParticipante(): void {
    this.showParticipanteModal = true;
  }

  onParticipanteAgregado(p: ParticipanteSeleccionado): void {
    this.participantes.push({
      workerId: p.workerId,
      nombre: p.nombre,
      cargo: p.cargo,
      iniciales: p.iniciales,
      inicialesEditadas: !!p.iniciales,
    });
    this.showParticipanteModal = false;
  }

  removeParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  /** Autogenera iniciales a partir del nombre mientras el usuario no las haya editado. */
  onNombreChange(row: ParticipanteRow): void {
    if (row.inicialesEditadas) return;
    row.iniciales = this.generarIniciales(row.nombre);
  }

  onInicialesChange(row: ParticipanteRow): void {
    row.inicialesEditadas = true;
  }

  private generarIniciales(nombre: string): string {
    const base = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
    if (!base) return '';
    // Evita iniciales duplicadas dentro de la misma reunión (ej. "MC", "MC 2")
    const repetidas = this.participantes.filter(
      (p) => p.iniciales === base || p.iniciales.startsWith(base + ' '),
    ).length;
    return repetidas > 0 ? `${base} ${repetidas + 1}` : base;
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.projectId == null) errors.push('Proyecto');
    if (!this.tema.trim()) errors.push('Tema de la reunión');
    if (!this.fecha) errors.push('Fecha de la reunión');
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio)
      errors.push('La hora de término debe ser mayor a la hora de inicio');
    return errors;
  }

  submit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const participantes: ReunionParticipanteInput[] = this.participantes
      .filter((p) => p.nombre.trim())
      .map((p) => ({
        reunionParticipanteId: null,
        workerId: p.workerId,
        nombre: p.nombre.trim(),
        cargo: p.cargo.trim() || null,
        iniciales: p.iniciales.trim() || null,
        asistio: false,
      }));

    this.loaderService.show();
    this.service
      .create({
        projectId: this.projectId!,
        tema: this.tema.trim(),
        convocadoPor: this.convocadoPor.trim() || null,
        lugar: this.lugar.trim() || null,
        fecha: this.fecha!,
        horaInicio: this.horaInicio ? `${this.horaInicio}:00` : null,
        horaFin: this.horaFin ? `${this.horaFin}:00` : null,
        reunionAnteriorId: this.reunionAnteriorId,
        participantes,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Reunión agendada!',
            text: 'La reunión fue agendada correctamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.created.emit(res.reunionId);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
