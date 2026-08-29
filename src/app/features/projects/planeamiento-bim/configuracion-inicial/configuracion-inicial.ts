import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import {
  NivelTorreDTO,
  PlaneamientoBimConfigDTO,
  ResponsableBimWorkerDTO,
  TipoEstructura,
  TorreConfigDTO,
  TorreUpdateDto,
} from '../dtos/planeamiento-bim-config.dto';

import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';

/** Datos transitorios del formulario "Agregar nivel típico" — nunca se envían al backend,
 *  solo sirven para generar filas normales de nivel en el arreglo local de la torre. */
interface NivelTipicoForm {
  nombreBase: string;
  desde: number | null;
  hasta: number | null;
  tipoEstructura: TipoEstructura | null;
}

function nuevoNivelTipicoForm(): NivelTipicoForm {
  return { nombreBase: '', desde: null, hasta: null, tipoEstructura: null };
}

/** Estado local de edición de una torre: además de lo que devuelve el GET, agrega el estado
 *  transitorio del generador de "niveles típicos" (rango), que no forma parte del payload. */
interface TorreEdicion extends TorreConfigDTO {
  mostrarNivelTipico: boolean;
  nivelTipicoForm: NivelTipicoForm;
}

const TIPOS_ESTRUCTURA: { id: TipoEstructura; nombre: string }[] = [
  { id: 'SUBESTRUCTURA', nombre: 'Subestructura' },
  { id: 'SUPERESTRUCTURA', nombre: 'Superestructura' },
];

@Component({
  selector: 'app-configuracion-inicial',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, PlaneamientoBimSubnavComponent, SearchSelect],
  templateUrl: './configuracion-inicial.html',
  styleUrl: './configuracion-inicial.css',
})
export class ConfiguracionInicial implements OnInit {
  readonly tabs = PROJECTS_TABS;
  readonly tiposEstructura = TIPOS_ESTRUCTURA;
  /** Meta PPC estándar del sistema (Fase A backend) — fija, ya no se edita ni se envía desde acá. */
  readonly metaPpcEstandar = 85;
  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;

  responsables: ResponsableBimWorkerDTO[] = [];

  config: PlaneamientoBimConfigDTO = {
    responsableId: null,
    metaPpc: null,
    torres: [],
    fases: [],
  };

