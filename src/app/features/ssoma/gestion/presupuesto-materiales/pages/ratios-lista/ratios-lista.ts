import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  FamiliaConRatioDto,
  RatioFamiliaComparacionDto,
  RatioProyectoItemDto,
  TipoDriverRatio,
  RatioDriverComparacionDto,
  RatioDriverProyectoDto,
} from '../../presupuesto.dtos';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

@Component({
  selector: 'app-ratios-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchInput, SearchSelect],
  templateUrl: './ratios-lista.html',
  styleUrl: './ratios-lista.css',
})
export class RatiosListaPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);

  familias: FamiliaConRatioDto[] = [];
  loading = false;
  filtro = '';
  tipoSeleccionado = '';
  variableBaseSeleccionada = '';
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtro.trim()) n++;
    if (this.tipoSeleccionado) n++;
    if (this.variableBaseSeleccionada) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtro = '';
    this.tipoSeleccionado = '';
    this.variableBaseSeleccionada = '';
    this.cdr.markForCheck();
  }

  detalles: Map<number, RatioFamiliaComparacionDto> = new Map();
  cargandoDetalleIds: Set<number> = new Set();
  actualizandoProjectId: number | null = null;
  desactivandoFamiliaId: number | null = null;
  calculandoTodos = false;

  // ── Ratios de dotación (HH / N Trabajadores / Staff por m2) ─────────────────
  hhComparacion: RatioDriverComparacionDto | null = null;
  trabajadoresComparacion: RatioDriverComparacionDto | null = null;
  staffCascoComparacion: RatioDriverComparacionDto | null = null;
  staffOrejeraComparacion: RatioDriverComparacionDto | null = null;
  loadingDrivers = false;
  calculandoDrivers = false;
  actualizandoDriverProjectId: number | null = null;

  /** Ratios de Materiales (por família) y Ratios de Dotación (HH/Trabajadores) son dos mesas de
   * trabajo distintas — separadas en sub-tabs en vez de una encima de la otra en scroll. */
  vistaRatios: 'materiales' | 'dotacion' = 'materiales';

  cambiarVistaRatios(v: 'materiales' | 'dotacion'): void {
    this.vistaRatios = v;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.load();
    this.loadDrivers();
  }

  loadDrivers(): void {
    this.loadingDrivers = true;
    this.cdr.markForCheck();
    this.refrescarDriversSilencioso(() => { this.loadingDrivers = false; this.cdr.markForCheck(); });
  }

  /** Igual que loadDrivers(), pero sin tocar `loadingDrivers` — usado tras tildar "Incluir" o
   * cambiar la fuente de un proyecto. loadDrivers() oculta toda la grilla (*ngIf="!loadingDrivers")
   * mientras recarga, lo que la destruye y la vuelve a montar de cero: eso le hacía perder al
   * navegador la posición de scroll justo donde el usuario estaba trabajando fila por fila. Acá la
   * grilla nunca se desmonta — solo se reasignan los datos de cada tarjeta cuando llegan. */
  private refrescarDriversSilencioso(onHhDone?: () => void): void {
    this.svc.getComparacionDriver('HH').subscribe({
      next: (d) => { this.hhComparacion = d; onHhDone?.(); this.cdr.markForCheck(); },
      error: () => { onHhDone?.(); this.cdr.markForCheck(); },
    });
    this.svc.getComparacionDriver('TRABAJADORES').subscribe({
      next: (d) => { this.trabajadoresComparacion = d; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.svc.getComparacionDriver('STAFF_CASCO').subscribe({
      next: (d) => { this.staffCascoComparacion = d; this.cdr.markForCheck(); },
      error: () => {},
    });
    this.svc.getComparacionDriver('STAFF_OREJERA').subscribe({
      next: (d) => { this.staffOrejeraComparacion = d; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  /** Calcula ratios de TODOS los proyectos con consumo SSOMA estandarizado de una sola vez — evita
   * tener que entrar a la ficha de cada proyecto y darle "Calcular ratios" uno por uno. Duplicado
   * a propósito en Ratios y en Gasto SSOMA — es el mismo cálculo, dos puntos de entrada. */
  calcularTodosLosRatios(): void {
    if (this.calculandoTodos) return;
    this.calculandoTodos = true;
    this.loader.show();
    this.svc.calcularRatiosTodos().subscribe({
      next: (res) => {
        this.calculandoTodos = false;
        this.loader.hide();
        const conAdvertencias = res.proyectos.filter((p) => p.advertencias.length > 0).length;
        Swal.fire({
          icon: 'success',
          title: 'Ratios calculados',
          text: `${res.totalProyectosProcesados} proyecto(s) procesados.` +
            (conAdvertencias > 0 ? ` ${conAdvertencias} con alguna advertencia (revisa la consola/detalle).` : ''),
        });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoTodos = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  calcularDrivers(): void {
    if (this.calculandoDrivers) return;
    this.calculandoDrivers = true;
    this.loader.show();
    this.svc.calcularRatiosDrivers().subscribe({
      next: (res) => {
        this.calculandoDrivers = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: 'Ratios de dotación calculados',
          text: `${res.ratiosCalculados} ratio(s) calculados. ${res.proyectosSinTareo} proyecto(s) con área techada quedaron sin ratio de HH por falta de Tareo registrado (Trabajadores no depende del Tareo, se calcula aparte).`,
        });
        this.loadDrivers();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoDrivers = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleIncluidoDriver(tipo: TipoDriverRatio, p: RatioDriverProyectoDto): void {
    if (this.actualizandoDriverProjectId === p.projectId) return;
    this.actualizandoDriverProjectId = p.projectId;
    this.cdr.markForCheck();
    this.svc.actualizarIncluidoManualDriver(tipo, p.projectId, !p.incluidoManual).subscribe({
      next: () => {
        this.actualizandoDriverProjectId = null;
        this.refrescarDriversSilencioso();
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoDriverProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** El responsable elige, por proyecto, cuál de los 3 valores usar (o "Ninguno" para excluirlo). */
  cambiarFuenteDriver(tipo: TipoDriverRatio, p: RatioDriverProyectoDto, fuente: string): void {
    if (this.actualizandoDriverProjectId === p.projectId) return;
    const valor = fuente === '' ? null : fuente;
    this.actualizandoDriverProjectId = p.projectId;
    this.cdr.markForCheck();
    this.svc.actualizarFuenteCantidadDriver(tipo, p.projectId, valor).subscribe({
      next: () => {
        this.actualizandoDriverProjectId = null;
        this.refrescarDriversSilencioso();
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoDriverProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  driverTipoLabel(tipo: TipoDriverRatio): string {
    switch (tipo) {
      case 'HH': return 'Horas-Hombre por m² de área techada (desde Tareo real)';
      case 'TRABAJADORES': return 'Trabajadores distintos por m² de área techada (total que pasó por la obra)';
      case 'STAFF_CASCO': return 'Staff por m² — señal: casco blanco/ingeniero consumido';
      case 'STAFF_OREJERA': return 'Staff por m² — señal: orejera 3M consumida';
    }
  }

  /** Trabajadores/Staff son enteros (no se cuentan medias personas/medios EPP); HH admite decimales. */
  formatoCantidad(tipo: TipoDriverRatio): string {
    return tipo === 'HH' ? '1.0-2' : '1.0-0';
  }

  // ── Orden de la tabla de Ratios de dotación: cada panel (HH / Trabajadores / Staff) ordena
  // aparte, así el responsable puede comparar por la columna que le interese antes de marcar
  // "Incluir". ──
  private driverSortState: Record<TipoDriverRatio, { col: string; dir: 'asc' | 'desc' }> = {
    HH: { col: 'ratio', dir: 'asc' },
    TRABAJADORES: { col: 'ratio', dir: 'asc' },
    STAFF_CASCO: { col: 'ratio', dir: 'asc' },
    STAFF_OREJERA: { col: 'ratio', dir: 'asc' },
  };

  driverSortCol(tipo: TipoDriverRatio): string { return this.driverSortState[tipo].col; }
  driverSortDir(tipo: TipoDriverRatio): 'asc' | 'desc' { return this.driverSortState[tipo].dir; }

  trackByProjectId(_index: number, p: RatioDriverProyectoDto): number { return p.projectId; }

  ordenarDriver(tipo: TipoDriverRatio, col: string): void {
    const estado = this.driverSortState[tipo];
    estado.dir = estado.col === col && estado.dir === 'asc' ? 'desc' : 'asc';
    estado.col = col;
    this.cdr.markForCheck();
  }

  proyectosOrdenados(d: RatioDriverComparacionDto): RatioDriverProyectoDto[] {
    const { col, dir } = this.driverSortState[d.tipoDriver];
    const factor = dir === 'asc' ? 1 : -1;
    return [...d.proyectos].sort((a, b) => {
      const va = (a as any)[col];
      const vb = (b as any)[col];
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * factor;
      if (typeof va === 'boolean') return (Number(va) - Number(vb)) * factor;
      return (va - vb) * factor;
    });
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarFamiliasConRatio().subscribe({
      next: (f) => {
        this.familias = f;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        // Todas abiertas por defecto: se carga el detalle de cada una.
        f.forEach((fam) => this.cargarDetalle(fam.familiaId));
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get tiposDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.tipoMaterial))).sort();
  }

  /** Valor sintético del filtro Tipo para el panel de Ratios de dotación (HH/Trabajadores) — no
   * es un Tipo real de familia, así que se agrega a mano a las opciones del filtro. */
  readonly TIPO_DOTACION = '__DOTACION__';

  get tiposFilterOptions(): { value: string; label: string }[] {
    return [
      { value: this.TIPO_DOTACION, label: 'Ratios de dotación (HH / Trabajadores)' },
      ...this.tiposDisponibles.map((t) => ({ value: t, label: t })),
    ];
  }

  /** El panel de dotación se ve cuando no hay filtro de Tipo, o cuando se elige explícitamente. */
  get mostrarDotacion(): boolean {
    return !this.tipoSeleccionado || this.tipoSeleccionado === this.TIPO_DOTACION;
  }

  get variableBasesFilterOptions(): { value: string; label: string }[] {
    return this.variableBasesDisponibles.map((vb) => ({ value: vb, label: this.driverLabel(vb) }));
  }

  get variableBasesDisponibles(): string[] {
    return Array.from(new Set(this.familias.map((f) => f.variableBase))).sort();
  }

  /** Agrupa las tarjetas por Tipo (Botiquín, EPC, EPP, etc.) para navegar más intuitivo — no
   * reordena nada, el backend ya entrega las familias ordenadas por Tipo. */
  get gruposPorTipo(): { tipo: string; familias: FamiliaConRatioDto[] }[] {
    const grupos: { tipo: string; familias: FamiliaConRatioDto[] }[] = [];
    for (const f of this.familiasFiltradas) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.tipo === f.tipoMaterial) ultimo.familias.push(f);
      else grupos.push({ tipo: f.tipoMaterial, familias: [f] });
    }
    return grupos;
  }

  trackByTipo(_index: number, grupo: { tipo: string }): string {
    return grupo.tipo;
  }

  trackByFamiliaId(_index: number, f: FamiliaConRatioDto): number {
    return f.familiaId;
  }

  get familiasFiltradas(): FamiliaConRatioDto[] {
    const q = this.filtro.trim().toLowerCase();
    return this.familias.filter((f) => {
      const coincideTexto = !q
        || f.nombreFamilia.toLowerCase().includes(q)
        || f.tipoMaterial.toLowerCase().includes(q);
      const coincideTipo = !this.tipoSeleccionado || f.tipoMaterial === this.tipoSeleccionado;
      const coincideVariableBase = !this.variableBaseSeleccionada
        || f.variableBase === this.variableBaseSeleccionada;
      return coincideTexto && coincideTipo && coincideVariableBase;
    });
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.cdr.markForCheck();
  }

  onTipoChange(valor: string): void {
    this.tipoSeleccionado = valor;
    this.cdr.markForCheck();
  }

  onVariableBaseChange(valor: string): void {
    this.variableBaseSeleccionada = valor;
    this.cdr.markForCheck();
  }

  private cargarDetalle(familiaId: number): void {
    this.cargandoDetalleIds.add(familiaId);
    this.cdr.markForCheck();
    this.svc.getComparacionFamilia(familiaId).subscribe({
      next: (d) => {
        this.detalles.set(familiaId, d);
        this.cargandoDetalleIds.delete(familiaId);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoDetalleIds.delete(familiaId);
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleIncluidoRatio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualRatio, 'RATIO');
  }

  toggleIncluidoPrecio(familiaId: number, p: RatioProyectoItemDto): void {
    this.toggleIncluido(familiaId, p.projectId, !p.incluidoManualPrecio, 'PRECIO');
  }

  private toggleIncluido(
    familiaId: number,
    projectId: number,
    nuevoValor: boolean,
    campo: 'RATIO' | 'PRECIO',
  ): void {
    if (this.actualizandoProjectId === projectId) return;
    this.actualizandoProjectId = projectId;
    this.cdr.markForCheck();
    this.svc.actualizarIncluidoManual(familiaId, projectId, nuevoValor, campo).subscribe({
      next: () => {
        this.actualizandoProjectId = null;
        this.cargarDetalle(familiaId);
      },
      error: (err: HttpErrorResponse) => {
        this.actualizandoProjectId = null;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Desactiva una familia (mismo flag "Activo" de Catálogo) desde su propia tarjeta de Ratios —
   * la saca del cálculo/presupuesto de proyectos nuevos sin borrar su histórico. Pide confirmación
   * porque afecta a todos los proyectos futuros, no solo al que se está revisando. */
  desactivarFamilia(f: FamiliaConRatioDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar "${f.nombreFamilia}"?`,
      text: 'Deja de considerarse en el ratio y el presupuesto de proyectos nuevos. El histórico ya calculado no se toca. Puedes reactivarla luego desde Catálogo.',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.desactivandoFamiliaId = f.familiaId;
      this.cdr.markForCheck();
      this.svc.actualizarActivoFamilia(f.familiaId, false).subscribe({
        next: () => {
          this.desactivandoFamiliaId = null;
          this.familias = this.familias.filter((fam) => fam.familiaId !== f.familiaId);
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.desactivandoFamiliaId = null;
          this.error.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  driverLabel(variableBase: string): string {
    switch (variableBase) {
      case 'HH': return 'Horas-Hombre';
      case 'AREATECHADA': return 'Área Techada (m²)';
      case 'TRABAJADORES': return 'Trabajadores';
      case 'CALCULADO': return 'Calculado (sin ratio real)';
      case 'FIJO': return 'Monto fijo';
      case 'METRADO': return 'Metrado';
      default: return variableBase;
    }
  }

  /**
   * HH y área techada dan ratios diminutos (ej. 0.00003 por HH) — se escalan x1000 solo
   * para que se puedan leer. El valor guardado en la base no cambia, esto es solo pantalla.
   */
  escalaRatio(variableBase: string): number {
    return variableBase === 'HH' || variableBase === 'AREATECHADA' ? 1000 : 1;
  }

  /**
   * Qué tan confiable es la mediana según cuántos proyectos la respaldan.
   * No es un cálculo estadístico formal, es una guía simple para no confiar
   * igual en una mediana de 2 proyectos que en una de 15.
   */
  confianzaLabel(nProyectos: number): string {
    if (nProyectos >= 6) return 'Alta';
    if (nProyectos >= 3) return 'Media';
    return 'Baja';
  }

  confianzaClass(nProyectos: number): string {
    if (nProyectos >= 6) return 'badge-ok';
    if (nProyectos >= 3) return 'badge-warn';
    return 'badge-danger';
  }
}
