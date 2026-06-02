import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CronogramaActividadesService } from './services/cronograma-actividades.service';
import {
  ProyectoSimpleDto,
  ActividadDto,
  CrearActividadRequest,
  EditarActividadRequest,
  ReordenarItem,
  CascadaResultDto,
  CascadaCambioDto,
} from './dtos/cronograma-actividades.dtos';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';

interface PredResultItem {
  act: ActividadDto;
  disabled: boolean;
  hint: string;
}

@Component({
  selector: 'app-cronograma-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cronograma-actividades.html',
  styleUrl: './cronograma-actividades.css',
})
export class CronogramaActividades implements OnInit {
  // Datos
  proyectos: ProyectoSimpleDto[] = [];
  actividades: ActividadDto[] = [];
  selectedProyectoId: number | null = null;

  // Cargas
  loadingProyectos = false;
  loadingActividades = false;
  guardando = false;

  // Modal crear/editar
  modalOpen = false;
  modalMode: 'crear' | 'editar' = 'crear';
  editandoId: number | null = null;
  editandoAct: ActividadDto | null = null;

  // Modal importar MPP
  mppModalOpen = false;
  mppFile: File | null = null;
  importando = false;

  // Jerarquía
  collapsedIds  = new Set<number>();
  ganttModalAct: ActividadDto | null = null;
  private parentIds = new Set<number>();
  private rowStyleMap = new Map<number, { bg: string; text: string; border?: string; color?: string }>();
  private avanceMap = new Map<number, number>();

  // Timer para distinguir click simple de doble click en filas
  private rowClickTimer: ReturnType<typeof setTimeout> | null = null;

  // Drag & Drop
  dragSrc: ActividadDto | null = null;   // actividad siendo arrastrada
  dragActId: number | null = null;       // id para clase CSS row-dragging
  dropTargetId: number | null = null;
  dropAbove = true;
  guardandoOrden = false;

  // Crear: nivel y padre
  formNivel = 1;
  formPadreId: number | null = null;
  private readonly NIVEL0 = { bg: '#1B263B', text: '#E0E1DD' } as const;
  private readonly GANTT_WEEK_PX = 50;
  private readonly GANTT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  private readonly LEVEL1_COLORS = [
    '#3B82F6', '#14B8A6', '#F59E0B', '#A855F7',
    '#EF4444', '#10B981', '#F97316', '#6366F1',
  ];

  // Formulario del modal
  formActividad = '';
  formPlannedStart = '';
  formPlannedEnd = '';
  formActualEnd = '';
  formProgress = 0;
  errorFechaReal = false;

  // Predecesoras
  formPredecesoras: number[] = [];
  predSearch = '';
  predDropdownIdx = -1;

  @ViewChild('predInput') predInputRef?: ElementRef<HTMLInputElement>;

  // Modal de cascada
  cascadaModalOpen = false;
  cascadaPreview: CascadaResultDto | null = null;
  aplicandoCascada = false;

  // Línea base
  lineaBaseVisible = false;

  // Edición inline — popover flotante
  inlineEditCell: { id: number; field: 'start' | 'end' | 'lbStart' | 'lbEnd' } | null = null;
  inlineEditValue = '';
  inlinePopoverPos = { top: 0, left: 0 };

  @ViewChild('popoverDateInput') popoverDateInputRef?: ElementRef<HTMLInputElement>;

  constructor(
    private service: CronogramaActividadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get esAdmin(): boolean {
    return (
      this.authService.hasRole('ADMINISTRADOR DE UDP') ||
      this.authService.hasRole('ADMINISTRADOR DE RESIDENTES')
    );
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('proyectoId'));
    if (!id) {
      this.volver();
      return;
    }
    this.selectedProyectoId = id;
    this.loadProyectos();      // para mostrar nombre + responsable del proyecto
    this.loadActividades(id);
  }

  volver(): void {
    this.router.navigate(['/projects/cronograma-actividades']);
  }

