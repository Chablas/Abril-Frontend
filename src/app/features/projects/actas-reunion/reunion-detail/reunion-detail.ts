import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { FileSelector, SelectedFile } from '../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../shared/components/file-preview/file-preview';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ReunionAdd } from '../components/reunion-add/reunion-add';
import { ReunionReprogramar } from '../components/reunion-reprogramar/reunion-reprogramar';
import { AcuerdoForm } from '../components/acuerdo-form/acuerdo-form';
import {
  ParticipanteAdd,
  ParticipanteSeleccionado,
} from '../components/participante-add/participante-add';
import {
  ReunionAcuerdoDTO,
  ReunionDetalleDTO,
  ReunionParticipanteInput,
  TrabajadorAbrilDTO,
} from '../dtos/actas-reunion.dto';

interface ParticipanteRow {
  reunionParticipanteId: number | null;
  workerId: number | null;
  nombre: string;
  cargo: string;
  iniciales: string;
  asistio: boolean;
}

@Component({
  selector: 'app-reunion-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FileSelector, FilePreview, SearchSelect, ReunionAdd, ReunionReprogramar, AcuerdoForm, ParticipanteAdd],
  templateUrl: './reunion-detail.html',
})
export class ReunionDetail implements OnInit {
  reunionId!: number;
  detalle: ReunionDetalleDTO | null = null;

  // Formulario editable de cabecera
  tema = '';
  convocadoPor = '';
  lugar = '';
  horaInicio = '';
  horaFin = '';
  observaciones = '';
  participantes: ParticipanteRow[] = [];

  // Archivos nuevos por subir
  nuevosArchivos: SelectedFile[] = [];

