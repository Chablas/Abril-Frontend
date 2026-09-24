import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';
import { PlaneamientoBimEvidenciaGaleria } from '../shared/evidencia-galeria/evidencia-galeria';
import {
  ActividadCatalogoDto,
  CargaDiariaDto,
  CausaCatalogoDto,
  CeldaDto,
} from '../dtos/planeamiento-bim-carga-diaria.dto';
import { NivelTorreDTO, TorreConfigDTO } from '../dtos/planeamiento-bim-config.dto';
import { ProyectoBimSimpleDto } from '../dtos/planeamiento-bim-proyecto.dto';

@Component({
  selector: 'app-carga-diaria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    PlaneamientoBimSubnavComponent,
    BaseModal,
    PlaneamientoBimEvidenciaGaleria,
  ],
  templateUrl: './carga-diaria.html',
  styleUrl: './carga-diaria.css',
})
export class CargaDiaria implements OnInit {
  readonly tabs = PROJECTS_TABS;
  projects: ProyectoBimSimpleDto[] = [];
  selectedProjectId: number | null = null;
  fechaSeleccionada: string = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  cargaDiariaData: CargaDiariaDto | null = null;
  torres: TorreConfigDTO[] = [];
  actividades: ActividadCatalogoDto[] = [];
  causasCatalogo: CausaCatalogoDto[] = [];
  celdasMap: Map<string, CeldaDto> = new Map();

  /** Selector de captura Torre → Nivel (el Sector ya no se elige: se muestran todos
   *  los 1..N de una vez, como filas individualmente clickeables de la grilla). */
  selectedTorreId: number | null = null;
  selectedNivelId: number | null = null;

  loadingProjects = false;
  loadingCarga = false;
  savingCarga = false;
  uploadingFotos = false;
  loadError: string | null = null;

  // Modal para detalle de Causa de Incumplimiento
  showCausaModal = false;
  activeCeldaKey: string | null = null;
  activeCelda: CeldaDto | null = null;
  activeCeldaPrevCumplida: boolean | null = null;
  modalCausaId: number | null = null;
  modalCausaDetalle: string = '';

  readonly btnGuardarHeader: SsomaHeaderBtn = {
    label: 'Guardar Carga Diaria',
    icono: 'ti ti-device-floppy',
  };