  get proyecto(): ProyectoSimpleDto | undefined {
    return this.proyectos.find((p) => p.projectId === this.selectedProyectoId);
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadProyectos(): void {
    this.loadingProyectos = true;
    this.loaderService.show();
    this.service.getProyectos().subscribe({
      next: (res) => {
        this.proyectos = res;
        this.loadingProyectos = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProyectos = false;
        this.errorService.handleError(err);
      },
    });
  }

  onProyectoChange(id: number | null): void {
    this.actividades = [];
    this.collapsedIds.clear();
    this.ganttModalAct = null;
    this.parentIds.clear();
    this.rowStyleMap.clear();
    this.avanceMap.clear();
    if (!id) return;
    this.loadActividades(id);
  }

  private loadActividades(proyectoId: number): void {
    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(proyectoId).subscribe({
      next: (res) => {
        this.actividades = res ?? [];
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();
        this.loadingActividades = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingActividades = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Jerarquía ─────────────────────────────────────────────────────────────

  private buildParentIds(): void {
    this.parentIds = new Set(
      this.actividades.filter((a) => a.parentId !== null).map((a) => a.parentId!),
    );
  }

  private buildColorMap(): void {
    this.rowStyleMap.clear();
    let level1Idx = 0;
    for (const act of this.actividades) {
      if (act.hierarchyLevel === 0) {
        this.rowStyleMap.set(act.projectActivityId, { ...this.NIVEL0 });
      } else if (act.hierarchyLevel === 1) {
        const color = this.LEVEL1_COLORS[level1Idx % this.LEVEL1_COLORS.length];
        this.rowStyleMap.set(act.projectActivityId, {
          bg: '#ffffff',
          text: '#1B263B',
          border: color,
          color,
        });
        level1Idx++;
      } else if (act.hierarchyLevel === 2) {
        const parentColor = this.findAncestorColorAtLevel(act, 1);
        this.rowStyleMap.set(act.projectActivityId, {
          bg: '#f0f4f8',
          text: '#2d3f52',
          border: parentColor ? this.hexToRgba(parentColor, 0.45) : 'transparent',
          color: parentColor ?? undefined,
        });
      } else {
        const parentColor = this.findAncestorColorAtLevel(act, 1);
        this.rowStyleMap.set(act.projectActivityId, {
          bg: '#f8fafc',
          text: '#4a6580',
          color: parentColor ?? undefined,
        });
      }
    }
  }

  private findAncestorColorAtLevel(act: ActividadDto, targetLevel: number): string | null {
    if (act.parentId === null) return null;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    if (!parent) return null;
    if (parent.hierarchyLevel === targetLevel) {
      return this.rowStyleMap.get(parent.projectActivityId)?.color ?? null;
    }
    return this.findAncestorColorAtLevel(parent, targetLevel);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getRowStyle(act: ActividadDto): Record<string, string> {
    const info = this.rowStyleMap.get(act.projectActivityId);
    if (!info) return {};
    const style: Record<string, string> = { 'background-color': info.bg, color: info.text };
    if (info.border) style['--lvl-border'] = info.border;
    return style;
  }

  isDarkBg(act: ActividadDto): boolean {
    return this.rowStyleMap.get(act.projectActivityId)?.text === '#E0E1DD';
  }

  getBadgeStyle(act: ActividadDto): Record<string, string> {
    if (this.isDarkBg(act)) {
      const estado = this.getEstado(act);
      const map: Record<string, { bg: string; fg: string }> = {
        CULMINADA:    { bg: '#86efac', fg: '#14532d' },
        VENCIDO:      { bg: '#fca5a5', fg: '#7f1d1d' },
        'EN PROGRESO':{ bg: '#93c5fd', fg: '#1e3a5f' },
      };
      const s = map[estado] ?? { bg: 'rgba(255,255,255,0.15)', fg: '#ffffff' };
      return { 'background-color': s.bg, color: s.fg };
    }
    return {};
  }

  getChevronStyle(act: ActividadDto): Record<string, string> {
    const info = this.rowStyleMap.get(act.projectActivityId);
    return info ? { color: info.text } : {};
  }

  getFechaRealStyle(act: ActividadDto): Record<string, string> {
    if (!act.actualEndDate) {
      // "—" en color secundario: usa la opacidad del CSS (0.75 en td-fecha) sin override
      return {};
    }
    return {
      color: this.isDarkBg(act) ? '#90CAF9' : '#1d4ed8',
      fontWeight: '600',
      opacity: '1', // anula el opacity: 0.75 que .td-fecha aplica sobre filas coloreadas
    };
  }

  hasChildren(act: ActividadDto): boolean {
    return this.parentIds.has(act.projectActivityId);
  }

  isVisible(act: ActividadDto): boolean {
    if (act.parentId === null) return true;
    if (this.collapsedIds.has(act.parentId)) return false;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    return parent ? this.isVisible(parent) : true;
  }

  toggleCollapse(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    if (this.collapsedIds.has(act.projectActivityId)) {
      this.collapsedIds.delete(act.projectActivityId);
    } else {
      this.collapsedIds.add(act.projectActivityId);
    }
  }

  // ── Click simple / doble click en fila ────────────────────────────────────

  onRowClick(act: ActividadDto): void {
    if (this.rowClickTimer !== null) {
      clearTimeout(this.rowClickTimer);
      this.rowClickTimer = null;
    }
    this.rowClickTimer = setTimeout(() => {
      this.rowClickTimer = null;
      this.abrirModalEditar(act);
    }, 250);
  }

  onRowDblClick(act: ActividadDto): void {
    if (this.rowClickTimer !== null) {
      clearTimeout(this.rowClickTimer);
      this.rowClickTimer = null;
    }
    this.abrirGanttModal(act);
  }

  // ── Modal Gantt (nivel 1) ──────────────────────────────────────────────────

  abrirGanttModal(act: ActividadDto): void {
    this.ganttModalAct = act;
    setTimeout(() => {
      const col = document.querySelector('.gantt-chart-col') as HTMLElement | null;
      if (!col) return;
      const kids  = this.getGanttChildren(act);
      const range = this.getGanttRange(kids);
      if (!range) return;
      const weeks  = this.getGanttWeeks(range);
      const todayPx = this.getScrollToToday(range, weeks);
      col.scrollLeft = Math.max(0, todayPx - col.clientWidth / 2);
    }, 0);
  }
  cerrarGanttModal(): void                   { this.ganttModalAct = null; }

  onGanttOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarGanttModal();
    }
  }

  getGanttAccentColor(act: ActividadDto): string {
    return this.rowStyleMap.get(act.projectActivityId)?.color ?? '#415a77';
  }

  getGanttChildren(act: ActividadDto): ActividadDto[] {
    return this.actividades.filter((a) => a.parentId === act.projectActivityId);
  }

  getGanttRange(kids: ActividadDto[]): { min: Date; max: Date } | null {
    const ts: number[] = [];
    for (const k of kids) {
      if (k.plannedStartDate) ts.push(new Date(k.plannedStartDate).getTime());
      if (k.plannedEndDate)   ts.push(new Date(k.plannedEndDate).getTime());
    }
    if (!ts.length) return null;
    return { min: new Date(Math.min(...ts)), max: new Date(Math.max(...ts)) };
  }

  // ── Gantt: cálculos de semanas/meses/barras ────────────────────────────────

  getGanttWeeks(range: { min: Date; max: Date }): { startDate: Date; label: string; isCurrentWeek: boolean }[] {
    const firstMonday = new Date(range.min);
    const dow = firstMonday.getDay();
    firstMonday.setDate(firstMonday.getDate() - (dow === 0 ? 6 : dow - 1));
    firstMonday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: { startDate: Date; label: string; isCurrentWeek: boolean }[] = [];
    let cur = new Date(firstMonday);
    const limit = new Date(range.max.getTime() + this.GANTT_WEEK_MS);

    while (cur <= limit) {
      const weekEnd = new Date(cur.getTime() + this.GANTT_WEEK_MS - 1);
      const dd = String(cur.getDate()).padStart(2, '0');
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      weeks.push({
        startDate: new Date(cur),
        label: `${dd}/${mm}`,
        isCurrentWeek: today >= cur && today <= weekEnd,
      });
      cur = new Date(cur.getTime() + this.GANTT_WEEK_MS);
    }
    return weeks;
  }

  getGanttMonths(weeks: { startDate: Date }[]): { label: string; spanWeeks: number }[] {
    const NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const months: { label: string; spanWeeks: number }[] = [];
    for (const w of weeks) {
      const lbl = `${NAMES[w.startDate.getMonth()]} ${w.startDate.getFullYear()}`;
      const last = months[months.length - 1];
      if (last && last.label === lbl) { last.spanWeeks++; }
      else { months.push({ label: lbl, spanWeeks: 1 }); }
    }
    return months;
  }

  getBarLayerStyle(kid: ActividadDto, weeks: { startDate: Date }[]): Record<string, string> {
    if (!kid.plannedStartDate || !kid.plannedEndDate || !weeks.length) return { display: 'none' };
    const origin = weeks[0].startDate.getTime();
    const start  = new Date(kid.plannedStartDate).getTime();
    const end    = new Date(kid.plannedEndDate).getTime();
    const leftPx  = Math.max(0, (start - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
    const widthPx = Math.max(4, (end - start) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
    return { left: `${leftPx}px`, width: `${widthPx}px` };
  }

  getTodayPosition(range: { min: Date; max: Date }, weeks: { startDate: Date }[]): string | null {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (hoy < range.min || hoy > range.max || !weeks.length) return null;
    const origin = weeks[0].startDate.getTime();
    const px = (hoy.getTime() - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX;
    return `${px}px`;
  }

  getScrollToToday(range: { min: Date; max: Date }, weeks: { startDate: Date }[]): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (!weeks.length) return 0;
    const origin = weeks[0].startDate.getTime();
    return Math.max(0, (hoy.getTime() - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
  }

  getGanttBarColorAlpha(act: ActividadDto): string {
    const color = this.rowStyleMap.get(act.projectActivityId)?.color;
    return color ? this.hexToRgba(color, 0.22) : 'rgba(65, 90, 119, 0.22)';
  }

  getGanttChartWidth(weeks: unknown[]): number {
    return weeks.length * this.GANTT_WEEK_PX;
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  /** true si `target` comparte el mismo parentId que la actividad en curso. */
  private mismoParentId(target: ActividadDto): boolean {
    if (!this.dragSrc) return false;
    const pid = this.dragSrc.parentId;
    return pid === null ? target.parentId === null : target.parentId === pid;
  }

  /** La línea indicadora solo aparece si el destino es un candidato válido. */
  canDropOn(target: ActividadDto): boolean {
    if (!this.dragSrc || this.dragSrc.projectActivityId === target.projectActivityId) return false;
    if (!this.isVisible(target)) return false;
    return this.mismoParentId(target);
  }

  onDragStart(act: ActividadDto, event: DragEvent): void {
    this.dragSrc = act;
    this.dragActId = act.projectActivityId;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(act.projectActivityId));
    const orderCell = event.currentTarget as HTMLElement;
    const row = orderCell.closest('tr') as HTMLElement | null;
    if (row && event.dataTransfer) {
      const rect = row.getBoundingClientRect();
      event.dataTransfer.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top);
    }
  }

  onDragOver(act: ActividadDto, event: DragEvent): void {
    // Sin preventDefault → el navegador muestra cursor "prohibido" y no disparará drop
    if (!this.canDropOn(act)) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    this.dropTargetId = act.projectActivityId;
    this.dropAbove = event.clientY < rect.top + rect.height / 2;
  }

  onDragLeave(act: ActividadDto, event: DragEvent): void {
    if (this.dropTargetId !== act.projectActivityId) return;
    const related = event.relatedTarget as Node | null;
    if (!(event.currentTarget as HTMLElement).contains(related)) {
      this.dropTargetId = null;
    }
  }

  onDragEnd(): void {
    this.dragSrc = null;
    this.dragActId = null;
    this.dropTargetId = null;
  }

  /**
   * Devuelve el subárbol de la actividad en srcIdx: ella misma + todos sus
   * descendientes que aparecen contiguos inmediatamente después en el array
   * (orden depth-first que retorna el backend).
   */
  private getSubtreeSlice(srcIdx: number): ActividadDto[] {
    const slice = [this.actividades[srcIdx]];
    const ids = new Set<number>([this.actividades[srcIdx].projectActivityId]);
    for (let i = srcIdx + 1; i < this.actividades.length; i++) {
      const a = this.actividades[i];
      if (a.parentId !== null && ids.has(a.parentId)) {
        slice.push(a);
        ids.add(a.projectActivityId);
      } else {
        break;
      }
    }
    return slice;
  }

  onDrop(act: ActividadDto, event: DragEvent): void {
    event.preventDefault();

    // Limpiar estado de drag de inmediato
    const src = this.dragSrc;
    this.dragSrc = null;
    this.dragActId = null;
    this.dropTargetId = null;

    if (!src) return;

    // ── Verificación final: mismo parentId ───────────────────────────────────
    const srcPid = src.parentId;
    const tgtPid = act.parentId;
    const mismoParent = srcPid === null ? tgtPid === null : tgtPid === srcPid;
    if (!mismoParent || src.projectActivityId === act.projectActivityId) return;

    // ── Opción A: order global único ─────────────────────────────────────────
    // 1. Obtener el subárbol de src (src + todos sus hijos recursivos)
    const srcIdx = this.actividades.findIndex(
      (a) => a.projectActivityId === src.projectActivityId,
    );
    if (srcIdx === -1) return;
    const subtree = this.getSubtreeSlice(srcIdx);
    const subtreeIds = new Set(subtree.map((a) => a.projectActivityId));

    // 2. Lista plana sin el subárbol
    const listaPlana = this.actividades.filter((a) => !subtreeIds.has(a.projectActivityId));

    // 3. Posición del destino en la lista plana
    const tgtIdx = listaPlana.findIndex((a) => a.projectActivityId === act.projectActivityId);
    if (tgtIdx === -1) return;

    // 4. Insertar el subárbol antes o después del destino
    listaPlana.splice(this.dropAbove ? tgtIdx : tgtIdx + 1, 0, ...subtree);

    // 5. Sin cambio real → no llamar al backend
    const sinCambio = listaPlana.every(
      (a, i) => a.projectActivityId === this.actividades[i].projectActivityId,
    );
    if (sinCambio) return;

    // 6. Payload: TODAS las actividades con order global 1, 2, 3…
    const items: ReordenarItem[] = listaPlana.map((a, i) => ({
      projectActivityId: a.projectActivityId,
      order: i + 1,
    }));

    this.guardandoOrden = true;
    this.loaderService.show();
    this.service.reordenarActividades(this.selectedProyectoId!, items).subscribe({
      next: () => {
        // Actualizar el array local directamente — no hay reload, no hay parpadeo ni reset de scroll
        this.actividades = listaPlana;
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();
        this.guardandoOrden = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        // this.actividades nunca se modificó → ya tiene el orden original, sin necesidad de recargar
        this.guardandoOrden = false;
        this.loaderService.hide();
        const msg = typeof err.error === 'string'
          ? err.error
          : (err.error?.message ?? err.error?.detail ?? err.message ?? 'Ocurrió un error.');
        Swal.fire({ icon: 'error', title: 'Error al reordenar', text: msg, confirmButtonColor: '#2596be' });
      },
    });
  }

  // ── Cambio de jerarquía ────────────────────────────────────────────────────

  canSubirNivel(act: ActividadDto): boolean {
    return act.hierarchyLevel > 0;
  }

  canBajarNivel(act: ActividadDto): boolean {
    return act.hierarchyLevel < 3;
  }

  subirNivelActividad(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    this.loaderService.show();
    this.service.subirNivel(this.selectedProyectoId!, act.projectActivityId).subscribe({
      next: () => { this.loaderService.hide(); this.recargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  bajarNivelActividad(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    const actIdx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
    let newParent: ActividadDto | null = null;
    for (let i = actIdx - 1; i >= 0; i--) {
      if (this.actividades[i].hierarchyLevel === act.hierarchyLevel) {
        newParent = this.actividades[i];
        break;
      }
    }
    if (!newParent) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin padre disponible',
        text: 'No hay un padre disponible para asignar esta actividad.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    this.loaderService.show();
    this.service.bajarNivel(this.selectedProyectoId!, act.projectActivityId, newParent.projectActivityId).subscribe({
      next: () => { this.loaderService.hide(); this.recargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  // ── Crear con nivel ────────────────────────────────────────────────────────

  get padresDisponibles(): ActividadDto[] {
    if (this.formNivel <= 1) return [];
    return this.actividades.filter((a) => a.hierarchyLevel === this.formNivel - 1);
  }

  onFormNivelChange(nivel: number): void {
    this.formNivel = nivel;
    this.formPadreId = null;
  }

  // ── Utilidades de formato ──────────────────────────────────────────────────

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const p = date.slice(0, 10).split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  getEstado(act: ActividadDto): 'CULMINADA' | 'VENCIDO' | 'EN PROGRESO' {
    if (this.getAvance(act) === 100) return 'CULMINADA';
    if (!act.plannedEndDate) return 'EN PROGRESO';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(act.plannedEndDate);
    fin.setHours(0, 0, 0, 0);
    return hoy > fin ? 'VENCIDO' : 'EN PROGRESO';
  }

  getEstadoCss(act: ActividadDto): string {
    const e = this.getEstado(act);
    if (e === 'CULMINADA')  return 'badge-verde';
    if (e === 'VENCIDO')    return 'badge-rojo';
    return 'badge-azul'; // EN PROGRESO
  }

  private buildAvanceMap(): void {
    this.avanceMap.clear();
    for (const act of this.actividades) {
      this.calcularAvance(act.projectActivityId);
    }
  }

  private calcularAvance(actividadId: number): number {
    if (this.avanceMap.has(actividadId)) return this.avanceMap.get(actividadId)!;
    const hijos = this.actividades.filter((a) => a.parentId === actividadId);
    let result: number;
    if (hijos.length === 0) {
      const act = this.actividades.find((a) => a.projectActivityId === actividadId);
      result = act ? (act.actualEndDate ? 100 : (act.progressPercentage ?? 0)) : 0;
    } else {
      const suma = hijos.reduce((acc, h) => acc + this.calcularAvance(h.projectActivityId), 0);
      result = Math.round(suma / hijos.length);
    }
    this.avanceMap.set(actividadId, result);
    return result;
  }

  getDisplayIndex(act: ActividadDto): number {
    return this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId) + 1;
  }

  getAvance(act: ActividadDto): number {
    return this.avanceMap.get(act.projectActivityId) ?? (act.actualEndDate ? 100 : act.progressPercentage);
  }

  getBarFillColor(act: ActividadDto): string {
    const info = this.rowStyleMap.get(act.projectActivityId);
    return info?.color ?? '#415a77';
  }

  getAvanceColor(pct: number): string {
    if (pct === 100) return 'fill-verde';
    if (pct >= 70) return 'fill-azul';
    if (pct >= 31) return 'fill-amarillo';
    return 'fill-rojo';
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  abrirModalCrear(): void {
    this.modalMode = 'crear';
    this.editandoId = null;
    this.formActividad = '';
    this.formPlannedStart = '';
    this.formPlannedEnd = '';
    this.formActualEnd = '';
    this.formProgress = 0;
    this.formNivel = 1;
    this.formPadreId = null;
    this.guardando = false;
    this.modalOpen = true;
  }

  abrirModalEditar(act: ActividadDto): void {
    this.modalMode = 'editar';
    this.editandoId = act.projectActivityId;
    this.editandoAct = act;
    this.formActividad = act.activityDescription;
    this.formPlannedStart = act.plannedStartDate?.slice(0, 10) ?? '';
    this.formPlannedEnd = act.plannedEndDate?.slice(0, 10) ?? '';
    this.formActualEnd = act.actualEndDate?.slice(0, 10) ?? '';
    const raw = act.progressPercentage ?? 0;
    this.formProgress = raw >= 75 ? 100 : raw >= 25 ? 50 : 0;
    this.formPredecesoras = [...(act.predecesoras ?? [])];
    this.predSearch = '';
    this.predDropdownIdx = -1;
    this.guardando = false;
    this.modalOpen = true;
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.guardando = false;
    this.editandoAct = null;
    this.errorFechaReal = false;
    this.formPredecesoras = [];
    this.predSearch = '';
    this.predDropdownIdx = -1;
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  // ── Cascada ────────────────────────────────────────────────────────────────

  private patchActividadLocal(res: ActividadDto): void {
    const idx = this.actividades.findIndex((a) => a.projectActivityId === res.projectActivityId);
    if (idx === -1) return;
    this.actividades[idx].activityDescription = res.activityDescription;
    this.actividades[idx].plannedStartDate    = res.plannedStartDate;
    this.actividades[idx].plannedEndDate      = res.plannedEndDate;
    this.actividades[idx].actualEndDate       = res.actualEndDate;
    this.actividades[idx].progressPercentage  = res.progressPercentage;
  }

  private mostrarCascadaSiHayCambios(preview: CascadaResultDto): void {
    if (preview.hayCambios) {
      this.cascadaPreview = preview;
      this.cascadaModalOpen = true;
    }
  }

  aplicarCascada(): void {
    this.aplicandoCascada = true;
    this.loaderService.show();
    this.service.aplicarCascada(this.selectedProyectoId!).subscribe({
      next: (result) => {
        for (const c of result.cambios) {
          const idx = this.actividades.findIndex((a) => a.projectActivityId === c.projectActivityId);
          if (idx !== -1) {
            this.actividades[idx].plannedStartDate = c.inicioNuevo;
            this.actividades[idx].plannedEndDate   = c.finNuevo;
          }
        }
        this.buildAvanceMap();
        this.buildColorMap();
        this.aplicandoCascada = false;
        this.cascadaModalOpen = false;
        this.cascadaPreview = null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.aplicandoCascada = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cancelarCascada(): void {
    this.cascadaModalOpen = false;
    this.cascadaPreview = null;
  }

  // ── Predecesoras ───────────────────────────────────────────────────────────

  private getDescendantIds(actId: number): Set<number> {
    const result = new Set<number>();
    const queue = [actId];
    while (queue.length) {
      const id = queue.shift()!;
      for (const a of this.actividades) {
        if (a.parentId === id) {
          result.add(a.projectActivityId);
          queue.push(a.projectActivityId);
        }
      }
    }
    return result;
  }

  filtrarPredecesoras(): PredResultItem[] {
    if (!this.editandoAct || !this.predSearch.trim()) return [];

    const term     = this.predSearch.trim();
    const isNum    = /^\d+$/.test(term);
    const termLow  = term.toLowerCase();
    const editId   = this.editandoAct.projectActivityId;
    const descIds  = this.getDescendantIds(editId);
    const selected = new Set(this.formPredecesoras);

    // Pool: excluir la actividad en edición y las ya agregadas como chips
    const pool = this.actividades.filter(
      (a) => a.projectActivityId !== editId && !selected.has(a.projectActivityId),
    );

    let matched: ActividadDto[];
    if (isNum) {
      // Coincidencia EXACTA por número de fila
      matched = pool.filter((a) => String(this.getDisplayIndex(a)) === term);
      // Fallback a búsqueda por nombre si no hay coincidencia exacta
      if (matched.length === 0) {
        matched = pool.filter((a) => a.activityDescription.toLowerCase().includes(termLow));
      }
    } else {
      matched = pool.filter(
        (a) =>
          String(this.getDisplayIndex(a)).includes(termLow) ||
          a.activityDescription.toLowerCase().includes(termLow),
      );
    }

    // Anotar con disabled/hint según el motivo de exclusión
    const result: PredResultItem[] = matched.map((a) => {
      if (descIds.has(a.projectActivityId))            return { act: a, disabled: true, hint: 'Es descendiente' };
      if (this.wouldCreateCycle(a.projectActivityId))  return { act: a, disabled: true, hint: 'Crearía un ciclo' };
      return { act: a, disabled: false, hint: '' };
    });

    // Habilitados primero; máximo 8 items
    result.sort((x, y) => Number(x.disabled) - Number(y.disabled));
    return result.slice(0, 8);
  }

  private wouldCreateCycle(candidateId: number): boolean {
    const editId  = this.editandoAct!.projectActivityId;
    const visited = new Set<number>();
    const queue   = [candidateId];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const act = this.actividades.find((a) => a.projectActivityId === id);
      for (const predId of act?.predecesoras ?? []) {
        if (predId === editId) return true;
        if (!visited.has(predId)) queue.push(predId);
      }
    }
    return false;
  }

  getPredChipLabel(pid: number): string {
    const act = this.actividades.find((a) => a.projectActivityId === pid);
    return act ? `${this.getDisplayIndex(act)} — ${act.activityDescription}` : `#${pid}`;
  }

  agregarPredecesora(act: ActividadDto): void {
    if (!this.formPredecesoras.includes(act.projectActivityId)) {
      this.formPredecesoras = [...this.formPredecesoras, act.projectActivityId];
    }
    this.predSearch = '';
    this.predDropdownIdx = -1;
    setTimeout(() => this.predInputRef?.nativeElement.focus(), 0);
  }

  onPredKeydown(event: KeyboardEvent): void {
    const results = this.filtrarPredecesoras();

    switch (event.key) {
      case 'ArrowDown': {
        if (!results.length) return;
        event.preventDefault();
        let next = this.predDropdownIdx + 1;
        while (next < results.length && results[next].disabled) next++;
        if (next < results.length) {
          this.predDropdownIdx = next;
          this.cdr.detectChanges();
          document.querySelector('.pred-result-active')?.scrollIntoView({ block: 'nearest' });
        }
        break;
      }
      case 'ArrowUp': {
        if (!results.length) return;
        event.preventDefault();
        let prev = this.predDropdownIdx - 1;
        while (prev >= 0 && results[prev].disabled) prev--;
        if (prev >= 0) {
          this.predDropdownIdx = prev;
          this.cdr.detectChanges();
          document.querySelector('.pred-result-active')?.scrollIntoView({ block: 'nearest' });
        }
        break;
      }
      case 'Enter': {
        if (this.predDropdownIdx >= 0 && this.predDropdownIdx < results.length) {
          const item = results[this.predDropdownIdx];
          if (!item.disabled) { event.preventDefault(); this.agregarPredecesora(item.act); }
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.predSearch = '';
        this.predDropdownIdx = -1;
        break;
    }
  }

  quitarPredecesora(id: number): void {
    this.formPredecesoras = this.formPredecesoras.filter((p) => p !== id);
  }

  getPredTooltip(act: ActividadDto): string {
    if (!act.predecesoras?.length) return '';
    const nombres = act.predecesoras.map((pid) => {
      const pred = this.actividades.find((a) => a.projectActivityId === pid);
      return pred ? `${this.getDisplayIndex(pred)}. ${pred.activityDescription}` : `#${pid}`;
    });
    return `Predecesoras: ${nombres.join(', ')}`;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  onProgressChange(val: number): void {
    this.formProgress = val;
    if (val !== 100) this.errorFechaReal = false;
  }

  guardar(): void {
    if (!this.selectedProyectoId) return;
    if (!this.formActividad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre de la actividad es obligatorio.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    if (this.modalMode === 'editar' && this.formProgress === 100 && !this.formActualEnd) {
      this.errorFechaReal = true;
      return;
    }
    if (this.modalMode === 'crear' && this.formNivel > 1 && !this.formPadreId) {
      Swal.fire({
        icon: 'warning',
        title: 'Padre requerido',
        text: 'Debes seleccionar un padre para esta actividad.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    this.errorFechaReal = false;
    this.guardando = true;

    if (this.modalMode === 'crear') {
      const body: CrearActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
        hierarchyLevel: this.formNivel,
        parentId: this.formNivel > 1 ? this.formPadreId : null,
      };
      this.service.crearActividad(this.selectedProyectoId, body).subscribe({
        next: () => { this.cerrarModal(); this.recargar(); },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    } else {
      const esPadre = this.editandoAct?.esPadre ?? false;

      // Capturar antes de cerrarModal() para que el reset no los pise
      const actividadId    = this.editandoId!;
      const predSnapshot   = [...this.formPredecesoras];

      // Detectar qué cambió para saber si hay que verificar cascada
      const predCambiaron =
        JSON.stringify([...predSnapshot].sort()) !==
        JSON.stringify([...(this.editandoAct?.predecesoras ?? [])].sort());

      const fechasCambiaron =
        (this.formPlannedStart || null) !== (this.editandoAct?.plannedStartDate?.slice(0, 10) ?? null) ||
        (this.formPlannedEnd   || null) !== (this.editandoAct?.plannedEndDate?.slice(0, 10)   ?? null);

      const body: EditarActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        actualEndDate: this.formActualEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
      };

      this.service.editarActividad(actividadId, body).subscribe({
        next: (res) => {
          this.patchActividadLocal(res);
          this.buildAvanceMap();
          this.guardando = false;
          this.cerrarModal();
          this.cdr.detectChanges();

          // ── Verificar cascada ──────────────────────────────────────────────
          if (predCambiaron) {
            // Guardar predecesoras → respuesta incluye preview de cascada
            this.service.actualizarPredecesoras(actividadId, {
              predecessorIds: predSnapshot,
            }).subscribe({
              next: (predRes) => {
                const idx = this.actividades.findIndex(
                  (a) => a.projectActivityId === actividadId,
                );
                if (idx !== -1) {
                  this.actividades[idx].predecesoras = predRes.predecesoras;
                }
                this.mostrarCascadaSiHayCambios(predRes.previewCascada);
                this.cdr.detectChanges();
              },
              error: (err: HttpErrorResponse) => {
                const msg =
                  typeof err.error === 'string'
                    ? err.error
                    : (err.error?.message ?? err.error?.detail ?? 'Error al guardar predecesoras.');
                Swal.fire({ icon: 'error', title: 'Predecesoras', text: msg, confirmButtonColor: '#2596be' });
              },
            });
          } else if (!esPadre && fechasCambiaron) {
            // Llamar al preview de cascada
            this.service.previewCascada(this.selectedProyectoId!).subscribe({
              next: (preview) => {
                this.mostrarCascadaSiHayCambios(preview);
                this.cdr.detectChanges();
              },
              error: () => { /* si falla el preview, no bloqueamos al usuario */ },
            });
          }
        },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    }
  }

  culminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    this.service.culminarActividad(act.projectActivityId).subscribe({
      next: (res) => {
        const idx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
        if (idx !== -1) this.actividades[idx].actualEndDate = res.actualEndDate;
        this.buildAvanceMap();
        this.cerrarModal();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  eliminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    Swal.fire({
      title: '¿Eliminar actividad?',
      text: act.activityDescription,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.service.eliminarActividad(act.projectActivityId).subscribe({
        next: () => {
          this.actividades = this.actividades.filter(
            (a) => a.projectActivityId !== act.projectActivityId,
          );
          this.buildParentIds();
          this.buildColorMap();
          this.buildAvanceMap();
          this.cerrarModal();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  private recargar(): void {
    if (this.selectedProyectoId) this.loadActividades(this.selectedProyectoId);
  }

  /** Recarga desde BD preservando scroll (.page-content) y estado de colapso. */
  private recargarConEstado(): void {
    if (!this.selectedProyectoId) return;

    const scrollEl = document.querySelector('.page-content') as HTMLElement | null;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    const colapsados = new Set(this.collapsedIds);

    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(this.selectedProyectoId).subscribe({
      next: (res) => {
        this.actividades = res ?? [];
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();

        // Restaurar colapso antes del render: solo IDs que siguen existiendo
        const existentes = new Set(this.actividades.map((a) => a.projectActivityId));
        this.collapsedIds = new Set([...colapsados].filter((id) => existentes.has(id)));

        this.loadingActividades = false;
        this.loaderService.hide();
        this.cdr.detectChanges();

        // Restaurar scroll en el siguiente tick, cuando el DOM ya está actualizado
        setTimeout(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; }, 0);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingActividades = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Línea base toggle ─────────────────────────────────────────────────────

  toggleLineaBase(): void {
    this.lineaBaseVisible = !this.lineaBaseVisible;
  }

  // ── Edición inline de fechas ───────────────────────────────────────────────

  get inlinePopoverStyle(): Record<string, string> {
    return { top: `${this.inlinePopoverPos.top}px`, left: `${this.inlinePopoverPos.left}px` };
  }

  getInlineFieldLabel(): string {
    switch (this.inlineEditCell?.field) {
      case 'start':   return 'Inicio Programado';
      case 'end':     return 'Fin Programado';
      case 'lbStart': return 'LB Inicio';
      case 'lbEnd':   return 'LB Fin';
      default:        return '';
    }
  }

  startInlineEdit(
    act: ActividadDto,
    field: 'start' | 'end' | 'lbStart' | 'lbEnd',
    event: MouseEvent,
  ): void {
    if (act.esPadre) return;
    event.stopPropagation();

    // Calcular posición del popover desde la celda clicada
    const cell = (event.target as HTMLElement).closest('td') as HTMLElement;
    const rect  = cell?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const vpW   = window.innerWidth;
    const vpH   = window.innerHeight;
    const popW  = 240;
    const popH  = 130;
    const left  = rect.right + popW > vpW - 8  ? rect.right - popW : rect.left;
    const top   = rect.bottom + popH > vpH - 8 ? rect.top - popH - 4 : rect.bottom + 4;
    this.inlinePopoverPos = { top, left };

    const val =
      field === 'start'   ? act.plannedStartDate :
      field === 'end'     ? act.plannedEndDate :
      field === 'lbStart' ? act.baselineStartDate :
                            act.baselineEndDate;
    this.inlineEditValue = val?.slice(0, 10) ?? '';
    this.inlineEditCell  = { id: act.projectActivityId, field };
    this.cdr.detectChanges();
    setTimeout(() => this.popoverDateInputRef?.nativeElement.focus(), 0);
  }

  cancelInlineEdit(): void {
    this.inlineEditCell = null;
    this.cdr.detectChanges();
  }

  commitInlineEdit(): void {
    if (!this.inlineEditCell) return;

    const value = this.inlineEditValue;
    const cell  = this.inlineEditCell;
    this.inlineEditCell = null;
    this.cdr.detectChanges();

    const act = this.actividades.find((a) => a.projectActivityId === cell.id);
    if (!act) return;

    if (cell.field === 'start' || cell.field === 'end') {
      const cur = (cell.field === 'start'
        ? act.plannedStartDate : act.plannedEndDate)?.slice(0, 10) ?? '';
      if ((value || '') === cur) return;

      const body: EditarActividadRequest = {
        activityDescription: act.activityDescription,
        plannedStartDate:    cell.field === 'start' ? (value || null) : act.plannedStartDate,
        plannedEndDate:      cell.field === 'end'   ? (value || null) : act.plannedEndDate,
        actualEndDate:       act.actualEndDate,
        progressPercentage:  act.progressPercentage,
      };

      this.service.editarActividad(act.projectActivityId, body).subscribe({
        next: (res) => { this.patchActividadLocal(res); this.buildAvanceMap(); this.cdr.detectChanges(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    } else {
      // Edición de línea base
      const hasLb = !!(act.baselineStartDate || act.baselineEndDate);
      const actId = act.projectActivityId;
      const lbBody = {
        baselineStartDate: cell.field === 'lbStart' ? (value || null) : (act.baselineStartDate ?? null),
        baselineEndDate:   cell.field === 'lbEnd'   ? (value || null) : (act.baselineEndDate   ?? null),
      };

      const doSave = () => {
        this.service.actualizarLineaBase(actId, lbBody).subscribe({
          next: () => {
            const idx = this.actividades.findIndex((a) => a.projectActivityId === actId);
            if (idx !== -1) {
              if (cell.field === 'lbStart') this.actividades[idx].baselineStartDate = value || null;
              else                          this.actividades[idx].baselineEndDate   = value || null;
            }
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      };

      if (hasLb) {
        Swal.fire({
          icon: 'warning',
          title: '¿Cambiar línea base?',
          text: '¿Seguro que quieres cambiar la línea base? Esta acción modifica tu referencia de comparación.',
          showCancelButton: true,
          confirmButtonText: 'Sí, cambiar',
          cancelButtonText:  'Cancelar',
          confirmButtonColor: '#2596be',
          cancelButtonColor:  '#9ca3af',
        }).then((result) => { if (result.isConfirmed) doSave(); });
      } else {
        doSave();
      }
    }
  }

  // ── Desfase y semáforo ─────────────────────────────────────────────────────

  getDesfaseDias(act: ActividadDto, field: 'start' | 'end'): number | null {
    if (act.esPadre) {
      const hijos = this.actividades.filter((a) => a.parentId === act.projectActivityId);
      const vals  = hijos
        .map((h) => this.getDesfaseDias(h, field))
        .filter((d): d is number => d !== null);
      return vals.length ? Math.round(vals.reduce((s, d) => s + d, 0) / vals.length) : null;
    }
    const lb   = (field === 'start' ? act.baselineStartDate : act.baselineEndDate)?.slice(0, 10);
    const prog = (field === 'start' ? act.plannedStartDate  : act.plannedEndDate)?.slice(0, 10);
    if (!lb || !prog) return null;
    return Math.round((new Date(prog).getTime() - new Date(lb).getTime()) / 86400000);
  }

  formatDesfase(dias: number | null): string {
    if (dias === null) return '—';
    if (dias > 0) return `+${dias}d`;
    if (dias < 0) return `${dias}d`;
    return '0d';
  }

  getDesfaseClass(dias: number | null): string {
    if (dias === null) return '';
    if (dias <= 0) return 'desfase-ok';
    if (dias <= 7) return 'desfase-warn';
    return 'desfase-late';
  }

  getSemaforoClass(act: ActividadDto): string {
    if (act.esPadre) {
      const hijos  = this.actividades.filter((a) => a.parentId === act.projectActivityId);
      const clases = hijos.map((h) => this.getSemaforoClass(h)).filter((s) => s !== '');
      if (clases.includes('semaforo-rojo'))     return 'semaforo-rojo';
      if (clases.includes('semaforo-amarillo')) return 'semaforo-amarillo';
      if (clases.length && clases.every((s) => s === 'semaforo-verde')) return 'semaforo-verde';
      return '';
    }
    const d = this.getDesfaseDias(act, 'end');
    if (d === null) return '';
    if (d <= 0)  return 'semaforo-verde';
    if (d <= 7)  return 'semaforo-amarillo';
    return 'semaforo-rojo';
  }

  // ── Modal Importar MPP ─────────────────────────────────────────────────────

  abrirModalMpp(): void {
    this.mppFile = null;
    this.importando = false;
    this.mppModalOpen = true;
  }

  cerrarModalMpp(): void {
    this.mppModalOpen = false;
    this.mppFile = null;
    this.importando = false;
  }

  onMppOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalMpp();
    }
  }

  onMppFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mppFile = input.files?.[0] ?? null;
  }

  importarMpp(): void {
    if (!this.selectedProyectoId || !this.mppFile) return;

    const doImport = () => {
      this.importando = true;
      this.service.importarMpp(this.selectedProyectoId!, this.mppFile!).subscribe({
        next: () => {
          this.importando = false;
          this.cerrarModalMpp();
          this.recargar();
          Swal.fire({
            icon: 'success',
            title: 'Importación exitosa',
            text: 'Las actividades han sido importadas correctamente.',
            confirmButtonColor: '#2596be',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.importando = false;
          this.errorService.handleError(err);
        },
      });
    };

    if (this.actividades.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: 'Esto reemplazará todas las actividades actuales del proyecto.',
        showCancelButton: true,
        confirmButtonText: 'Sí, importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2596be',
        cancelButtonColor: '#9ca3af',
      }).then((result) => {
        if (result.isConfirmed) doImport();
      });
    } else {
      doImport();
    }
  }
}
