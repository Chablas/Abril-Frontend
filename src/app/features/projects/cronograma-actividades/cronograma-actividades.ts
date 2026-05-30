import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  CronogramaActividadesService,
  ProyectoSimpleDto,
  ActividadDto,
  CrearActividadRequest,
  EditarActividadRequest,
  ReordenarItem,
} from '../../../core/services/cronograma-actividades.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';

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
  collapsedIds = new Set<number>();
  private parentIds = new Set<number>();
  private rowStyleMap = new Map<number, { bg: string; text: string; border?: string }>();
  private avanceMap = new Map<number, number>();

  // Drag & Drop
  dragSrc: ActividadDto | null = null;   // actividad siendo arrastrada
  dragActId: number | null = null;       // id para clase CSS row-dragging
  dropTargetId: number | null = null;
  dropAbove = true;
  guardandoOrden = false;

  // Crear: nivel y padre
  formNivel = 1;
  formPadreId: number | null = null;
  private readonly NIVEL0 = { bg: '#0D1B2A', text: '#E0E1DD' } as const;
  private readonly LEVEL1_ENTRIES: Array<{ base: string; text: string }> = [
    { base: '#1B263B', text: '#E0E1DD' },
    { base: '#415A77', text: '#E0E1DD' },
    { base: '#778DA9', text: '#0D1B2A' },
    { base: '#E0E1DD', text: '#0D1B2A' },
  ];
  private readonly NIVEL2_MAP: Record<string, { bg: string; text: string }> = {
    '#1B263B': { bg: '#2C3E56', text: '#E0E1DD' },
    '#415A77': { bg: '#557090', text: '#E0E1DD' },
    '#778DA9': { bg: '#8fa3b8', text: '#0D1B2A' },
    '#E0E1DD': { bg: '#cacbc7', text: '#0D1B2A' },
  };
  private readonly NIVEL3_MAP: Record<string, { bg: string; text: string; border: string }> = {
    '#2C3E56': { bg: '#dde3ec', text: '#1B263B', border: '#2C3E56' },
    '#557090': { bg: '#e4eaf1', text: '#415A77', border: '#557090' },
    '#8fa3b8': { bg: '#edf1f5', text: '#415A77', border: '#8fa3b8' },
    '#cacbc7': { bg: '#f5f5f4', text: '#778DA9', border: '#cacbc7' },
  };

  // Formulario del modal
  formActividad = '';
  formPlannedStart = '';
  formPlannedEnd = '';
  formActualEnd = '';
  formProgress = 0;
  errorFechaReal = false;

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
    let paletteIdx = 0;
    for (const act of this.actividades) {
      if (act.hierarchyLevel === 0) {
        this.rowStyleMap.set(act.projectActivityId, { ...this.NIVEL0 });
      } else if (act.hierarchyLevel === 1) {
        const e = this.LEVEL1_ENTRIES[paletteIdx % this.LEVEL1_ENTRIES.length];
        this.rowStyleMap.set(act.projectActivityId, { bg: e.base, text: e.text });
        paletteIdx++;
      } else if (act.hierarchyLevel === 2) {
        const n1bg = this.findAncestorBgAtLevel(act, 1);
        const n2 = n1bg ? this.NIVEL2_MAP[n1bg] : null;
        if (n2) this.rowStyleMap.set(act.projectActivityId, { bg: n2.bg, text: n2.text });
      } else {
        const n2bg = this.findAncestorBgAtLevel(act, 2);
        const n3 = n2bg ? this.NIVEL3_MAP[n2bg] : null;
        if (n3) this.rowStyleMap.set(act.projectActivityId, { bg: n3.bg, text: n3.text, border: n3.border });
      }
    }
  }

  private findAncestorBgAtLevel(act: ActividadDto, targetLevel: number): string | null {
    if (act.parentId === null) return null;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    if (!parent) return null;
    if (parent.hierarchyLevel === targetLevel) {
      return this.rowStyleMap.get(parent.projectActivityId)?.bg ?? null;
    }
    return this.findAncestorBgAtLevel(parent, targetLevel);
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
      const label = this.getEstado(act).label;
      const map: Record<string, { bg: string; fg: string }> = {
        CULMINADO:    { bg: 'rgba(74,222,128,0.22)',   fg: '#86efac' },
        VENCIDO:      { bg: 'rgba(248,113,113,0.22)',  fg: '#fca5a5' },
        'EN PROCESO': { bg: 'rgba(147,197,253,0.22)',  fg: '#93c5fd' },
        PENDIENTE:    { bg: 'rgba(209,213,219,0.15)',  fg: '#e5e7eb' },
      };
      const s = map[label] ?? { bg: 'rgba(255,255,255,0.15)', fg: '#ffffff' };
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
      color: this.isDarkBg(act) ? '#90CAF9' : '#1565C0',
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

  getEstado(act: ActividadDto): { label: string; css: string } {
    if (act.actualEndDate) return { label: 'CULMINADO', css: 'badge-verde' };
    const hoy = new Date().toISOString().slice(0, 10);
    if (act.plannedEndDate && act.plannedEndDate < hoy) return { label: 'VENCIDO', css: 'badge-rojo' };
    if (act.plannedStartDate && act.plannedStartDate <= hoy) return { label: 'EN PROCESO', css: 'badge-azul' };
    return { label: 'PENDIENTE', css: 'badge-gris' };
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
    this.guardando = false;
    this.modalOpen = true;
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.guardando = false;
    this.editandoAct = null;
    this.errorFechaReal = false;
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
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
      const body: EditarActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        actualEndDate: this.formActualEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
      };
      this.service.editarActividad(this.editandoId!, body).subscribe({
        next: () => { this.cerrarModal(); this.recargar(); },
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