  constructor(
    private bimService: PlaneamientoBimService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  cargarProyectos(): void {
    this.loadingProjects = true;
    this.loadError = null;

    // Catálogo ya filtrado por rol/asignación en backend (admin ve todo, PLANEAMIENTO_UDP
    // solo donde es responsable) — no requiere filtro adicional acá.
    this.bimService.getProyectos().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.handleError(err, 'No se pudo cargar la lista de proyectos.', true);
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarCargaDiaria();
  }

  onFechaChange(fecha: string): void {
    this.fechaSeleccionada = fecha;
    if (this.selectedProjectId) {
      this.cargarCargaDiaria();
    }
  }

  cargarCargaDiaria(): void {
    if (!this.selectedProjectId || !this.fechaSeleccionada) return;

    this.loadingCarga = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getCargaDiaria(this.selectedProjectId, this.fechaSeleccionada).subscribe({
      next: (data) => {
        this.cargaDiariaData = data;
        this.torres = data.torres || [];
        this.actividades = data.actividades || [];
        this.causasCatalogo = (data.causas || []).sort((a, b) => a.orden - b.orden);
        this.inicializarMapCeldas(data.celdas || []);
        // La torre/nivel seleccionados pueden no existir más tras recargar (otro proyecto/fecha)
        this.selectedTorreId = null;
        this.selectedNivelId = null;
        this.loadingCarga = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCarga = false;
        this.handleError(err, 'No se pudo obtener la carga diaria para la fecha seleccionada.', true);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Selector de captura: Torre → Nivel ────────────────────────
  get torreSeleccionada(): TorreConfigDTO | undefined {
    return this.torres.find((t) => t.id === this.selectedTorreId);
  }

  get nivelesDisponibles(): NivelTorreDTO[] {
    return this.torreSeleccionada?.niveles || [];
  }

  get nivelSeleccionado(): NivelTorreDTO | undefined {
    return this.nivelesDisponibles.find((n) => n.id === this.selectedNivelId);
  }

  /** Sectores derivados (1..N) del nivel elegido, según su clasificación y el conteo de la torre. */
  get sectoresDelNivel(): number[] {
    const torre = this.torreSeleccionada;
    const nivel = this.nivelSeleccionado;
    if (!torre || !nivel || !nivel.tipoEstructura) return [];
    const cantidad = nivel.tipoEstructura === 'SUBESTRUCTURA'
      ? torre.cantidadSectoresSubestructura || 0
      : torre.cantidadSectoresSuperestructura || 0;
    return Array.from({ length: cantidad }, (_, i) => i + 1);
  }

  onTorreSeleccionada(torreId: number | null): void {
    this.selectedTorreId = torreId;
    this.selectedNivelId = null;
  }

  onNivelSeleccionado(nivelId: number | null): void {
    this.selectedNivelId = nivelId;
  }

  private getKey(tId: number, nId: number, sId: number, aId: number): string {
    return `${tId}_${nId}_${sId}_${aId}`;
  }

  private inicializarMapCeldas(celdasExistentes: CeldaDto[]): void {
    this.celdasMap.clear();
    celdasExistentes.forEach((c) => {
      const key = this.getKey(c.torreId, c.nivelId, c.sectorId, c.actividadId);
      this.celdasMap.set(key, { ...c });
    });
  }

  getCelda(tId: number, nId: number, sId: number, aId: number): CeldaDto | undefined {
    return this.celdasMap.get(this.getKey(tId, nId, sId, aId));
  }

  getCellTitle(tId: number, nId: number, sId: number, aId: number): string {
    const celda = this.getCelda(tId, nId, sId, aId);
    if (!celda || celda.cumplida === null) return 'Sin cargar (clic para marcar cumplido)';
    if (celda.cumplida === true) return 'Cumplido (clic para marcar no cumplido)';
    return `No Cumplido: ${celda.causaNombre || 'Sin causa'} (clic para volver a neutro)`;
  }

  /**
   * Ciclo Tri-state de Celda:
   * 1. null (Neutro / '—') -> pasa a true (Cumplido / '✓')
   * 2. true (Cumplido) -> pasa a false (No Cumplido / '✕') y abre modal de causa
   * 3. false (No Cumplido) -> pasa a null (Neutro / '—') limpiando la causa
   */
  toggleCumplimiento(tId: number, nId: number, sId: number, aId: number): void {
    if (!this.cargaDiariaData?.esEditable) return;

    const key = this.getKey(tId, nId, sId, aId);
    let celda = this.celdasMap.get(key);

    if (!celda || celda.cumplida === null) {
      // Estado 1 -> 2: De neutro a cumplido (true)
      if (!celda) {
        celda = {
          torreId: tId,
          nivelId: nId,
          sectorId: sId,
          actividadId: aId,
          cumplida: true,
          causaId: null,
          causaNombre: null,
          causaDetalle: null,
        };
        this.celdasMap.set(key, celda);
      } else {
        celda.cumplida = true;
        celda.causaId = null;
        celda.causaNombre = null;
        celda.causaDetalle = null;
      }
    } else if (celda.cumplida === true) {
      // Estado 2 -> 3: De cumplido a no cumplido (false) -> abrir modal de causa
      this.openCausaModal(key, celda, true);
    } else {
      // Estado 3 -> 1: De no cumplido a neutro (null)
      celda.cumplida = null;
      celda.causaId = null;
      celda.causaNombre = null;
      celda.causaDetalle = null;
      this.celdasMap.delete(key);
    }
    this.cdr.detectChanges();
  }

  // ── Modal de Causa de Incumplimiento ──────────────────────────
  openCausaModal(key: string, celda: CeldaDto, prevCumplida: boolean | null = true): void {
    this.activeCeldaKey = key;
    this.activeCelda = celda;
    this.activeCeldaPrevCumplida = prevCumplida;
    this.modalCausaId = celda.causaId || null;
    this.modalCausaDetalle = celda.causaDetalle || '';
    this.showCausaModal = true;
    this.cdr.detectChanges();
  }

  closeCausaModal(): void {
    if (this.activeCelda && !this.activeCelda.causaId) {
      // Si el usuario cancela sin seleccionar causa, revertir al estado previo
      if (this.activeCeldaPrevCumplida === null) {
        this.activeCelda.cumplida = null;
        if (this.activeCeldaKey) {
          this.celdasMap.delete(this.activeCeldaKey);
        }
      } else {
        this.activeCelda.cumplida = this.activeCeldaPrevCumplida;
      }
    }
    this.showCausaModal = false;
    this.activeCeldaKey = null;
    this.activeCelda = null;
    this.cdr.detectChanges();
  }

  saveCausaModal(): void {
    if (!this.activeCelda) return;

    if (!this.modalCausaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Causa requerida',
        text: 'Por favor seleccione la causa de no cumplimiento.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    this.activeCelda.cumplida = false;
    this.activeCelda.causaId = this.modalCausaId;
    const causaObj = this.causasCatalogo.find((c) => c.id === this.modalCausaId);
    this.activeCelda.causaNombre = causaObj ? causaObj.nombre : null;
    this.activeCelda.causaDetalle = this.modalCausaDetalle.trim() || null;

    this.showCausaModal = false;
    this.activeCeldaKey = null;
    this.activeCelda = null;
    this.cdr.detectChanges();
  }

  // ── Subida de Fotos Evidencias ────────────────────────────────
  onFilesSelected(files: File[]): void {
    if (!files || files.length === 0 || !this.selectedProjectId) return;

    this.uploadingFotos = true;
    this.cdr.detectChanges();

    this.bimService.subirEvidencias(this.selectedProjectId, this.fechaSeleccionada, files, 'GENERAL').subscribe({
      next: (nuevasFotos) => {
        this.uploadingFotos = false;
        if (this.cargaDiariaData) {
          if (!this.cargaDiariaData.evidencias) this.cargaDiariaData.evidencias = [];
          this.cargaDiariaData.evidencias.push(...nuevasFotos);
        }
        Swal.fire({
          icon: 'success',
          title: 'Evidencias subidas',
          text: `Se han subido ${nuevasFotos.length} fotos de evidencia.`,
          timer: 1800,
          showConfirmButton: false,
        });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingFotos = false;
        this.handleError(err, 'No se pudieron subir las evidencias fotográficas.', false);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Guardar Carga Diaria ─────────────────────────────────────
  onGuardar(): void {
    if (!this.selectedProjectId || !this.fechaSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos requeridos',
        text: 'Por favor, seleccione un proyecto y una fecha válida.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (this.cargaDiariaData && !this.cargaDiariaData.esEditable) {
      Swal.fire({
        icon: 'warning',
        title: 'Lectura Solamente',
        text: 'Esta fecha corresponde a un día histórico y no es editable.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    // Filtrar estrictamente solo las celdas evaluadas (cumplida !== null && cumplida !== undefined)
    const celdasEvaluadas = Array.from(this.celdasMap.values()).filter(
      (c) => c.cumplida !== null && c.cumplida !== undefined
    );

    // Validación de Frontend: solo al guardar, verificar que las celdas marcadas como no cumplidas tengan causa
    const celdasSinCausa = celdasEvaluadas.filter((c) => c.cumplida === false && !c.causaId);
    if (celdasSinCausa.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Causa requerida',
        text: 'Debe indicar la causa de no cumplimiento para las celdas marcadas como no hechas.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    const celdasArray = celdasEvaluadas.map((c) => ({
      torreId: c.torreId,
      nivelId: c.nivelId,
      sectorId: c.sectorId,
      actividadId: c.actividadId,
      cumplida: c.cumplida as boolean,
      causaId: c.cumplida ? null : (c.causaId ?? null),
      causaDetalle: c.cumplida ? null : (c.causaDetalle ?? null),
    }));

    this.savingCarga = true;
    this.cdr.detectChanges();

    this.bimService.saveCargaDiaria(this.selectedProjectId, this.fechaSeleccionada, { celdas: celdasArray }).subscribe({
      next: () => {
        this.savingCarga = false;
        Swal.fire({
          icon: 'success',
          title: 'Carga Diaria Guardada',
          text: 'Se han registrado los avances diarios correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        this.cargarCargaDiaria();
      },
      error: (err: HttpErrorResponse) => {
        this.savingCarga = false;
        this.handleError(err, 'No se pudo guardar la carga diaria.', false);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Manejo Distinguible de Errores (F9) ────────────────────────
  private handleError(err: HttpErrorResponse, defaultMsg: string, isLoadError: boolean = true): void {
    let title = 'Error';
    let message = defaultMsg;

    if (err.status === 401) {
      title = 'Sesión Expirada (401)';
      message = 'Su sesión no es válida o ha caducado. Por favor vuelva a iniciar sesión.';
    } else if (err.status === 403) {
      title = 'Acceso Denegado (403)';
      message = 'No tiene permisos suficientes para realizar esta acción en el sistema.';
    } else if (err.status === 404) {
      title = 'No Encontrado (404)';
      message = err.error?.message || 'El proyecto o recurso solicitado no fue encontrado.';
    } else if (err.error?.message) {
      message = err.error.message;
    }

    if (isLoadError) {
      this.loadError = `${title}: ${message}`;
    }

    Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonColor: '#1E3A5F',
    });
  }
}

