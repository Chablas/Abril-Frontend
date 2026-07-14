import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { AuditoriaAtsService } from '../../auditoria-ats.service';
import { AuditoriaAtsPreguntaDto } from '../../auditoria-ats.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { TrabajadorHabService } from '../../../../../habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../habilitacion/dtos/trabajador.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';

export interface RespuestaForm {
  preguntaId: number;
  texto: string;
  puntaje: number | null;
  comentario: string;
  showComentario: boolean;
}

export const SCORE_CONFIG = [
  { valor: 0, label: 'No consigna', color: '#c0392b', textColor: '#fff' },
  { valor: 1, label: 'Muy bajo',    color: '#e67e22', textColor: '#fff' },
  { valor: 2, label: 'Bajo',        color: '#f1c40f', textColor: '#333' },
  { valor: 3, label: 'Regular',     color: '#27ae60', textColor: '#fff' },
  { valor: 4, label: 'Bueno',       color: '#1e8449', textColor: '#fff' },
  { valor: 5, label: 'Muy bueno',   color: '#145a32', textColor: '#fff' },
];

@Component({
  selector: 'app-auditoria-ats-nueva',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel],
  templateUrl: './auditoria-ats-nueva.component.html',
  styleUrl: './auditoria-ats-nueva.component.css',
})
export class AuditoriaAtsNuevaComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  // Catálogos
  workers: WorkerHabilitacionListDto[] = [];
  proyectos: any[] = [];
  preguntas: AuditoriaAtsPreguntaDto[] = [];
  loadingCatalogos = true;

  // Cabecera
  fecha = new Date().toISOString().split('T')[0];
  auditorId: number | null = null;
  auditorNombre = '';
  auditadoId: number | null = null;
  auditadoNombre = '';
  proyectoId: number | null = null;
  actividad = '';
  lugar = '';
  observaciones = '';

  // Fotos
  fotosBase64: string[] = [];
  fotosPreview: string[] = [];
  @ViewChild('fotoInput') fotoInput!: ElementRef<HTMLInputElement>;

  // Evaluación
  respuestas: RespuestaForm[] = [];
  modoEvaluacion = false;
  readonly scoreConfig = SCORE_CONFIG;

  // Estado
  guardando = false;

  constructor(
    private service: AuditoriaAtsService,
    private projectService: ProjectService,
    private trabajadorService: TrabajadorHabService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorService.getTrabajadores({ pageSize: 9999 }),
      preguntas: this.service.getPreguntas(),
    }).subscribe({
      next: ({ proyectos, workers, preguntas }) => {
        this.proyectos = proyectos.data;
        this.workers = workers.data;
        this.preguntas = preguntas;
        this.respuestas = preguntas.map((p) => ({
          preguntaId: p.id,
          texto: p.texto,
          puntaje: null,
          comentario: '',
          showComentario: false,
        }));
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Selección de personas ──────────────────────────────────────────────────

  onAuditorChange(id: number | null): void {
    this.auditorId = id;
    this.auditorNombre = id ? (this.workers.find((w) => w.workerId === id)?.apellidoNombre ?? '') : '';
    this.cdr.markForCheck();
  }

  onAuditadoChange(id: number | null): void {
    this.auditadoId = id;
    const w = id ? this.workers.find((x) => x.workerId === id) : null;
    this.auditadoNombre = w?.apellidoNombre ?? '';
    this.cdr.markForCheck();
  }

  get auditorSeleccionado(): WorkerHabilitacionListDto | null {
    return this.auditorId ? (this.workers.find((w) => w.workerId === this.auditorId) ?? null) : null;
  }

  get auditadoSeleccionado(): WorkerHabilitacionListDto | null {
    return this.auditadoId ? (this.workers.find((w) => w.workerId === this.auditadoId) ?? null) : null;
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    for (let i = 0; i < input.files.length && this.fotosBase64.length < 10; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        this.fotosPreview.push(dataUrl);
        this.fotosBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(input.files[i]);
    }
    input.value = '';
  }

  quitarFoto(idx: number): void {
    this.fotosBase64.splice(idx, 1);
    this.fotosPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  // ── Evaluación ─────────────────────────────────────────────────────────────

  abrirEvaluacion(): void {
    if (!this.auditorId || !this.auditadoId || !this.fecha) {
      Swal.fire({
        icon: 'warning',
        title: 'Completa los datos obligatorios',
        text: 'Selecciona el auditor, el auditado y la fecha antes de evaluar.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    this.modoEvaluacion = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  cerrarEvaluacion(): void {
    this.modoEvaluacion = false;
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  setPuntaje(r: RespuestaForm, valor: number): void {
    r.puntaje = r.puntaje === valor ? null : valor;
    this.cdr.markForCheck();
  }

  toggleComentario(r: RespuestaForm): void {
    r.showComentario = !r.showComentario;
    this.cdr.markForCheck();
  }

  get evaluadas(): number {
    return this.respuestas.filter((r) => r.puntaje !== null).length;
  }

  get totalPreguntas(): number {
    return this.respuestas.length;
  }

  get evaluacionCompleta(): boolean {
    return this.evaluadas === this.totalPreguntas && this.totalPreguntas > 0;
  }

  get promedioActual(): number {
    const respondidas = this.respuestas.filter((r) => r.puntaje !== null);
    if (!respondidas.length) return 0;
    return respondidas.reduce((s, r) => s + r.puntaje!, 0) / respondidas.length;
  }

  get nivelActual(): (typeof SCORE_CONFIG)[number] {
    return this.nivelParaPuntaje(this.promedioActual);
  }

  nivelParaPuntaje(avg: number): (typeof SCORE_CONFIG)[number] {
    const idx = Math.min(5, Math.max(0, Math.round(avg)));
    return SCORE_CONFIG[idx];
  }

  scoreColor(valor: number): string {
    return SCORE_CONFIG[valor]?.color ?? '#ccc';
  }

  scoreTextColor(valor: number): string {
    return SCORE_CONFIG[valor]?.textColor ?? '#333';
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  get puedeGuardar(): boolean {
    return (
      !!this.auditorId &&
      !!this.auditadoId &&
      !!this.fecha &&
      this.evaluacionCompleta
    );
  }

  guardar(): void {
    if (this.guardando || !this.puedeGuardar) return;
    this.guardando = true;
    this.loaderService.show();

    this.service
      .crear({
        fecha: this.fecha,
        auditorWorkerId: this.auditorId!,
        auditadoWorkerId: this.auditadoId!,
        proyectoId: this.proyectoId ?? undefined,
        actividad: this.actividad || undefined,
        lugar: this.lugar || undefined,
        observaciones: this.observaciones || undefined,
        fotosBase64: this.fotosBase64,
        respuestas: this.respuestas.map((r) => ({
          preguntaId: r.preguntaId,
          puntaje: r.puntaje!,
          comentario: r.comentario || undefined,
        })),
      })
      .subscribe({
        next: ({ id }) => {
          this.guardando = false;
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Auditoría registrada',
            text: `Auditoría #${id} creada correctamente.`,
            confirmButtonText: 'Ver detalle',
            showCancelButton: true,
            cancelButtonText: 'Nueva auditoría',
          }).then((res) => {
            if (res.isConfirmed) {
              this.closeModal.emit();
              this.router.navigate(['/ssoma/gestion/auditoria-ats', id]);
            } else {
              this.resetForm();
            }
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  private resetForm(): void {
    this.fecha = new Date().toISOString().split('T')[0];
    this.auditorId = null;
    this.auditorNombre = '';
    this.auditadoId = null;
    this.auditadoNombre = '';
    this.proyectoId = null;
    this.actividad = '';
    this.lugar = '';
    this.observaciones = '';
    this.fotosBase64 = [];
    this.fotosPreview = [];
    this.respuestas = this.preguntas.map((p) => ({
      preguntaId: p.id,
      texto: p.texto,
      puntaje: null,
      comentario: '',
      showComentario: false,
    }));
    this.modoEvaluacion = false;
    this.cdr.markForCheck();
  }

  cancelar(): void {
    this.closeModal.emit();
  }
}
