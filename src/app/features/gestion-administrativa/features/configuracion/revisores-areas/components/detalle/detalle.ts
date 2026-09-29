import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { RevisoresAreasService } from '../../services/revisores-areas.service';
import {
  ActorCeldaDTO,
  ActorCeldaDetalleDTO,
  CatalogoActorDTO,
  PersonaOpcionDTO,
  RevisoresAreaDetalleDTO,
} from '../../dtos/revisores-areas.dto';
import { ActorValor } from '../actor-valor/actor-valor';
import { CeldaPersonaEdit, RevisoresCeldaEditor } from '../celda-editor/celda-editor';

/** El estado editable de una celda (un caso y un actor de la fila). */
interface CeldaEdit {
  casoId: number;
  actorId: number;
  /** El checkbox "Personalizado": sin marcar, la celda vuelve a lo que decide el algoritmo. */
  personalizado: boolean;
  /** Lo personalizado, en orden. Se conserva al desmarcar por si se vuelve a marcar. */
  personas: CeldaPersonaEdit[];
}

/**
 * Ver y editar una fila de Revisores de Áreas en UN modal: arranca en lectura —el valor que hoy se
 * aplica a cada tipo de trabajador para cada actor, y de dónde sale— y el botón «Editar» pone TODO
 * el modal en edición. Se guarda todo junto con un solo botón al pie.
 */
@Component({
  standalone: true,
  selector: 'app-revisores-area-detalle',
  imports: [CommonModule, BaseModal, ActorValor, RevisoresCeldaEditor],
  templateUrl: './detalle.html',
})
export class RevisoresAreaDetalle implements OnInit {
  @Input({ required: true }) areaScopeId!: number;
  /** Null = la fila del área; con valor = la subfila de esa obra. */
  @Input() projectId: number | null = null;
  @Input() actores: CatalogoActorDTO[] = [];
  @Input() options: PersonaOpcionDTO[] = [];
  @Input() puedeEditar = false;
  @Output() closeModal = new EventEmitter<void>();
  /** Se guardó: la tabla tiene que recargarse. */
  @Output() guardado = new EventEmitter<void>();

  detalle: RevisoresAreaDetalleDTO | null = null;

  /** null = en lectura. Clave `casoId-actorId`. */
  edicion: Record<string, CeldaEdit> | null = null;
  private cambios = false;
  guardando = false;

  constructor(
    private service: RevisoresAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDetalle(this.areaScopeId, this.projectId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  get titulo(): string {
    const partes = ['REVISORES', this.detalle?.areaName, this.detalle?.projectName].filter(Boolean);
    return partes.join(' · ');
  }

  // ── Lectura ───────────────────────────────────────────────────────────

  /**
   * Lo que recomienda el sistema para la celda: si está personalizada en esta fila, lo que quedaría
   * sin eso; si no, lo que hoy se aplica (el algoritmo, o lo que hereda de su área).
   */
  recomendado(celda: ActorCeldaDetalleDTO): ActorCeldaDTO {
    return celda.sinPersonalizar ?? celda;
  }

  // ── Edición ───────────────────────────────────────────────────────────

  editar(): void {
    if (!this.detalle) return;
    const edicion: Record<string, CeldaEdit> = {};
    for (const caso of this.detalle.casos) {
      for (const celda of caso.actores) {
        if (!celda.editable) continue;
        edicion[this.clave(caso.casoId, celda.actorId)] = {
          casoId: caso.casoId,
          actorId: celda.actorId,
          personalizado: celda.asignados.length > 0,
          personas: celda.asignados.map((a) => ({ workerId: a.workerId, active: a.active, nombre: a.fullName })),
        };
      }
    }
    this.edicion = edicion;
    this.cambios = false;
  }

  celdaEdit(casoId: number, actorId: number): CeldaEdit | undefined {
    return this.edicion?.[this.clave(casoId, actorId)];
  }

  /**
   * Marcar "Personalizado" parte de lo que hoy se aplica, para ajustarlo en vez de cargarlo desde
   * cero. Desmarcarlo no borra la lista: si se vuelve a marcar, sigue ahí.
   */
  togglePersonalizado(e: CeldaEdit, celda: ActorCeldaDetalleDTO, activo: boolean): void {
    e.personalizado = activo;
    if (activo && e.personas.length === 0) {
      e.personas = this.recomendado(celda).personas
        .filter((p) => p.workerId != null)
        .map((p) => ({ workerId: p.workerId!, active: true, nombre: p.nombre }));
    }
    this.cambios = true;
  }

  marcarCambio(): void {
    this.cambios = true;
  }

  cancelarEdicion(): void {
    this.confirmarDescartar('Si sales de la edición, se pierden.').then((ok) => {
      if (!ok) return;
      this.edicion = null;
      this.cambios = false;
    });
  }

  cerrar(): void {
    this.confirmarDescartar('Si cierras, se pierden.').then((ok) => {
      if (ok) this.closeModal.emit();
    });
  }

  guardar(): void {
    if (!this.detalle || !this.edicion || this.guardando) return;

    const celdas = Object.values(this.edicion);
    const incompleta = celdas.find((c) => c.personalizado && c.personas.length === 0);
    if (incompleta) {
      const caso = this.detalle.casos.find((c) => c.casoId === incompleta.casoId)?.casoNombre ?? '';
      const actor = this.actores.find((a) => a.id === incompleta.actorId)?.nombre ?? '';
      Swal.fire({
        icon: 'warning',
        title: 'Falta elegir a alguien',
        text: `${actor} · ${caso}: agrega una persona o desmarca «Personalizado».`,
      });
      return;
    }

    this.guardando = true;
    this.loaderService.show();
    this.service
      .guardar(this.areaScopeId, {
        projectId: this.projectId,
        celdas: celdas.map((c) => ({
          casoId: c.casoId,
          actorId: c.actorId,
          asignados: c.personalizado ? c.personas.map((p) => ({ workerId: p.workerId, active: p.active })) : [],
        })),
      })
      .subscribe({
        next: (d) => {
          this.detalle = d;
          this.edicion = null;
          this.cambios = false;
          this.guardando = false;
          this.loaderService.hide();
          this.guardado.emit();
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1300, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  private confirmarDescartar(text: string): Promise<boolean> {
    if (!this.edicion || !this.cambios) return Promise.resolve(true);
    return Swal.fire({
      icon: 'warning',
      title: 'Tienes cambios sin guardar',
      text,
      showCancelButton: true,
      confirmButtonText: 'Salir sin guardar',
      cancelButtonText: 'Seguir editando',
    }).then((r) => r.isConfirmed);
  }

  private clave(casoId: number, actorId: number): string {
    return `${casoId}-${actorId}`;
  }
}
