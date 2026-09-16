import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { MilestoneScheduleService } from '../../../core/services/milestoneSchedule.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { gantt } from 'dhtmlx-gantt';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { MilestoneGetDTO } from '../../../core/dtos/milestone/milestone.model';
import { MilestoneScheduleFiltersDTO } from '../../../core/dtos/milestone/milestone-schedule-filters.model';
import { ScheduleCreateDTO } from '../../../core/dtos/schedule/scheduleCreate.model';
import { FormsModule } from '@angular/forms';
import { ApiMessageDTO } from '../../../core/dtos/api/ApiMessage.model';
import { ScheduleFormData } from '../../../core/dtos/schedule/scheduleFormData.model';
import { MilestoneScheduleHistoryService } from '../../../core/services/milestoneScheduleHistory.service';
import { MilestoneScheduleHistoryGetDTO } from '../../../core/dtos/milestoneScheduleHistory/milestoneScheduleHistory.model';
import { MilestoneScheduleGetDTO } from '../../../core/dtos/milestoneSchedule/milestoneSchedule.model';
import { MilestoneScheduleCreateDTO } from '../../../core/dtos/milestoneSchedule/milestoneScheduleCreate.model';
import { MilestoneService } from '../../../core/services/milestone.service';
import { MilestoneScheduleHistoryCreateDTO } from '../../../core/dtos/milestoneScheduleHistory/milestoneScheduleHistoryCreate.model';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { MilestoneScheduleProjectsService } from './services/milestone-schedule-projects.service';
import { ProjectGetDTO } from '../../../core/dtos/project/project.model';
import { ProjectResidentService } from '../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../core/dtos/project/projectSimple.model';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { ProyectoService } from '../../configuracion/features/proyectos/services/proyecto.service';
import { ProjectDto } from '../../configuracion/features/proyectos/dtos/project.dto';
import { ProjectEditDto } from '../../configuracion/features/proyectos/dtos/project-edit.dto';
import { swalUdpSuccess } from '../../../shared/utils/sweetalert-udp';

import { MEJORA_CONTINUA_TABS } from '../shared/mejora-continua-tabs';
@Component({
  selector: 'app-milestone-schedule',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule, BaseModal, AbrilPageHeaderComponent],
  templateUrl: './milestone-schedule.html',
  styleUrl: './milestone-schedule.css',
})
export class MilestoneSchedule implements OnInit, AfterViewInit, OnDestroy {
  readonly Roles = Roles;
  readonly tabs = MEJORA_CONTINUA_TABS;
  anioActual = new Date().getFullYear();

  escalaGantt: 'dia' | 'semana' | 'mes' = 'semana';

