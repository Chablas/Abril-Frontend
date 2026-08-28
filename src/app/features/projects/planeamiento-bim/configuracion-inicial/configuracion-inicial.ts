import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import {
  FaseConfigDTO,
  PlaneamientoBimConfigDTO,
  ResponsableBimWorkerDTO,
  ZonaConfigDTO,
} from '../dtos/planeamiento-bim-config.dto';

import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';

@Component({
  selector: 'app-configuracion-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, PlaneamientoBimSubnavComponent],
  templateUrl: './configuracion-inicial.html',
  styleUrl: './configuracion-inicial.css',
})
export class ConfiguracionInicial implements OnInit {
  readonly tabs = PROJECTS_TABS;
  /** Meta PPC estándar del sistema (Fase A backend) — fija, ya no se edita ni se envía desde acá. */
  readonly metaPpcEstandar = 85;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;

  responsables: ResponsableBimWorkerDTO[] = [];

  config: PlaneamientoBimConfigDTO = {
    responsableId: null,
    metaPpc: null,
    zonas: [],
    fases: [],
  };

  loadingProjects = false;
  loadingConfig = false;
  savingConfig = false;
  loadError: string | null = null;
  saveError: string | null = null;

  readonly btnGuardarHeader: SsomaHeaderBtn = {
    label: 'Guardar Configuración',
    icono: 'ti ti-device-floppy',
  };

  constructor(
    private bimService: PlaneamientoBimService,
    private projectResidentService: ProjectResidentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loadingProjects = true;
    this.loadError = null;

    // Llamada ultraligera a GET /api/v1/projectResident/projects
    this.projectResidentService.getProjectsDescription().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();

        // Cargar catálogo de responsables de Planeamiento BIM
        this.bimService.getResponsables().subscribe({
          next: (respList) => {
            this.responsables = respList || [];
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            // DEBUG: Error cargando catálogo de responsables
            this.responsables = [];
            this.cdr.detectChanges();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.loadError = 'No se pudo cargar la lista de proyectos. Verifique su conexión.';
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarConfiguracionProyecto(this.selectedProjectId);
  }

  cargarConfiguracionProyecto(projectId: number): void {
    this.loadingConfig = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.bimService.getConfiguracion(projectId).subscribe({
      next: (data) => {
        this.config = {
          projectId: data?.projectId ?? projectId,
          responsableId: data?.responsableId ?? null,
          metaPpc: data?.metaPpc ?? null,
          zonas: data?.zonas || [],
          fases: data?.fases || [],
        };
        this.loadingConfig = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingConfig = false;
        this.loadError = `Error HTTP ${err.status}: ${err.error?.message || 'No se pudo obtener la configuración inicial del proyecto.'}`;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Gestión de Zonas ─────────────────────────────────────────
  addZona(): void {
    this.config.zonas.push({
      id: null,
      nombre: '',
      orden: this.config.zonas.length + 1,
      niveles: [],
      sectores: [],
    });
  }

  removeZona(index: number): void {
    this.config.zonas.splice(index, 1);
  }

  // ── Gestión de Niveles ───────────────────────────────────────
  addNivel(zona: ZonaConfigDTO): void {
    if (!zona.niveles) zona.niveles = [];
    const nuevoOrden = zona.niveles.length + 1;
    zona.niveles.push({
      id: null,
      nombre: '',
      orden: nuevoOrden,
    });
  }

  removeNivel(zona: ZonaConfigDTO, index: number): void {
    zona.niveles.splice(index, 1);
    // Reordenar automáticamente los niveles restantes
    zona.niveles.forEach((n, idx) => (n.orden = idx + 1));
  }

  // ── Gestión de Sectores ──────────────────────────────────────
  addSector(zona: ZonaConfigDTO): void {
    if (!zona.sectores) zona.sectores = [];
    const nuevoOrden = zona.sectores.length + 1;
    zona.sectores.push({
      id: null,
      nombre: '',
      orden: nuevoOrden,
    });
  }

  removeSector(zona: ZonaConfigDTO, index: number): void {
    zona.sectores.splice(index, 1);
    zona.sectores.forEach((s, idx) => (s.orden = idx + 1));
  }

  // ── Guardar Configuración ────────────────────────────────────
  onGuardar(): void {
    if (!this.selectedProjectId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor, seleccione un proyecto antes de guardar.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    // Validar fechas de fases (fechaInicio <= fechaFinMeta)
    for (const fase of (this.config.fases || [])) {
      if (fase.fechaInicio && fase.fechaFinMeta) {
        if (new Date(fase.fechaInicio) > new Date(fase.fechaFinMeta)) {
          Swal.fire({
            icon: 'warning',
            title: 'Fechas inconsistentes en Fases',
            text: `En la fase "${fase.nombre}", la fecha de inicio meta es posterior a la fecha de fin meta.`,
            confirmButtonColor: '#1E3A5F',
          });
          return;
        }
      }
    }

    // Validar nombres de zonas
    for (let i = 0; i < (this.config.zonas || []).length; i++) {
      const z = this.config.zonas[i];
      if (!z.nombre || !z.nombre.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Nombre de Zona requerido',
          text: `La zona #${i + 1} no tiene un nombre asignado.`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }
    }

    this.savingConfig = true;
    this.saveError = null;
    this.cdr.detectChanges();

    // Meta PPC ya no se envía: es un estándar fijo que administra el backend (Fase A).
    const payload = {
      responsableId: this.config.responsableId ? Number(this.config.responsableId) : null,
      zonas: (this.config.zonas || []).map((z, idx) => ({
        id: z.id ?? null,
        nombre: z.nombre.trim(),
        orden: z.orden || (idx + 1),
        niveles: (z.niveles || []).map((n, nIdx) => ({
          id: n.id ?? null,
          nombre: n.nombre.trim(),
          orden: Number(n.orden) || (nIdx + 1),
        })),
        sectores: (z.sectores || []).map((s, sIdx) => ({
          id: s.id ?? null,
          nombre: s.nombre.trim(),
          orden: Number(s.orden) || (sIdx + 1),
        })),
      })),
      fases: (this.config.fases || []).map((f) => ({
        id: f.id,
        fechaInicio: f.fechaInicio || null,
        fechaFinMeta: f.fechaFinMeta || null,
      })),
    };

    this.bimService.saveConfiguracion(this.selectedProjectId, payload as any).subscribe({
      next: () => {
        this.savingConfig = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'Se han guardado todos los cambios correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        // Recargar datos actualizados
        if (this.selectedProjectId) {
          this.cargarConfiguracionProyecto(this.selectedProjectId);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.savingConfig = false;
        this.cdr.detectChanges();
        if (err.status === 409) {
          Swal.fire({
            icon: 'error',
            title: 'Conflicto al eliminar (409)',
            text: 'No se puede eliminar la zona, nivel o sector indicado porque cuenta con registros asociados en la Carga Diaria.',
            confirmButtonColor: '#1E3A5F',
          });
        } else {
          const mensajeErr = err.error?.message || err.message || 'Error desconocido al guardar la configuración.';
          this.saveError = `Error HTTP ${err.status}: ${mensajeErr}`;
          Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: mensajeErr,
            confirmButtonColor: '#1E3A5F',
          });
        }
      },
    });
  }
}
