import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import { BloqueoDto } from '../dtos/planeamiento-bim-bloqueo.dto';
import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';

@Component({
  selector: 'app-bloqueos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    PlaneamientoBimSubnavComponent,
    BaseModal,
  ],
  templateUrl: './bloqueos.html',
  styleUrl: './bloqueos.css',
})
export class Bloqueos implements OnInit {
  readonly tabs = PROJECTS_TABS;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;

  bloqueos: BloqueoDto[] = [];
  soloActivos: boolean = false;

  loadingProjects = false;
  loadingBloqueos = false;
  savingBloqueo = false;
  loadError: string | null = null;

  // Modal State
  showModal = false;
  modalMode: 'CREATE' | 'EDIT' = 'CREATE';
  editingId: number | null = null;

  formDescripcion: string = '';
  formEstado: string = 'ABIERTO'; // "ABIERTO" | "EN_GESTION"

  readonly btnCrearHeader: SsomaHeaderBtn = {
    label: 'Nuevo Bloqueo',
    icono: 'ti ti-plus',
  };

  constructor(
    private bimService: PlaneamientoBimService,
    private projectResidentService: ProjectResidentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.loadingProjects = true;
    this.loadError = null;

    this.projectResidentService.getProjectsDescription().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.handleError(err, 'No se pudo cargar la lista de proyectos.');
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarBloqueos();
  }

  cargarBloqueos(): void {
    if (!this.selectedProjectId) return;

    this.loadingBloqueos = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getBloqueos(this.selectedProjectId, this.soloActivos).subscribe({
      next: (data) => {
        this.bloqueos = data || [];
        this.loadingBloqueos = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingBloqueos = false;
        this.handleError(err, 'No se pudo cargar el listado de bloqueos.');
        this.cdr.detectChanges();
      },
    });
  }

  toggleSoloActivos(): void {
    this.soloActivos = !this.soloActivos;
    if (this.selectedProjectId) {
      this.cargarBloqueos();
    }
  }

  /**
   * REGLA CLAVE BLOQUEOS:
   * "activo" se determina estrictamente por fechaCierre === null (NUNCA por estado).
   */
  esActivo(b: BloqueoDto): boolean {
    return b.fechaCierre === null;
  }

  // ── Modales y Formulario ─────────────────────────────────────
  openCreateModal(): void {
    if (!this.selectedProjectId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor, seleccione un proyecto antes de registrar un bloqueo.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.modalMode = 'CREATE';
    this.editingId = null;
    this.formDescripcion = '';
    this.formEstado = 'ABIERTO';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(b: BloqueoDto): void {
    if (!this.esActivo(b)) {
      Swal.fire({
        icon: 'info',
        title: 'Bloqueo Cerrado',
        text: 'Este bloqueo ya fue cerrado y no se puede editar.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.modalMode = 'EDIT';
    this.editingId = b.id;
    this.formDescripcion = b.descripcion;
    // Si el estado en BD es CERRADO por algún motivo erróneo, fallback a EN_GESTION
    this.formEstado = b.estado === 'CERRADO' ? 'EN_GESTION' : b.estado;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.formDescripcion = '';
    this.formEstado = 'ABIERTO';
    this.editingId = null;
    this.cdr.detectChanges();
  }

  saveModal(): void {
    if (!this.formDescripcion || !this.formDescripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción requerida',
        text: 'Por favor ingrese la descripción del bloqueo.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (this.formEstado !== 'ABIERTO' && this.formEstado !== 'EN_GESTION') {
      Swal.fire({
        icon: 'warning',
        title: 'Estado inválido',
        text: 'El estado del bloqueo solo puede ser "ABIERTO" o "EN GESTIÓN".',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.savingBloqueo = true;
    this.cdr.detectChanges();

    if (this.modalMode === 'CREATE') {
      if (!this.selectedProjectId) return;
      this.bimService.createBloqueo(this.selectedProjectId, {
        descripcion: this.formDescripcion.trim(),
        estado: this.formEstado,
      }).subscribe({
        next: () => {
          this.savingBloqueo = false;
          this.closeModal();
          Swal.fire({
            icon: 'success',
            title: 'Bloqueo registrado',
            text: 'El bloqueo ha sido creado exitosamente.',
            timer: 1800,
            showConfirmButton: false,
          });
          this.cargarBloqueos();
        },
        error: (err: HttpErrorResponse) => {
          this.savingBloqueo = false;
          this.handleError(err, 'No se pudo registrar el bloqueo.');
          this.cdr.detectChanges();
        },
      });
    } else {
      if (!this.editingId) return;
      this.bimService.updateBloqueo(this.editingId, {
        descripcion: this.formDescripcion.trim(),
        estado: this.formEstado,
      }).subscribe({
        next: () => {
          this.savingBloqueo = false;
          this.closeModal();
          Swal.fire({
            icon: 'success',
            title: 'Bloqueo actualizado',
            text: 'Los cambios han sido guardados exitosamente.',
            timer: 1800,
            showConfirmButton: false,
          });
          this.cargarBloqueos();
        },
        error: (err: HttpErrorResponse) => {
          this.savingBloqueo = false;
          this.handleError(err, 'No se pudo actualizar el bloqueo.');
          this.cdr.detectChanges();
        },
      });
    }
  }

  cerrarBloqueo(b: BloqueoDto): void {
    if (!this.esActivo(b)) {
      Swal.fire({
        icon: 'info',
        title: 'Ya Cerrado',
        text: 'Este bloqueo ya fue cerrado previamente.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    Swal.fire({
      title: '¿Cerrar bloqueo?',
      text: `¿Está seguro de cerrar el bloqueo: "${b.descripcion}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E3A5F',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Sí, cerrar bloqueo',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loadingBloqueos = true;
        this.cdr.detectChanges();

        this.bimService.cerrarBloqueo(b.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Bloqueo Cerrado',
              text: 'El bloqueo se ha cerrado correctamente.',
              timer: 1800,
              showConfirmButton: false,
            });
            this.cargarBloqueos();
          },
          error: (err: HttpErrorResponse) => {
            this.loadingBloqueos = false;
            this.handleError(err, 'No se pudo cerrar el bloqueo.');
            this.cdr.detectChanges();
          },
        });
      }
    });
  }

  // ── Manejo Distinguible de Errores (F9) ────────────────────────
  private handleError(err: HttpErrorResponse, defaultMsg: string): void {
    let title = 'Error';
    let message = defaultMsg;

    if (err.status === 401) {
      title = 'Sesión Expirada (401)';
      message = 'Su sesión no es válida o ha caducado. Por favor vuelva a iniciar sesión.';
    } else if (err.status === 403) {
      title = 'Acceso Denegado (403)';
      message = 'No tiene permisos suficientes para realizar esta acción en el sistema.';
    } else if (err.status === 409) {
      title = 'Conflicto (409)';
      message = err.error?.message || 'El bloqueo indicado ya se encuentra cerrado o en un estado no modificable.';
    } else if (err.status === 404) {
      title = 'No Encontrado (404)';
      message = err.error?.message || 'El recurso solicitado no fue encontrado.';
    } else if (err.status === 400) {
      title = 'Solicitud Inválida (400)';
      message = err.error?.message || 'Los datos enviados son inválidos. Verifique la descripción y el estado.';
    } else if (err.error?.message) {
      message = err.error.message;
    }

    this.loadError = `${title}: ${message}`;

    Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonColor: '#1E3A5F',
    });
  }
}