  /** Torres en edición, con el estado transitorio del generador de niveles típicos. */
  torres: TorreEdicion[] = [];

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
          torres: data?.torres || [],
          fases: data?.fases || [],
        };
        this.torres = (this.config.torres || []).map((t) => this.derivarTorreEdicion(t));
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

  /** A partir del shape del GET, agrega el estado transitorio del generador de niveles típicos. */
  private derivarTorreEdicion(torre: TorreConfigDTO): TorreEdicion {
    return {
      ...torre,
      niveles: [...(torre.niveles || [])],
      mostrarNivelTipico: false,
      nivelTipicoForm: nuevoNivelTipicoForm(),
    };
  }

  // ── Gestión de Torres ────────────────────────────────────────
  addTorre(): void {
    this.torres.push({
      id: null,
      nombre: '',
      orden: this.torres.length + 1,
      cantidadSectoresSubestructura: null,
      cantidadSectoresSuperestructura: null,
      niveles: [],
      mostrarNivelTipico: false,
      nivelTipicoForm: nuevoNivelTipicoForm(),
    });
  }

  removeTorre(index: number): void {
    this.torres.splice(index, 1);
  }

  totalSectoresTorre(torre: TorreEdicion): number {
    return (torre.cantidadSectoresSubestructura || 0) + (torre.cantidadSectoresSuperestructura || 0);
  }

  // ── Gestión de Niveles ───────────────────────────────────────
  /**
   * Único punto de recálculo de `orden`: reasigna 1..N a TODOS los niveles de la torre según
   * su posición actual en el arreglo, sin importar si se originaron por "+ Agregar Nivel" o
   * por "Agregar Nivel Típico" — un solo contador correlativo por torre, no por origen.
   */
  private renumerarNiveles(torre: TorreEdicion): void {
    torre.niveles.forEach((n, idx) => (n.orden = idx + 1));
  }

  addNivel(torre: TorreEdicion): void {
    if (!torre.niveles) torre.niveles = [];
    torre.niveles.push({
      id: null,
      nombre: '',
      orden: torre.niveles.length + 1,
      tipoEstructura: null,
    });
    this.renumerarNiveles(torre);
  }

  removeNivel(torre: TorreEdicion, index: number): void {
    torre.niveles.splice(index, 1);
    this.renumerarNiveles(torre);
  }

  /**
   * Edición manual del campo Orden (punto 7 del diseño: queda editable a mano). Si el valor
   * ingresado colisiona con el de otro nivel, se resuelve reordenando el arreglo por el nuevo
   * valor (el nivel editado gana los empates, como si "se insertara" en esa posición) y luego
   * renumerando 1..N en cascada — decisión tomada por ser el comportamiento más simple y
   * predecible. Se dispara en `blur`, no en cada tecla, para no reordenar el DOM mientras el
   * usuario todavía está escribiendo un número de dos dígitos.
   */
  onOrdenManual(torre: TorreEdicion, nivel: NivelTorreDTO): void {
    const valor = Number(nivel.orden);
    nivel.orden = Number.isFinite(valor) && valor >= 1 ? Math.floor(valor) : 1;

    torre.niveles = [...torre.niveles].sort((a, b) => {
      const ordenA = a === nivel ? a.orden - 0.5 : a.orden;
      const ordenB = b === nivel ? b.orden - 0.5 : b.orden;
      return ordenA - ordenB;
    });
    this.renumerarNiveles(torre);
  }

  /** Sectores derivados del nivel, según su clasificación y el conteo definido en la torre. */
  sectoresDeNivel(torre: TorreEdicion, nivel: NivelTorreDTO): number {
    if (nivel.tipoEstructura === 'SUBESTRUCTURA') return torre.cantidadSectoresSubestructura || 0;
    if (nivel.tipoEstructura === 'SUPERESTRUCTURA') return torre.cantidadSectoresSuperestructura || 0;
    return 0;
  }

  // ── Niveles típicos (rango) ────────────────────────────────────
  toggleNivelTipico(torre: TorreEdicion): void {
    torre.mostrarNivelTipico = !torre.mostrarNivelTipico;
    if (torre.mostrarNivelTipico) {
      torre.nivelTipicoForm = nuevoNivelTipicoForm();
    }
  }

  confirmarNivelTipico(torre: TorreEdicion): void {
    const form = torre.nivelTipicoForm;
    const nombreBase = (form.nombreBase || '').trim();

    if (!nombreBase) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre base requerido',
        text: 'Ingrese un nombre base para los niveles típicos, por ejemplo "Piso".',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (form.desde == null || form.hasta == null || !Number.isInteger(form.desde) || !Number.isInteger(form.hasta)) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'Ingrese los números "desde" y "hasta" del rango de niveles típicos.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (form.desde > form.hasta) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'El número "desde" no puede ser mayor que el número "hasta".',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (!form.tipoEstructura) {
      Swal.fire({
        icon: 'warning',
        title: 'Clasificación requerida',
        text: 'Seleccione la clasificación (Subestructura o Superestructura) de los niveles típicos.',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }

    if (!torre.niveles) torre.niveles = [];
    for (let numero = form.desde; numero <= form.hasta; numero++) {
      torre.niveles.push({
        id: null,
        nombre: `${nombreBase} ${numero}`,
        orden: torre.niveles.length + 1,
        tipoEstructura: form.tipoEstructura,
      });
    }
    this.renumerarNiveles(torre);

    torre.mostrarNivelTipico = false;
    torre.nivelTipicoForm = nuevoNivelTipicoForm();
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

    // Validar nombres de torres + niveles duplicados
    for (let i = 0; i < this.torres.length; i++) {
      const t = this.torres[i];
      if (!t.nombre || !t.nombre.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Nombre de Torre requerido',
          text: `La torre #${i + 1} no tiene un nombre asignado.`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }

      // Niveles duplicados dentro de la misma torre
      const nombresNiveles = (t.niveles || []).map((n) => n.nombre.trim().toLowerCase()).filter((n) => n);
      const nivelDuplicado = nombresNiveles.find((n, idx) => nombresNiveles.indexOf(n) !== idx);
      if (nivelDuplicado) {
        Swal.fire({
          icon: 'warning',
          title: 'Nivel duplicado',
          text: `El nivel "${nivelDuplicado}" ya existe en la torre "${t.nombre}". Cada nivel debe tener un nombre único dentro de su torre.`,
          confirmButtonColor: '#1E3A5F',
        });
        return;
      }
    }

    this.savingConfig = true;
    this.saveError = null;
    this.cdr.detectChanges();

    const torresPayload: TorreUpdateDto[] = this.torres.map((t, idx) => ({
      id: t.id ?? null,
      nombre: t.nombre.trim(),
      orden: t.orden || (idx + 1),
      cantidadSectoresSubestructura: Number(t.cantidadSectoresSubestructura) || 0,
      cantidadSectoresSuperestructura: Number(t.cantidadSectoresSuperestructura) || 0,
      niveles: (t.niveles || []).map((n, nIdx) => ({
        id: n.id ?? null,
        nombre: n.nombre.trim(),
        orden: Number(n.orden) || (nIdx + 1),
        tipoEstructura: n.tipoEstructura || null,
      })),
    }));

    // Meta PPC ya no se envía: es un estándar fijo que administra el backend (Fase A).
    const payload = {
      responsableId: this.config.responsableId ? Number(this.config.responsableId) : null,
      torres: torresPayload,
      fases: (this.config.fases || []).map((f) => ({
        id: f.id,
        fechaInicio: f.fechaInicio || null,
        fechaFinMeta: f.fechaFinMeta || null,
      })),
    };

    this.bimService.saveConfiguracion(this.selectedProjectId, payload).subscribe({
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
            text: 'No se puede eliminar la torre, nivel o sector indicado porque cuenta con registros asociados en la Carga Diaria.',
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