  private readonly escalasGantt: Record<'dia' | 'semana' | 'mes', any[]> = {
    dia: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'day', step: 1, format: '%d %D' },
    ],
    semana: [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: 'Sem %W' },
      { unit: 'day', step: 1, format: '%d' },
    ],
    mes: [
      { unit: 'year', step: 1, format: '%Y' },
      { unit: 'month', step: 1, format: '%M' },
    ],
  };

  cambiarEscala(escala: 'dia' | 'semana' | 'mes'): void {
    this.escalaGantt = escala;
    this.aplicarEscala(escala);
  }

  private aplicarEscala(escala: 'dia' | 'semana' | 'mes'): void {
    gantt.config.scales = this.escalasGantt[escala] as any;
    if (this.ganttContainer) gantt.render();
  }

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader: boolean = false;
  showMilestoneSchedule: boolean = false;
  showEditButton: boolean = false;
  noMilestones: boolean = false;
  selectedProjectName: string = '';

  // Modal flags como getter/setter para sincronizar visibilidad de la línea "Hoy"
  private _showCreateModal = false;
  get showCreateModal() { return this._showCreateModal; }
  set showCreateModal(v: boolean) { this._showCreateModal = v; this.updateTodayLineVisibility(); }

  private _showMilestoneScheduleHistory = false;
  get showMilestoneScheduleHistory() { return this._showMilestoneScheduleHistory; }
  set showMilestoneScheduleHistory(v: boolean) { this._showMilestoneScheduleHistory = v; this.updateTodayLineVisibility(); }

  private _showDetailModal = false;
  get showDetailModal() { return this._showDetailModal; }
  set showDetailModal(v: boolean) { this._showDetailModal = v; this.updateTodayLineVisibility(); }

  private _showCreateMilestoneScheduleModal = false;
  get showCreateMilestoneScheduleModal() { return this._showCreateMilestoneScheduleModal; }
  set showCreateMilestoneScheduleModal(v: boolean) { this._showCreateMilestoneScheduleModal = v; this.updateTodayLineVisibility(); }

  private _showEditModal = false;
  get showEditModal() { return this._showEditModal; }
  set showEditModal(v: boolean) { this._showEditModal = v; this.updateTodayLineVisibility(); }

  // ── Editar característica del proyecto (levelDescription) ────────────────
  showEditProjectModal = false;
  editProjectLoading = false;
  editProjectSaving = false;
  editProjectFull: ProjectDto | null = null;
  editProjectLevelDescription = '';

  formdata: ScheduleFormData = {
    projects: [],
  };

  @ViewChild('ganttContainer', { static: false })
  ganttContainer?: ElementRef;

  filtersCreate: MilestoneScheduleFiltersDTO = {
    milestones: [],
  };

  milestoneOptions: [] = [];
  selectedTask: any;
  searchQuery: string = '';

  // ── Edición inline de un hito ya guardado (modal de detalle, PUT milestoneSchedule/{id}) ──
  editandoHitoDetalle = false;
  savingHitoDetalle = false;
  editHitoStartDate = '';
  editHitoEndDate: string | null = null;
  projectImages: Record<number, string> = {};

  private mouseDownOnBackdrop = false;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  schedules: ProjectGetDTO[] = [];
  /** true si `schedules` viene de ProjectResident (RESIDENTE no-admin, sin paginación/búsqueda de servidor). */
  residenteScopedProjects = false;
  milestoneScheduleHistoryTableData: MilestoneScheduleHistoryGetDTO[] = [];
  milestoneScheduleTableData: MilestoneScheduleGetDTO[] = [];

  createDto: ScheduleCreateDTO = {
    scheduleDescription: '',
    projectId: 0,
    active: true,
  };
  addMilestoneScheduleItem = {
    milestoneId: 0,
    milestoneDescription: '',
    plannedStartDate: '',
    plannedEndDate: null as string | null,
  };

  filtersScheduleId = {
    projectId: null as number | null,
  };
  filtersMilestoneScheduleHistoryId = {
    milestoneScheduleHistoryId: null as number | null,
  };
  milestones: MilestoneGetDTO[] = [];
  milestoneScheduleHistoryCreateDTO: MilestoneScheduleHistoryCreateDTO = {
    projectId: 0,
    milestoneSchedules: [],
    forceSave: false,
  };
  ganttTasks: any[] = [];
  undatedTasks: any[] = [];
  editMilestoneScheduleItem = {
    id: 0,
    milestoneId: 0,
    text: '',
    plannedStartDate: '',
    plannedEndDate: '' as string | null,
  };

  get kpis() {
    let total = 0, culminados = 0, enProceso = 0, criticos = 0;
    this.ganttTasks.forEach((task: any) => {
      total++;
      if (this.getEstado(task) === 'CULMINADO') culminados++;
      else enProceso++;
      if (task['esHitoCritico']) criticos++;
    });
    return { total, culminados, enProceso, criticos };
  }

  // ── Plantilla de hitos (noMilestones view) ────────────────────────────────
  busqueda = '';
  filtroActivo: 'todos' | 'sin-fecha' | 'con-fecha' = 'todos';

  tieneFecha(hito: any): boolean {
    return !!(hito.startDate || hito.endDate);
  }

  /**
   * "Crítico" es solo una etiqueta: marca que la fecha única de este hito es un corte real de
   * etapa constructiva (para segmentar consumo/dotación por fase). No encadena ni deriva ninguna
   * otra fecha — el backend (AsignarHitosPorFechaAsync) ordena los críticos por su propia fecha,
   * así que cada hito guarda siempre SU fecha real, nunca la de otro. Encadenar "Inicio = Fin del
   * anterior" quedó descartado: en obras reales hay frentes de trabajo en paralelo (ej. la
   * superestructura arranca antes de que termine la cimentación en otra zona), y forzar una sola
   * secuencia producía fechas incorrectas.
   */
  toggleCritico(hito: any): void {
    hito.esCritico = !hito.esCritico;
    if (hito.esCritico) hito.esRango = false;
    this.sincronizarDTODesdeUndatedTasks();
  }

  /** Rango independiente: para eventos de 2+ días que no dependen de ningún otro hito (ej. montaje de grúa). */
  toggleRango(hito: any): void {
    hito.esRango = !hito.esRango;
    if (hito.esRango) hito.esCritico = false;
    if (!hito.esRango) { hito.endDate = ''; hito.end_date = null; }
    this.sincronizarDTODesdeUndatedTasks();
  }

  /** Agrega un hito personalizado (ej. una 2da/3ra grúa) que no existe en el catálogo global de hitos. */
  agregarHitoPersonalizado(): void {
    const descripcion = (this.nuevoHitoPersonalizadoTexto || '').trim();
    if (!descripcion) return;
    this.undatedTasks.push({
      id: `custom-${Date.now()}`,
      milestoneId: null,
      customDescription: descripcion,
      esCritico: false,
      esRango: false,
      esObligatorio: false,
      esPuntual: false,
      text: descripcion,
      order: this.undatedTasks.length + 1,
      start_date: null,
      end_date: null,
      type: 'milestone',
      duration: 0,
      startDate: '',
      endDate: '',
    });
    this.nuevoHitoPersonalizadoTexto = '';
    this.sincronizarDTODesdeUndatedTasks();
    this.cdr.detectChanges();
  }

  eliminarHitoPlantilla(hito: any): void {
    Swal.fire({
      title: '¿Quitar este hito del cronograma?',
      text: hito.text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.undatedTasks = this.undatedTasks.filter((t: any) => t !== hito);
      this.undatedTasks.forEach((t: any, i: number) => (t.order = i + 1));
      this.sincronizarDTODesdeUndatedTasks();
      this.cdr.detectChanges();
    });
  }

  nuevoHitoPersonalizadoTexto = '';

  get hitosFiltrados(): any[] {
    let result = this.undatedTasks;
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      result = result.filter((t: any) => t.text.toLowerCase().includes(q));
    }
    if (this.filtroActivo === 'con-fecha') result = result.filter((t: any) =>  this.tieneFecha(t));
    if (this.filtroActivo === 'sin-fecha') result = result.filter((t: any) => !this.tieneFecha(t));
    return result;
  }

  get statConFecha(): number { return this.undatedTasks.filter((t: any) => this.tieneFecha(t)).length; }
  get statSinFecha(): number { return this.undatedTasks.length - this.statConFecha; }
  get pctConFecha(): number {
    return this.undatedTasks.length ? Math.round(this.statConFecha / this.undatedTasks.length * 100) : 0;
  }

  onFechaChange(hito: any): void {
    const startClean = hito.startDate?.substring(0, 10) || null;
    const endClean   = hito.endDate?.substring(0, 10)   || null;
    hito.startDate  = startClean ?? '';
    hito.endDate    = endClean   ?? '';
    hito.start_date = startClean ? this.parseStringToDate(startClean) : null;
    hito.end_date   = endClean   ? this.parseStringToDate(endClean)   : null;

    this.sincronizarDTODesdeUndatedTasks();
  }

  /**
   * Aplica el nuevo valor de un campo de fecha del hito, salvo que sea obligatorio y este
   * cambio lo deje sin ninguna fecha: ahí se confirma primero con SweetAlert2. Si cancela, no
   * se toca `hito[campo]` — el input usa binding unidireccional ([ngModel]), así que vuelve
   * solo a mostrar el valor anterior en el siguiente ciclo de detección de cambios.
   */
  private aplicarCambioFecha(hito: any, campo: 'startDate' | 'endDate', valor: string): void {
    const quedariaConFecha = campo === 'startDate' ? !!(valor || hito.endDate) : !!(hito.startDate || valor);

    if (hito.esObligatorio && this.tieneFecha(hito) && !quedariaConFecha) {
      Swal.fire({
        icon: 'warning',
        title: 'Hito obligatorio',
        html: `<b>${hito.text}</b> es un hito obligatorio y no puede quedar sin fecha. ¿Confirmas dejarlo sin fecha de todas formas?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, dejar sin fecha',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#D97706',
      }).then((result) => {
        if (!result.isConfirmed) return;
        hito[campo] = valor;
        this.onFechaChange(hito);
      });
      return;
    }

    hito[campo] = valor;
    this.onFechaChange(hito);
  }

  onInicioChange(hito: any, valor: string): void {
    this.aplicarCambioFecha(hito, 'startDate', valor);
  }

  /** También atiende el input "Fin", que es el campo activo por defecto para todo hito salvo "Inicio de obra". */
  onFinChange(hito: any, valor: string): void {
    this.aplicarCambioFecha(hito, 'endDate', valor);
  }

  /** Hitos obligatorios sin ninguna fecha cargada — bloquean el guardado de la plantilla. */
  private hitosObligatoriosSinFecha(): any[] {
    return this.undatedTasks.filter((t: any) => t.esObligatorio && !this.tieneFecha(t));
  }

  /**
   * "Inicio de obra" es el único hito obligatorio/puntual cuya fecha única va en
   * plannedStartDate en vez de plannedEndDate — conceptualmente es un inicio, no un fin.
   * Detectado por descripción (igual que el backend: MilestoneScheduleService.BuildFakeSchedule
   * y MilestoneScheduleHistoryRepository.ValidarHitosObligatoriosAsync usan el mismo match).
   */
  esInicioDeObra(hito: any): boolean {
    return hito.text === 'Inicio de obra';
  }

  /** Reconstruye el DTO de guardado completo a partir de undatedTasks (fuente de verdad de la plantilla). */
  private sincronizarDTODesdeUndatedTasks(): void {
    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = this.undatedTasks.map((t: any, i: number) => {
      const startClean = t.startDate?.substring(0, 10) || '';
      const finClean = t.endDate?.substring(0, 10) || '';

      let plannedStartDate: string;
      let plannedEndDate: string | null;

      if (this.esInicioDeObra(t)) {
        // Excepción: la fecha única va en plannedStartDate, plannedEndDate va null salvo que
        // se haya tildado "rango" para convertirlo en un rango real inicio→fin.
        plannedStartDate = startClean;
        plannedEndDate = t.esRango ? finClean || null : null;
      } else if (t.esRango) {
        // Rango real inicio→fin: ambas fechas se guardan tal cual.
        plannedStartDate = startClean;
        plannedEndDate = finClean || null;
      } else {
        // Default (todo hito salvo "Inicio de obra"): la fecha real es plannedEndDate (Fin).
        // plannedStartDate no admite null en el DTO ni sobrevive el filtro de buildSavePayload()
        // si queda vacío, así que se espeja el mismo valor ahí.
        plannedStartDate = finClean;
        plannedEndDate = finClean || null;
      }

      return {
        milestoneId: t.milestoneId,
        customDescription: t.milestoneId == null ? t.customDescription : undefined,
        plannedStartDate,
        plannedEndDate,
        order: i + 1,
        esHitoCritico: !!t.esCritico,
      };
    });
  }

  getEstado(task: any): string {
    return task['fechaRealFin'] != null ? 'CULMINADO' : 'EN_PROCESO';
  }

  getEstadoClass(estado: string): string {
    return estado === 'CULMINADO' ? 'estado-culminado' : 'estado-en-proceso';
  }

  getEstadoLabel(estado: string): string {
    return estado === 'CULMINADO' ? 'Culminado' : 'En proceso';
  }

  getGanttClass(task: any): string {
    const base = task.type === 'milestone' ? 'custom-milestone' : 'custom-task';
    return this.getEstado(task) === 'CULMINADO'
      ? `${base} ms-culminado`
      : `${base} ms-en-proceso`;
  }

  /** RESIDENTE (su propio proyecto) o ADMINISTRADOR DE RESIDENTES (cualquier proyecto). */
  get puedeEditarCronograma(): boolean {
    return this.authService.hasRole(Roles.RESIDENTE) || this.authService.hasRole(Roles.ADMINISTRADOR_RESIDENTES);
  }

  /**
   * Editar un hito ya guardado (PUT milestoneSchedule/{id}) es más restrictivo que el resto del
   * cronograma: el backend lo protege con [Authorize(Roles=AdministradorResidentes)] puro (sin
   * RESIDENTE), mismo alcance que eliminarVersionCronograma. No usar puedeEditarCronograma acá —
   * mostraría el botón a un RESIDENTE que siempre recibiría 403 al guardar.
   */
  get puedeEditarHitoGuardado(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_RESIDENTES);
  }

  /**
   * Qué campo de fecha mostrar/editar en el modal de detalle de un hito YA GUARDADO: depende de
   * DÓNDE ESTÁ EL DATO (realPlannedStartDate/realPlannedEndDate), no del flag esPuntual — a
   * diferencia de la plantilla (donde no hay dato todavía y esPuntual sí decide el default).
   * Confirmado con datos reales de producción: los hitos puntuales históricos (de antes de que
   * existiera esta convención) siempre tienen la fecha real en Inicio, nunca en Fin; los hitos
   * nuevos creados desde la plantilla actual sí pueden tenerla solo en Fin.
   * - Solo Inicio con valor → Inicio (caso histórico, incluye "Inicio de obra").
   * - Solo Fin con valor → Fin (hitos nuevos de plantilla ya guardados).
   * - Ambas con valor → las dos (rango real, o legacy con las dos cargadas) — sin cambios.
   * - Ninguna (no debería ocurrir en un hito ya guardado) → se comporta como el primer caso.
   */
  get hitoDetalleMuestraInicio(): boolean {
    return !!this.selectedTask?.realPlannedStartDate || !this.selectedTask?.realPlannedEndDate;
  }

  get hitoDetalleMuestraFin(): boolean {
    return !!this.selectedTask?.realPlannedEndDate;
  }

  get projectsFiltered(): ProjectGetDTO[] {
    if (!this.residenteScopedProjects) return this.schedules;
    const search = this.searchQuery.trim().toLowerCase();
    if (!search) return this.schedules;
    return this.schedules.filter((p) => p.projectDescription.toLowerCase().includes(search));
  }

  getProjectColor(name: string): string {
    const colors = ['#4f46e5', '#0891b2', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0284c7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  onProjectImageChange(projectId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.milestoneScheduleProjectsService.uploadProjectFoto(projectId, file).subscribe({
      next: (res) => {
        this.projectImages[projectId] = res.fotoUrl;
        this.cdr.detectChanges();
      },
      error: (err) => this.error(err),
    });
  }

  /**
   * El PUT /api/v1/project sobreescribe el DTO completo — por eso se lee el proyecto
   * completo (ProjectDto, con todos los campos de ProjectEditDto) antes de abrir el modal,
   * en vez de mandar solo levelDescription. La tarjeta del listado (ProjectGetDTO) no trae
   * esos campos, así que hace falta esta llamada aparte pese a la regla de 1 HTTP por acción.
   */
  openEditProject(item: ProjectGetDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.editProjectFull = null;
    this.editProjectLevelDescription = '';
    this.editProjectLoading = true;
    this.showEditProjectModal = true;
    this.cdr.detectChanges();

    this.proyectoService
      .getPaged({ page: 1, ruc: '', razonSocial: '', projectDescription: item.projectDescription })
      .subscribe({
        next: (response) => {
          const full = response.data.find((p) => p.projectId === item.projectId) ?? null;
          if (!full) {
            this.showEditProjectModal = false;
            this.editProjectLoading = false;
            this.cdr.detectChanges();
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la información del proyecto.' });
            return;
          }
          this.editProjectFull = full;
          this.editProjectLevelDescription = full.levelDescription ?? '';
          this.editProjectLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.showEditProjectModal = false;
          this.error(err);
        },
      });
  }

  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.editProjectFull = null;
    this.editProjectLevelDescription = '';
  }

  saveEditProjectLevelDescription(): void {
    const full = this.editProjectFull;
    if (!full || this.editProjectSaving) return;

    this.editProjectSaving = true;
    const dto: ProjectEditDto = {
      ...full,
      levelDescription: this.editProjectLevelDescription.trim() || undefined,
    };

    this.proyectoService.edit(dto).subscribe({
      next: () => {
        const target = this.schedules.find((p) => p.projectId === full.projectId);
        if (target) target.levelDescription = dto.levelDescription;
        this.editProjectSaving = false;
        this.closeEditProjectModal();
        this.cdr.detectChanges();
        swalUdpSuccess('Característica actualizada exitosamente');
      },
      error: (err: HttpErrorResponse) => {
        this.editProjectSaving = false;
        this.error(err);
      },
    });
  }

  constructor(
    private milestoneScheduleService: MilestoneScheduleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private milestoneScheduleProjectsService: MilestoneScheduleProjectsService,
    private projectResidentService: ProjectResidentService,
    private scheduleService: ScheduleService,
    private milestoneScheduleHistoryService: MilestoneScheduleHistoryService,
    private milestoneService: MilestoneService,
    public authService: AuthService,
    private proyectoService: ProyectoService,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(page: number = 1, search?: string): void {
    // RESIDENTE (no ADMINISTRADOR DE RESIDENTES) solo ve los proyectos donde está asignado como
    // residente — evita elegir un proyecto ajeno para luego chocar con el 403 al guardar/editar.
    if (this.authService.hasRole(Roles.RESIDENTE) && !this.authService.hasRole(Roles.ADMINISTRADOR_RESIDENTES)) {
      this.loadResidenteScopedSchedules();
      return;
    }
    this.residenteScopedProjects = false;
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleProjectsService.getProjectPagedWithResidents(page, search, 12).subscribe({
      next: (response) => {
        this.schedules = response.data ?? [];
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
        this.schedules.forEach((p) => {
          if (p.fotoUrl) this.projectImages[p.projectId] = p.fotoUrl;
        });
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  /** Lista completa (sin paginación de servidor) de los proyectos donde el usuario es residente. */
  private loadResidenteScopedSchedules(): void {
    this.residenteScopedProjects = true;
    this.loader = true;
    this.cdr.detectChanges();
    this.projectResidentService.getWithResidentByUserId().subscribe({
      next: (projects) => {
        this.schedules = projects.map((p) => this.toProjectGetDTO(p));
        this.currentPage = 1;
        this.totalPages = 1;
        this.pageSize = this.schedules.length;
        this.totalRecords = this.schedules.length;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.error(err),
    });
  }

  private toProjectGetDTO(p: ProjectSimpleDTO): ProjectGetDTO {
    return {
      projectId: p.projectId,
      projectDescription: p.projectDescription,
      residentFullNames: [],
      createdDateTime: '',
      createdUserId: 0,
      active: true,
    };
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadSchedules(1, this.searchQuery || undefined), 400);
  }

  /** Navega directamente al Gantt del proyecto seleccionado */
  openProjectGantt(projectId: number, projectDescription: string): void {
    this.selectedProjectName = projectDescription;
    this.filtersScheduleId.projectId = projectId;
    this.milestoneScheduleHistoryCreateDTO.projectId = projectId;
    this.loader = true;
    this.cdr.detectChanges();

    this.milestoneScheduleHistoryService
      .getAllMilestoneScheduleHistory({ projectId })
      .subscribe({
        next: (history) => {
          this.milestoneScheduleHistoryTableData = history;
          this.openCreateMilestoneSchedule();
        },
        error: (err: HttpErrorResponse) => this.error(err),
      });
  }

  backToList(): void {
    this.showMilestoneSchedule = false;
    this.showEditButton = false;
    this.noMilestones = false;
    this.selectedProjectName = '';
    this.milestoneScheduleHistoryTableData = [];
    this.ganttTasks = [];
    this.undatedTasks = [];
    this.destroyGantt();
    this.cdr.detectChanges();
  }

  openMilestoneScheduleHistory(scheduleId: number, projectDescription?: string) {
    if (projectDescription) this.selectedProjectName = projectDescription;
    this.showMilestoneScheduleHistory = true;
    this.loader = true;
    this.cdr.detectChanges();
    this.filtersScheduleId.projectId = scheduleId;
    this.milestoneScheduleHistoryCreateDTO.projectId = scheduleId;
    this.milestoneScheduleHistoryService
      .getAllMilestoneScheduleHistory(this.filtersScheduleId)
      .subscribe({
        next: (response) => {
          this.milestoneScheduleHistoryTableData = response;
          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  /**
   * Solo ADMINISTRADOR DE RESIDENTES: elimina una versión completa de cronograma (con sus hitos).
   * El endpoint está protegido con [Authorize(Roles=...)] puro, sin AbrilException — un 403 por
   * rol insuficiente no trae body JSON, a diferencia de los demás endpoints del feature. El
   * manejador genérico `error()` ya cubre este caso (título "Sin permiso" + mensaje default).
   */
  eliminarVersionCronograma(item: MilestoneScheduleHistoryGetDTO): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar esta versión de cronograma?',
      text: 'Se eliminará junto con todos sus hitos. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loader = true;
      this.cdr.detectChanges();
      this.milestoneScheduleHistoryService
        .deleteMilestoneScheduleHistory(item.milestoneScheduleHistoryId)
        .subscribe({
          next: (response) => {
            this.loader = false;
            Swal.fire({ title: response.message ?? 'Cronograma eliminado.', icon: 'success', draggable: true });
            this.openMilestoneScheduleHistory(this.filtersScheduleId.projectId!, this.selectedProjectName);
          },
          error: (err: HttpErrorResponse) => this.error(err),
        });
    });
  }

  // si se obtiene '2026-11-11' se obtendrá un Date que actúe como 11 de noviembre de 2026
  private parseStringToDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return null;

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  // devuelve en formato "yyyy-mm-dd"
  private parseDateToString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  openViewMilestoneSchedule(milestoneScheduleHistoryId: number) {
    this.loader = true;
    this.showEditButton = false;
    this.cdr.detectChanges();
    this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId = milestoneScheduleHistoryId;
    this.milestoneScheduleService
      .getByMilestoneScheduleHistoryId(this.filtersMilestoneScheduleHistoryId)
      .pipe(
        map((items) => {
          // Un hito sin NINGUNA fecha (ej. "2da instalación de bandera" aún sin coordinar) no se
          // puede dibujar en el Gantt — se omite acá. Antes exigía específicamente
          // plannedStartDate, lo que dejaba afuera (sin ni siquiera aparecer en el Gantt) a los
          // hitos cuya única fecha real vive en plannedEndDate — ver anchorDate() más abajo.
          const activos = items.filter((m) => m.active && (!!m.plannedStartDate || !!m.plannedEndDate));

          // Fecha "ancla" de un hito: la que tiene valor. Confirmado contra datos reales de
          // producción que esto puede estar en cualquiera de los dos campos según cuándo/cómo se
          // creó el hito (ver hitoDetalleMuestraInicio/Fin) — plannedStartDate ya no es siempre
          // la fuente de verdad como asumía este código antes.
          const anchorDate = (m: MilestoneScheduleGetDTO): string => m.plannedStartDate || m.plannedEndDate;

          // Solo para VISUALIZAR duración de fase en el Gantt: a los críticos se les deriva un
          // "inicio visual" = fecha ancla del crítico cronológicamente anterior (NO por orden de
          // ítem, que no es cronológico). Esto no se guarda ni se envía al backend — la fecha real
          // de cada hito (usada para repartir consumo/personal por fase) sigue siendo la propia.
          const criticosOrdenados = activos
            .filter((m) => m.esHitoCritico)
            .slice()
            .sort((a, b) => (anchorDate(a) < anchorDate(b) ? -1 : anchorDate(a) > anchorDate(b) ? 1 : 0));
          const inicioVisualPorHito = new Map<number, string>();
          criticosOrdenados.forEach((m, i) => {
            inicioVisualPorHito.set(m.milestoneScheduleId, i === 0 ? anchorDate(m) : anchorDate(criticosOrdenados[i - 1]));
          });

          return activos.map((m) => {
            const propia = anchorDate(m);
            const inicioVisual = inicioVisualPorHito.get(m.milestoneScheduleId);
            const esBarraCritica = m.esHitoCritico && !!inicioVisual && inicioVisual !== propia;
            // Rango real: ambas fechas presentes y distintas. Antes solo chequeaba
            // plannedEndDate !== plannedStartDate, lo que confundía un hito "solo Fin" (Inicio
            // vacío) con un rango real — acá exige que las DOS tengan valor.
            const esRangoReal = !!m.plannedStartDate && !!m.plannedEndDate && m.plannedEndDate !== m.plannedStartDate;

            return {
              id: m.milestoneScheduleId,
              milestoneScheduleId: m.milestoneScheduleId,
              milestoneId: m.milestoneId,
              order: m.order,
              esHitoCritico: m.esHitoCritico,
              esObligatorio: m.esObligatorio,
              text: m.milestoneDescription,
              // Fechas reales, tal cual llegan del backend (sin el ajuste visual de "inicio
              // visual" para barras críticas de más abajo) — son las que decide qué campo mostrar
              // en el modal de detalle (hitoDetalleMuestraInicio/Fin) y las que se editan/envían
              // al PUT. start_date/end_date (abajo) pueden no coincidir cuando esBarraCritica.
              realPlannedStartDate: m.plannedStartDate,
              realPlannedEndDate: m.plannedEndDate,
              start_date: this.parseStringToDate(esBarraCritica ? inicioVisual! : propia),
              ...(esBarraCritica
                ? { end_date: this.parseStringToDate(propia) }
                : (esRangoReal
                    ? { end_date: this.parseStringToDate(m.plannedEndDate) }
                    : { type: 'milestone', duration: 0, end_date: this.parseStringToDate(propia) })),
            };
          });
        }),
      )
      .subscribe({
        next: (data) => {
          this.noMilestones = data.length === 0;
          this.showMilestoneScheduleHistory = false;
          this.showMilestoneSchedule = true;
          this.cdr.detectChanges();

          try {
            if (!this.noMilestones) {
              this.initGantt(true);
              gantt.parse({ data, links: [] });
              gantt.showDate(new Date());
              this.ganttTasks = gantt.getTaskByTime();
              setTimeout(() => this.drawTodayLine(), 50);
            }
          } catch (e) {
            console.error('Error dibujando el cronograma en el Gantt:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo dibujar el cronograma. Revisa que las fechas de los hitos sean válidas.' });
          }

          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error(err);
        },
      });
  }

  openCreateMilestoneSchedule() {
    this.loader = true;
    this.cdr.detectChanges();
    if (this.milestoneScheduleHistoryTableData.length > 0) {
      this.filtersMilestoneScheduleHistoryId.milestoneScheduleHistoryId =
        this.milestoneScheduleHistoryTableData[0].milestoneScheduleHistoryId;
      this.milestoneScheduleService
        .getByMilestoneScheduleHistoryId(this.filtersMilestoneScheduleHistoryId)
        .pipe(
          map((items) =>
            items
              // Un hito sin fecha (ej. pendiente de coordinar) no se puede dibujar en el Gantt;
              // se omite aquí — sigue existiendo en BD, se puede re-agregar cuando tenga fecha.
              .filter((m) => m.active && !!m.plannedStartDate)
              .map((m) => ({
                // id único para el Gantt: si es personalizado (milestoneId null) se usa el milestoneScheduleId real
                id: m.milestoneId ?? m.milestoneScheduleId,
                milestoneId: m.milestoneId,
                customDescription: m.milestoneId == null ? m.milestoneDescription : undefined,
                esHitoCritico: m.esHitoCritico,
                text: m.milestoneDescription,
                start_date: this.parseStringToDate(m.plannedStartDate),
                order: m.order,
                ...(m.plannedEndDate && m.plannedEndDate !== m.plannedStartDate
                  ? { end_date: this.parseStringToDate(m.plannedEndDate) }
                  : { type: 'milestone', duration: 0, end_date: this.parseStringToDate(m.plannedStartDate) }),
              })),
          ),
        )
        .subscribe({
          next: (data) => {
            this.noMilestones = data.length === 0;
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.milestoneScheduleHistoryCreateDTO.milestoneSchedules = [];

            data.forEach((task: any) => {
              if (task.type === 'milestone') task.end_date = null;
              this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
                milestoneId: task.milestoneId,
                customDescription: task.customDescription,
                plannedStartDate: this.parseDateToString(task.start_date),
                plannedEndDate:
                  task.end_date != null ? this.parseDateToString(task.end_date) : null,
                order: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1,
                esHitoCritico: !!task.esHitoCritico,
              });
            });
            this.milestoneScheduleHistoryCreateDTO.projectId =
              this.filtersScheduleId.projectId ?? 0;
            this.cdr.detectChanges();

            try {
              if (!this.noMilestones) {
                this.initGantt(false);
                gantt.parse({ data, links: [] });
                gantt.showDate(new Date());
                this.ganttTasks = gantt.getTaskByTime();
                setTimeout(() => this.drawTodayLine(), 50);
              }
            } catch (e) {
              console.error('Error dibujando el cronograma en el Gantt:', e);
              Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo dibujar el cronograma. Revisa que las fechas de los hitos sean válidas.' });
            }

            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
    } else {
      this.milestoneScheduleService
        .getFakeData()
        .pipe(
          map((items) =>
            items.map((m) => ({
              id: m.milestoneId,
              milestoneId: m.milestoneId as number | null,
              customDescription: undefined as string | undefined,
              esCritico: false,
              esRango: false,
              esObligatorio: m.esObligatorio,
              esPuntual: m.esPuntual,
              text: m.milestoneDescription,
              order: m.order,
              start_date: null as Date | null,
              end_date: null as Date | null,
              type: 'milestone',
              duration: 0,
              startDate: '' as string,
              endDate: '' as string,
            })),
          ),
        )
        .subscribe({
          next: (data) => {
            // Todas las tareas de la plantilla vienen sin fecha — se gestionan fuera del Gantt
            this.undatedTasks = data;
            this.noMilestones = true;
            this.showMilestoneScheduleHistory = false;
            this.showMilestoneSchedule = true;

            this.sincronizarDTODesdeUndatedTasks();
            this.milestoneScheduleHistoryCreateDTO.projectId =
              this.filtersScheduleId.projectId ?? 0;

            this.loader = false;
            this.showEditButton = true;
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
    }
  }

  editUndatedTask(task: any): void {
    this.editMilestoneScheduleItem = {
      id: task.milestoneId,
      milestoneId: task.milestoneId,
      text: task.text,
      plannedStartDate: task.startDate ?? '',
      plannedEndDate: task.endDate ?? null,
    };
    this.showEditModal = true;
  }

  openCreateMilestoneScheduleModal() {
    this.loader = true;
    this.cdr.detectChanges();
    this.showCreateMilestoneScheduleModal = true;
    this.milestoneService.getAllMilestone().subscribe({
      next: (response) => {
        this.milestones = response;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  get addMilestoneFormValid(): boolean {
    return this.addMilestoneScheduleItem.milestoneId > 0 && !!this.addMilestoneScheduleItem.plannedStartDate;
  }

  addMilestoneSchedule() {
    const milestoneId = this.addMilestoneScheduleItem.milestoneId;

    if (!this.noMilestones) {
      const exists = gantt.getTaskByTime().some((task: any) => task.milestoneId === milestoneId);

      if (exists) {
        Swal.fire({
          icon: 'warning',
          title: 'Hito duplicado',
          text: 'Este hito ya fue agregado al cronograma.',
        });
        return;
      }
    }

    const selectedMilestone = this.milestones.find((m) => m.milestoneId === milestoneId);
    const text = selectedMilestone?.milestoneDescription ?? 'Hito';
    const startDate = this.parseStringToDate(this.addMilestoneScheduleItem.plannedStartDate);
    const endDate = !this.addMilestoneScheduleItem.plannedEndDate
      ? null
      : this.parseStringToDate(this.addMilestoneScheduleItem.plannedEndDate);
    const newOrder = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.length + 1;

    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.push({
      milestoneId,
      plannedStartDate: this.addMilestoneScheduleItem.plannedStartDate,
      plannedEndDate: endDate ? this.addMilestoneScheduleItem.plannedEndDate : null,
      order: newOrder,
      esHitoCritico: false,
    });

    const taskData = {
      id: milestoneId,
      text,
      milestoneId,
      start_date: startDate,
      end_date: endDate ?? startDate,
      type: endDate ? undefined : 'milestone',
      duration: endDate ? null : 0,
      order: newOrder,
    };

    if (this.noMilestones) {
      this.noMilestones = false;
      this.cdr.detectChanges();
      this.initGantt(false);
      gantt.parse({ data: [taskData], links: [] });
      gantt.showDate(new Date());
    } else {
      gantt.addTask(taskData);
      gantt.render();
    }

    this.ganttTasks = gantt.getTaskByTime();

    this.addMilestoneScheduleItem = {
      milestoneId: 0,
      milestoneDescription: '',
      plannedStartDate: '',
      plannedEndDate: null,
    };

    this.showCreateMilestoneScheduleModal = false;
    this.cdr.detectChanges();
  }

  private promoteUndatedTasksToGantt(): void {
    const safeDate = (d: any): Date =>
      d instanceof Date && !isNaN(d.getTime()) ? d : new Date();

    const ganttData = this.undatedTasks.map((t) => {
      const hasDate = t.start_date instanceof Date && !isNaN(t.start_date.getTime());
      const startDate = safeDate(t.start_date);
      const endDate = t.end_date instanceof Date && !isNaN(t.end_date.getTime()) ? t.end_date : null;
      return {
        id: t.id,
        text: t.text,
        milestoneId: t.milestoneId,
        start_date: startDate,
        end_date: endDate ?? startDate,
        type: endDate ? undefined : 'milestone',
        duration: endDate ? undefined : 0,
        ...(hasDate ? {} : { sinFecha: true }),
      };
    });

    this.undatedTasks = [];

    if (this.noMilestones) {
      // Transición desde la vista de plantilla: inicializar Gantt siempre
      this.noMilestones = false;
      this.cdr.detectChanges();
      this.initGantt(false);
      if (ganttData.length > 0) {
        gantt.parse({ data: ganttData, links: [] });
        gantt.showDate(new Date());
      }
    } else {
      // Ya estamos en el Gantt: solo agregar si hay tareas pendientes
      if (ganttData.length === 0) return;
      ganttData.forEach((taskData) => gantt.addTask(taskData));
      gantt.render();
    }

    this.ganttTasks = gantt.getTaskByTime();
    setTimeout(() => this.drawTodayLine(), 50);
    this.cdr.detectChanges();
  }

  private buildSavePayload(forceSave: boolean, confirmarHitosSinFecha: boolean = false) {
    return {
      ...this.milestoneScheduleHistoryCreateDTO,
      forceSave,
      confirmarHitosSinFecha,
      milestoneSchedules: this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.filter(
        (ms) => !!ms.plannedStartDate?.trim(),
      ),
    };
  }

  /** Prefijo del mensaje 400 que el backend usa cuando hay hitos sin plannedEndDate (no bloqueante, se puede confirmar). */
  private readonly MSG_HITOS_SIN_FECHA = 'Los siguientes hitos no tienen fecha registrada';

  /**
   * Único punto de POST a MilestoneScheduleHistory. `forceSave` y `confirmarHitosSinFecha` son
   * confirmaciones independientes entre sí (una es "el cronograma es igual al anterior", la otra
   * "hay hitos sin plannedEndDate") y pueden viajar juntas en el mismo reenvío. Si el backend
   * responde 400 con el mensaje de hitos sin fecha y todavía no se había confirmado, se muestra el
   * diálogo con el texto exacto del backend (ya trae los nombres) y, al confirmar, se reenvía el
   * mismo payload con confirmarHitosSinFecha:true preservando el forceSave original.
   */
  private submitMilestoneScheduleHistory(forceSave: boolean, confirmarHitosSinFecha: boolean = false) {
    this.loader = true;
    this.cdr.detectChanges();
    this.milestoneScheduleHistoryService
      .createMilestoneScheduleHistory(this.buildSavePayload(forceSave, confirmarHitosSinFecha))
      .subscribe({
        next: (response) => {
          Swal.fire({
            title: response.message ?? 'Cronograma creado exitosamente',
            icon: 'success',
            draggable: true,
          });
          this.loader = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          const message: string | undefined = err.error?.message;
          if (err.status === 400 && !confirmarHitosSinFecha && message?.startsWith(this.MSG_HITOS_SIN_FECHA)) {
            this.loader = false;
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'warning',
              title: 'Hitos sin fecha',
              text: message,
              showCancelButton: true,
              confirmButtonText: 'Sí, guardar de todas formas',
              cancelButtonText: 'Cancelar',
            }).then((result) => {
              if (!result.isConfirmed) return;
              this.submitMilestoneScheduleHistory(forceSave, true);
            });
            return;
          }
          this.error(err);
        },
      });
  }

  addMilestoneScheduleOnMilestoneScheduleHistory() {
    if (this.noMilestones && this.undatedTasks.length > 0) {
      const faltantes = this.hitosObligatoriosSinFecha();
      if (faltantes.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Faltan fechas obligatorias',
          html:
            'Los siguientes hitos son obligatorios y no pueden guardarse sin fecha:<br><br>' +
            faltantes.map((h) => `• ${h.text}`).join('<br>'),
        });
        return;
      }
      // Vista de plantilla: solo transicionar al Gantt, sin llamada al backend
      this.promoteUndatedTasksToGantt();
      return;
    }

    this.promoteUndatedTasksToGantt();
    this.submitMilestoneScheduleHistory(false);
  }

  forceAddMilestoneScheduleOnMilestoneScheduleHistory() {
    this.submitMilestoneScheduleHistory(true);
  }

  saveSchedule() {
    if (!this.createDto.scheduleDescription.trim()) {
      return;
    }
    this.loader = true;

    this.scheduleService.createSchedule(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { scheduleDescription: '', projectId: 0, active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadSchedules();
        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  ngAfterViewInit(): void {
    gantt.i18n.setLocale('es');

    gantt.attachEvent('onTaskClick', (id, e) => {
      const target = (e?.target as HTMLElement) || null;

      if (target?.closest('.delete-task')) {
        this.deleteTask(Number(id));
        return false;
      }

      if (target?.closest('.culminar-task')) {
        this.toggleCulminar(Number(id));
        return false;
      }

      if (target?.closest('.edit-task')) {
        this.editTask(Number(id));
        return false;
      }

      const task = gantt.getTask(id);
      this.openTaskDetail(task);
      return false;
    });

    gantt.attachEvent('onRowDragEnd', () => {
      const orderedIds: number[] = [];

      gantt.eachTask((task: any) => {
        orderedIds.push(task.id);
      });

      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.forEach((item) => {
        const newOrder = item.milestoneId != null ? orderedIds.indexOf(item.milestoneId) + 1 : 0;

        if (newOrder > 0) {
          item.order = newOrder;
        }
      });
    });
  }

  private initGantt(readonly: boolean) {
    if (!this.ganttContainer) return;

    this.destroyGantt();

    (gantt.config as any).csp = false;
    gantt.config.readonly = readonly;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config['drag_tree'] = !readonly;
    gantt.config.order_branch = true;
    gantt.config.show_links = false;
    gantt.config.row_height = 28;
    gantt.config.bar_height = 16;
    gantt.config['milestone_height'] = 16;
    gantt.config.scale_height = 44;

    const columns: any[] = [];

    columns.push(
      {
        name: 'text',
        label: 'Hito',
        tree: true,
        width: 220,
        min_width: 150,
        resize: true,
      },
      {
        name: 'start_date',
        label: 'Inicio',
        align: 'center',
        width: 90,
        min_width: 70,
        resize: true,
        template: (task: any) => gantt.date.date_to_str('%d-%m-%y')(task.start_date),
      },
      {
        name: 'end_date',
        label: 'Fin',
        align: 'center',
        width: 90,
        min_width: 70,
        resize: true,
        template: (task: any) => {
          if (task.type === 'milestone') return '-';
          if (!task.end_date) return '-';
          return gantt.date.date_to_str('%d-%m-%y')(task.end_date);
        },
      },
      {
        name: 'estado',
        label: 'Estado',
        align: 'center',
        width: 100,
        min_width: 70,
        resize: true,
        template: (task: any) => {
          const estado = this.getEstado(task);
          return `<span class="estado-badge ${this.getEstadoClass(estado)}">${this.getEstadoLabel(estado)}</span>`;
        },
      },
      {
        name: 'critico',
        label: 'Crítico',
        align: 'center',
        width: 70,
        min_width: 60,
        resize: true,
        template: (task: any) => {
          if (task['milestoneScheduleId'] == null) return '';
          if (!task['esHitoCritico']) return '';
          return `<span title="Corta etapa constructiva" style="display:inline-flex;color:#D97706">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.8 7.1-.7L12 2.5z"/>
            </svg>
          </span>`;
        },
      },
    );

    gantt.config.columns = columns;
    gantt.config.grid_width = 420;
    (gantt.config as any)['grid_resize'] = true;
    gantt.config.scroll_size = 20;
    gantt.config.min_column_width = 16;
    this.aplicarEscala(this.escalaGantt);

    gantt.templates.task_class = (_start: any, _end: any, task: any) => {
      const estadoClass = this.getGanttClass(task);
      const criticoClass = task['esHitoCritico'] ? ' hito-critico' : '';
      if (task.type === 'milestone') return `gantt_milestone ${estadoClass}${criticoClass}`;
      return `${estadoClass}${criticoClass}`;
    };
    gantt.templates.task_text = () => '';
    gantt.templates.tooltip_text = (start: any, end: any, task: any) => {
      const fmt = gantt.date.date_to_str('%d-%m-%Y');
      const inicio = start instanceof Date ? fmt(start) : '-';
      const fin = task.type === 'milestone' || !(end instanceof Date) ? '-' : fmt(end);
      return `<b>${task.text}</b><br/>Inicio: ${inicio}<br/>Fin: ${fin}`;
    };
    gantt.templates.task_end_date = (date: any) => {
      return date instanceof Date ? gantt.date.date_to_str('%d-%m-%y')(date) : '';
    };
    gantt.init(this.ganttContainer.nativeElement);
    if (typeof (gantt as any).addMarker === 'function') {
      (gantt as any).addMarker({ start_date: new Date(), css: 'today-line', text: 'Hoy' });
    }
  }

  deleteTask(taskId: number) {
    const task = gantt.getTask(taskId);

    Swal.fire({
      title: '¿Eliminar hito?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      gantt.deleteTask(taskId);

      this.milestoneScheduleHistoryCreateDTO.milestoneSchedules =
        this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.filter(
          (item) => item.milestoneId !== task['milestoneId'],
        );

      this.recalculateOrder();
      this.ganttTasks = gantt.getTaskByTime();
      this.cdr.detectChanges();
    });
  }

  editTask(taskId: number) {
    const task = gantt.getTask(taskId);
    const isMilestone = task.type === 'milestone' || !task.end_date || task.end_date === task.start_date;
    this.editMilestoneScheduleItem = {
      id: Number(task.id),
      milestoneId: task['milestoneId'],
      text: task.text,
      plannedStartDate: task.start_date ? this.parseDateToString(task.start_date) : '',
      plannedEndDate: isMilestone ? null : (task.end_date ? this.parseDateToString(task.end_date) : null),
    };
    this.showEditModal = true;
  }

  private recalculateOrder() {
    const orderedMilestoneIds: number[] = [];

    gantt.eachTask((task: any) => {
      orderedMilestoneIds.push(task.milestoneId);
    });

    this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.forEach((item) => {
      const newOrder = item.milestoneId != null ? orderedMilestoneIds.indexOf(item.milestoneId) + 1 : 0;
      if (newOrder > 0) item.order = newOrder;
    });
  }

  private drawTodayLine(): void {
    if (!this.ganttContainer) return;

    const existing = this.ganttContainer.nativeElement.querySelector('#today-line-custom');
    if (existing) existing.remove();

    const state = gantt.getState();
    const minDate: Date = state.min_date;
    const maxDate: Date = state.max_date;
    const today = new Date();

    if (!(minDate instanceof Date) || !(maxDate instanceof Date)) return;

    const totalMs = maxDate.getTime() - minDate.getTime();
    if (totalMs <= 0 || today < minDate || today > maxDate) return;

    const pct = (today.getTime() - minDate.getTime()) / totalMs;

    const taskArea = this.ganttContainer.nativeElement.querySelector('.gantt_data_area') as HTMLElement;
    if (!taskArea) return;

    const left = taskArea.scrollWidth * pct;

    taskArea.style.position = 'relative';
    taskArea.style.zIndex = '0';

    const line = document.createElement('div');
    line.id = 'today-line-custom';
    line.style.cssText = `position:absolute;left:${left}px;top:0;width:2px;height:9999px;background:#f59e0b;opacity:0.85;z-index:1;pointer-events:none;`;

    const label = document.createElement('span');
    label.textContent = 'Hoy';
    label.style.cssText = 'font-size:10px;color:#f59e0b;position:absolute;top:2px;left:4px;white-space:nowrap;';
    line.appendChild(label);

    taskArea.appendChild(line);
    this.updateTodayLineVisibility();
  }

  private updateTodayLineVisibility() {
    const line = document.getElementById('today-line-custom');
    if (!line) return;
    const anyModalOpen =
      this.showDetailModal ||
      this.showCreateModal ||
      this.showMilestoneScheduleHistory ||
      this.showCreateMilestoneScheduleModal ||
      this.showEditModal;
    line.style.display = anyModalOpen ? 'none' : 'block';
  }

  private destroyGantt() {
    gantt.clearAll();
    if (this.ganttContainer) {
      const line = this.ganttContainer.nativeElement.querySelector('#today-line-custom');
      if (line) line.remove();
    }
  }

  /**
   * En modo "ver cronograma" (milestoneScheduleId real) persiste de inmediato contra el backend
   * — mismo patrón que toggleCriticoGuardado, necesario para que el chequeo de permisos del PATCH
   * .../culminar (403 si no sos el residente asignado, o ADMINISTRADOR DE RESIDENTES) aplique. En
   * modo plantilla/creación (sin milestoneScheduleId todavía) sigue siendo solo local, a la espera
   * del guardado completo del cronograma.
   */
  toggleCulminar(taskId: number): void {
    const task = gantt.getTask(taskId);
    const nuevaFecha: string | null = task['fechaRealFin'] ? null : this.parseDateToString(new Date());

    if (task['milestoneScheduleId'] != null) {
      this.milestoneScheduleService.culminar(taskId, nuevaFecha).subscribe({
        next: () => this.aplicarCulminadoLocal(taskId, nuevaFecha),
        error: (err: HttpErrorResponse) => this.error(err),
      });
      return;
    }

    this.aplicarCulminadoLocal(taskId, nuevaFecha);
  }

  private aplicarCulminadoLocal(taskId: number, fechaRealFin: string | null): void {
    const task = gantt.getTask(taskId);
    task['fechaRealFin'] = fechaRealFin;
    if (!task.end_date || !(task.end_date instanceof Date)) {
      task.end_date = task.start_date;
      task.type = 'milestone';
      task.duration = 0;
    }
    gantt.updateTask(taskId);
    gantt.render();
    this.ganttTasks = gantt.getTaskByTime();
    if (this.selectedTask && this.selectedTask.id == taskId) {
      this.selectedTask['fechaRealFin'] = fechaRealFin;
    }
    this.cdr.detectChanges();

    const dtoItem = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.find(
      (x) => x.milestoneId == taskId,
    );
    if (dtoItem) {
      (dtoItem as any).fechaRealFin = fechaRealFin;
    }
  }

  /**
   * Marca/desmarca un hito ya guardado (milestoneScheduleId real) como crítico. Solo aplica en
   * modo "ver cronograma" — en modo edición/creación los ids del Gantt son milestoneId de
   * plantilla, sin milestoneScheduleId real todavía.
   */
  toggleCriticoGuardado(taskId: number): void {
    const task = gantt.getTask(taskId);
    const nuevoValor = !task['esHitoCritico'];

    this.milestoneScheduleService.marcarCritico(taskId, nuevoValor).subscribe({
      next: () => {
        task['esHitoCritico'] = nuevoValor;
        gantt.updateTask(taskId);
        gantt.render();
        this.ganttTasks = gantt.getTaskByTime();
        if (this.selectedTask && this.selectedTask.id == taskId) {
          this.selectedTask['esHitoCritico'] = nuevoValor;
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.error(err),
    });
  }

  /**
   * Mismo bloqueo duro que aplica el backend en MilestoneScheduleRepository.EditAsync: un hito
   * esObligatorio (salvo "Inicio de obra") no puede quedar sin Fecha Fin. Sin opción de confirmar
   * "de todas formas" — a diferencia del guardado de plantilla, acá el backend nunca lo aceptaría.
   */
  private hitoObligatorioSinFechaFin(hito: any, plannedEndDate: string | null): boolean {
    return !!hito.esObligatorio && !this.esInicioDeObra(hito) && !plannedEndDate;
  }

  /** Habilita los inputs de Fecha inicio/fin dentro del modal de detalle (solo ADMINISTRADOR DE RESIDENTES). */
  iniciarEdicionHitoDetalle(): void {
    this.editHitoStartDate = this.selectedTask?.realPlannedStartDate ?? '';
    this.editHitoEndDate = this.selectedTask?.realPlannedEndDate ?? null;
    this.editandoHitoDetalle = true;
  }

  cancelarEdicionHitoDetalle(): void {
    this.editandoHitoDetalle = false;
  }

  /** Persiste la edición vía PUT milestoneSchedule/{id} y refleja el resultado en el Gantt en memoria. */
  guardarEdicionHitoDetalle(): void {
    const hito = this.selectedTask;
    if (!hito || this.savingHitoDetalle) return;

    // Qué campo es el visible/obligatorio en pantalla depende de dónde vive el dato real de ESTE
    // hito (ver hitoDetalleMuestraInicio/Fin) — para un hito "solo Fin" (nuevo, de plantilla),
    // Fecha inicio ni siquiera se muestra, así que no puede exigirse acá.
    if (this.hitoDetalleMuestraInicio && !this.editHitoStartDate) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'La fecha de inicio es obligatoria.' });
      return;
    }
    if (!this.hitoDetalleMuestraInicio && this.hitoDetalleMuestraFin && !this.editHitoEndDate) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'La fecha fin es obligatoria.' });
      return;
    }

    // plannedStartDate no admite null en el DTO. Si Fecha inicio está oculta (el dato real de este
    // hito vive en Fin), se espeja Fin→Inicio para el body del PUT sin mostrárselo al usuario.
    const plannedStartDateEfectiva: string =
      this.hitoDetalleMuestraInicio ? this.editHitoStartDate : (this.editHitoEndDate ?? '');

    // Confirmado contra datos reales (no solo el código): en los hitos obligatorios/puntuales
    // históricos ya guardados ("Nivel 0.00", "Fin de Obra", etc.), la fecha real vive en Fecha
    // inicio y Fecha fin queda en null — al revés de lo que asume la plantilla para hitos nuevos
    // (sincronizarDTODesdeUndatedTasks espeja Fin→Inicio). Por eso, si el usuario no llenó Fecha
    // fin (y no es un hito "solo Fin", que ya la trae puesta), se espeja Inicio→Fin acá para que
    // la validación de obligatorio (igual a MilestoneScheduleRepository.EditAsync) no bloquee un
    // hito que ya tiene una fecha real válida, sin esconder ni tocar el campo Fecha inicio.
    const plannedEndDateEfectiva: string | null =
      this.editHitoEndDate ||
      (hito.esObligatorio && !this.esInicioDeObra(hito) ? plannedStartDateEfectiva : null);

    if (this.hitoObligatorioSinFechaFin(hito, plannedEndDateEfectiva)) {
      Swal.fire({
        icon: 'error',
        title: 'Hito obligatorio',
        text: `"${hito.text}" es un hito obligatorio y debe tener una fecha fin.`,
      });
      return;
    }

    const dto: MilestoneScheduleCreateDTO = {
      milestoneId: hito.milestoneId,
      customDescription: hito.milestoneId == null ? hito.text : undefined,
      order: hito.order,
      plannedStartDate: plannedStartDateEfectiva,
      plannedEndDate: plannedEndDateEfectiva,
      esHitoCritico: !!hito.esHitoCritico,
    };

    this.savingHitoDetalle = true;
    this.milestoneScheduleService.editarHito(hito.milestoneScheduleId, dto).subscribe({
      next: (response) => {
        hito.realPlannedStartDate = dto.plannedStartDate;
        hito.realPlannedEndDate = dto.plannedEndDate;

        const startDate = this.parseStringToDate(dto.plannedStartDate);
        const endDate = dto.plannedEndDate ? this.parseStringToDate(dto.plannedEndDate) : null;
        // Mismo criterio que al cargar el Gantt (openViewMilestoneSchedule): un plannedEndDate
        // igual a plannedStartDate (caso del espejo de arriba) sigue siendo un hito puntual, no
        // un rango — comparar por igualdad de string, no solo "¿hay endDate?".
        const esRangoReal = !!endDate && dto.plannedEndDate !== dto.plannedStartDate;
        const ganttTask = gantt.getTask(hito.id);
        ganttTask.start_date = startDate ?? undefined;
        if (esRangoReal) {
          ganttTask.end_date = endDate!;
          ganttTask.type = undefined;
          ganttTask.duration = undefined;
        } else {
          ganttTask.end_date = startDate ?? undefined;
          ganttTask.type = 'milestone';
          ganttTask.duration = 0;
        }
        gantt.updateTask(hito.id);
        gantt.render();
        this.ganttTasks = gantt.getTaskByTime();

        hito.start_date = ganttTask.start_date;
        hito.end_date = ganttTask.end_date;
        hito.type = ganttTask.type;

        this.savingHitoDetalle = false;
        this.editandoHitoDetalle = false;
        this.cdr.detectChanges();
        Swal.fire({ title: response.message ?? 'Hito actualizado exitosamente.', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.savingHitoDetalle = false;
        this.cdr.detectChanges();
        this.error(err);
      },
    });
  }

  saveEditTask() {
    const item = this.editMilestoneScheduleItem;

    if (!item.plannedStartDate) {
      Swal.fire({ icon: 'warning', title: 'Validación', text: 'La fecha de inicio es obligatoria.' });
      return;
    }

    const startClean = item.plannedStartDate.substring(0, 10);
    const endClean = item.plannedEndDate ? item.plannedEndDate.substring(0, 10) : null;
    const startDate = this.parseStringToDate(startClean);
    const endDate = endClean ? this.parseStringToDate(endClean) : null;

    const undatedIdx = this.undatedTasks.findIndex((t) => t.milestoneId === item.milestoneId);
    const isUndated = undatedIdx !== -1;

    if (isUndated) {
      // Solo almacena las fechas en undatedTasks — la promoción al Gantt ocurre al presionar "Guardar"
      const task = this.undatedTasks[undatedIdx];
      task.start_date = startDate;
      task.end_date   = endDate;
      task.startDate  = startClean ?? '';
      task.endDate    = endClean   ?? '';
    } else {
      // Actualizar tarea existente en el Gantt
      const task = gantt.getTask(item.id);
      task.text = item.text;
      task.start_date = startDate ?? undefined;
      if (endClean) {
        task.end_date = endDate ?? undefined;
        task.type = undefined;
        task.duration = undefined;
      } else {
        task.end_date = task.start_date;
        task.type = 'milestone';
        task.duration = 0;
      }
      gantt.updateTask(task.id);
      gantt.render();
      this.ganttTasks = gantt.getTaskByTime();
    }

    this.showEditModal = false;
    this.cdr.detectChanges();

    const dtoItem = this.milestoneScheduleHistoryCreateDTO.milestoneSchedules.find(
      (x) => x.milestoneId === item.id,
    );
    if (dtoItem) {
      dtoItem.plannedStartDate = startClean || '';
      dtoItem.plannedEndDate = endClean;
    }
  }

  ngOnDestroy(): void {
    gantt.clearAll();
  }

  openTaskDetail(task: any): void {
    this.selectedTask = task;
    this.showDetailModal = true;
    this.editandoHitoDetalle = false;
    if (task.type === 'milestone') {
      this.selectedTask.end_date = '-';
    }
    this.cdr.detectChanges();
  }

  onBackdropMouseDown(event: MouseEvent) {
    this.mouseDownOnBackdrop = event.target === event.currentTarget;
  }

  closeModal(event: MouseEvent) {
    const mouseUpOnBackdrop = event.target === event.currentTarget;

    if (this.mouseDownOnBackdrop && mouseUpOnBackdrop) {
      this.showDetailModal = false;
      this.showCreateModal = false;
      this.showMilestoneScheduleHistory = false;
      this.showCreateMilestoneScheduleModal = false;
      this.showEditModal = false;
    }

    this.mouseDownOnBackdrop = false;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadSchedules(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadSchedules(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadSchedules(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status === 403) {
      Swal.fire({
        icon: 'error',
        title: 'Sin permiso',
        text: err.error?.message ?? 'No tienes permiso para realizar esta acción.',
      });
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