  showReprogramarModal = false;
  showAcuerdoModal = false;
  acuerdoEnEdicion: ReunionAcuerdoDTO | null = null;
  showSiguienteModal = false;
  showParticipanteModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.reunionId = Number(params.get('reunionId'));
      this.load();
    });
  }

  load(): void {
    this.loaderService.show();
    this.service.getDetalle(this.reunionId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.tema = data.tema;
        this.convocadoPor = data.convocadoPor ?? '';
        this.lugar = data.lugar ?? '';
        this.horaInicio = data.horaInicio ? data.horaInicio.slice(0, 5) : '';
        this.horaFin = data.horaFin ? data.horaFin.slice(0, 5) : '';
        this.observaciones = data.observaciones ?? '';
        this.participantes = data.participantes.map((p) => ({
          reunionParticipanteId: p.reunionParticipanteId,
          workerId: null,
          nombre: p.nombre,
          cargo: p.cargo ?? '',
          iniciales: p.iniciales ?? '',
          asistio: p.asistio,
        }));
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/projects/actas-reunion']);
  }

  irAReunion(id: number | null): void {
    if (id == null) return;
    this.router.navigate(['/projects/actas-reunion', id]);
  }

  // ── Cabecera + participantes ─────────────────────────────────────────────

  /**
   * Opciones del desplegable "Convocado por": los trabajadores de Abril más, si hace
   * falta, el valor ya guardado (por si es un nombre antiguo que no está en la lista).
   */
  get opcionesConvocadoPor(): TrabajadorAbrilDTO[] {
    const trabajadores = this.detalle?.trabajadores ?? [];
    const actual = this.convocadoPor.trim();
    if (!actual || trabajadores.some((t) => t.fullName === actual)) return trabajadores;
    return [{ workerId: 0, fullName: actual, cargo: null }, ...trabajadores];
  }

  get inicialesActuales(): string[] {
    return this.participantes.map((p) => p.iniciales).filter(Boolean);
  }

  addParticipante(): void {
    this.showParticipanteModal = true;
  }

  onParticipanteAgregado(p: ParticipanteSeleccionado): void {
    this.participantes.push({
      reunionParticipanteId: null,
      workerId: p.workerId,
      nombre: p.nombre,
      cargo: p.cargo,
      iniciales: p.iniciales,
      asistio: false,
    });
    this.showParticipanteModal = false;
  }

  removeParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  guardar(): void {
    if (!this.tema.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'El tema de la reunión es obligatorio.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio) {
      Swal.fire({
        icon: 'warning',
        title: 'Horas inválidas',
        text: 'La hora de término debe ser mayor a la hora de inicio.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const participantes: ReunionParticipanteInput[] = this.participantes
      .filter((p) => p.nombre.trim())
      .map((p) => ({
        reunionParticipanteId: p.reunionParticipanteId,
        workerId: p.workerId,
        nombre: p.nombre.trim(),
        cargo: p.cargo.trim() || null,
        iniciales: p.iniciales.trim() || null,
        asistio: p.asistio,
      }));

    this.loaderService.show();
    this.service
      .update(this.reunionId, {
        tema: this.tema.trim(),
        convocadoPor: this.convocadoPor.trim() || null,
        lugar: this.lugar.trim() || null,
        horaInicio: this.horaInicio ? `${this.horaInicio}:00` : null,
        horaFin: this.horaFin ? `${this.horaFin}:00` : null,
        observaciones: this.observaciones.trim() || null,
        participantes,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Acta actualizada!',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ── Estado / reprogramación ──────────────────────────────────────────────
  onReprogramada(): void {
    this.showReprogramarModal = false;
    this.load();
  }

  cambiarEstado(estado: string, titulo: string, texto: string): void {
    Swal.fire({
      icon: 'question',
      title: titulo,
      text: texto,
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.cambiarEstado(this.reunionId, estado).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  eliminarActa(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar acta?',
      text: 'El acta de reunión y su contenido dejarán de estar visibles.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminar(this.reunionId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.volver();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // ── Acuerdos ─────────────────────────────────────────────────────────────
  abrirAcuerdo(acuerdo: ReunionAcuerdoDTO | null): void {
    this.acuerdoEnEdicion = acuerdo;
    this.showAcuerdoModal = true;
  }

  onAcuerdoGuardado(): void {
    this.showAcuerdoModal = false;
    this.acuerdoEnEdicion = null;
    this.load();
  }

  marcarCumplido(acuerdo: ReunionAcuerdoDTO): void {
    const cumplidoId = this.detalle?.acuerdoEstados.find((e) => e.descripcion === 'CUMPLIDO')?.id;
    if (!cumplidoId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Marcar acuerdo como cumplido?',
      text: 'Se registrará hoy como fecha de cumplimiento.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cumplido',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const hoy = new Date();
      const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      this.loaderService.show();
      this.service
        .actualizarAcuerdo(acuerdo.reunionAcuerdoId, {
          descripcion: acuerdo.descripcion,
          acciones: acuerdo.acciones,
          fechaProgramada: acuerdo.fechaProgramada,
          fechaReprogramacion: acuerdo.fechaReprogramacion,
          fechaCumplimiento: fechaHoy,
          reunionAcuerdoEstadoId: cumplidoId,
          responsableIds: acuerdo.responsableIds,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.load();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  eliminarAcuerdo(acuerdo: ReunionAcuerdoDTO): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar acuerdo?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarAcuerdo(acuerdo.reunionAcuerdoId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  responsablesLabel(acuerdo: ReunionAcuerdoDTO): string {
    if (!this.detalle) return '';
    const labels = acuerdo.responsableIds
      .map((id) => this.detalle!.participantes.find((p) => p.reunionParticipanteId === id))
      .filter(Boolean)
      .map((p) => p!.iniciales || p!.nombre);
    return labels.join(' / ');
  }

  acuerdoEstadoClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'EN PROCESO':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'CUMPLIDO':
        return 'bg-[var(--color-abril-primary-light)] text-[var(--color-abril-primary-dark)]';
      case 'ANULADO':
        return 'bg-gray-100 text-gray-500 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'PROGRAMADA':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'REALIZADA':
        return 'bg-[var(--color-abril-primary-light)] text-[var(--color-abril-primary-dark)]';
      case 'CANCELADA':
        return 'bg-red-50 text-red-600 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  // ── Archivos ─────────────────────────────────────────────────────────────
  onFileSelected(file: SelectedFile): void {
    this.nuevosArchivos.push(file);
  }

  removeNuevoArchivo(index: number): void {
    this.nuevosArchivos.splice(index, 1);
  }

  get nuevosArchivosPreview(): FilePreviewItem[] {
    return this.nuevosArchivos.map((f) => ({
      name: f.file.name,
      size: `${(f.file.size / 1024 / 1024).toFixed(2)} MB`,
    }));
  }

  subirArchivos(): void {
    if (this.nuevosArchivos.length === 0) return;
    this.loaderService.show();
    this.service.subirArchivos(this.reunionId, this.nuevosArchivos.map((f) => f.file)).subscribe({
      next: () => {
        this.loaderService.hide();
        this.nuevosArchivos = [];
        Swal.fire({
          icon: 'success',
          title: '¡Archivos subidos!',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarArchivo(reunionArchivoId: number): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar archivo?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarArchivo(reunionArchivoId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  // ── Siguiente reunión ────────────────────────────────────────────────────
  /**
   * Copia de los participantes del acta para sugerirlos en la siguiente reunión.
   * Se materializa al abrir el modal (no como getter): un getter crearía un array
   * nuevo en cada ciclo de change detection y el modal recrearía sus filas con
   * ngModel sin parar, congelando la página en un bucle infinito de microtasks.
   */
  participantesParaSiguiente: ReunionParticipanteInput[] = [];

  abrirSiguienteModal(): void {
    this.participantesParaSiguiente = (this.detalle?.participantes ?? []).map((p) => ({
      reunionParticipanteId: null,
      nombre: p.nombre,
      cargo: p.cargo,
      iniciales: p.iniciales,
      asistio: false,
    }));
    this.showSiguienteModal = true;
  }

  onSiguienteCreada(reunionId: number): void {
    this.showSiguienteModal = false;
    this.irAReunion(reunionId);
  }

  hora(value: string | null): string {
    return value ? value.slice(0, 5) : '—';
  }
}
