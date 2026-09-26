import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { CumplimientoSsomaService } from '../../cumplimiento-ssoma.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  CumplimientoActividadDto,
  CumplimientoActividadUpsertDto,
  CumplimientoItemDto,
  CumplimientoFrecuencia,
  CumplimientoRol,
  CumplimientoEstado,
  CumplimientoMiResumenDto,
  CumplimientoHistoricoDiaDto,
} from '../../cumplimiento-ssoma.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

interface GrupoCategoria {
  categoria: string;
  items: CumplimientoItemDto[];
  total: number;
  cumplidas: number;
}

const SIN_CATEGORIA = 'Otros';

type Tab = 'mio' | 'resumen' | 'historico' | 'catalogo';

const FRECUENCIAS: { value: CumplimientoFrecuencia; label: string; icono: string }[] = [
  { value: 'diaria', label: 'Diaria', icono: 'ti-sun' },
  { value: 'semanal', label: 'Semanal', icono: 'ti-calendar-week' },
  { value: 'mensual', label: 'Mensual', icono: 'ti-calendar-month' },
  { value: 'anual', label: 'Anual', icono: 'ti-calendar-stats' },
];

const ROLES: { value: CumplimientoRol; label: string }[] = [
  { value: 'coordinador_ssoma', label: 'Coordinador SSOMA' },
  { value: 'prevencionista', label: 'Prevencionista' },
  { value: 'ambos', label: 'Ambos' },
];

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function haceDiasIso(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-cumplimiento-main',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    AbrilModalPanel,
    Paginator,
    SearchSelect,
  ],
  templateUrl: './cumplimiento-main.html',
  styleUrl: './cumplimiento-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CumplimientoMainComponent implements OnInit {
  private svc = inject(CumplimientoSsomaService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  readonly frecuencias = FRECUENCIAS;
  readonly roles = ROLES;

  tab: Tab = 'mio';

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  actividades: CumplimientoItemDto[] = [];
  loadingResumen = false;
  frecuenciaActiva: CumplimientoFrecuencia = 'diaria';

  guardandoActividadId: number | null = null;

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Mi Checklist', icono: 'ti-checkup-list', active: this.tab === 'mio' },
      { label: 'Por Proyecto', icono: 'ti-building', active: this.tab === 'resumen' },
      { label: 'Histórico', icono: 'ti-chart-bar', active: this.tab === 'historico' },
      { label: 'Catálogo de Actividades', icono: 'ti-list-check', active: this.tab === 'catalogo' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    const map: { [k: string]: Tab } = {
      'Mi Checklist': 'mio',
      'Por Proyecto': 'resumen',
      'Histórico': 'historico',
      'Catálogo de Actividades': 'catalogo',
    };
    this.tab = map[t.label] ?? 'mio';
    if (this.tab === 'mio' && !this.miResumen) this.loadMiResumen();
    if (this.tab === 'catalogo' && this.actividadesCatalogo.length === 0) this.loadCatalogo();
    if (this.tab === 'historico' && this.proyectos.length > 0 && !this.historicoProyectoId) {
      this.historicoProyectoId = this.proyectoId ?? this.proyectos[0].projectId;
      this.loadHistorico();
    }
    this.cdr.markForCheck();
  }

  get actividadesPorFrecuencia(): CumplimientoItemDto[] {
    return this.actividades
      .filter((a) => a.frecuencia === this.frecuenciaActiva)
      .sort((a, b) => a.rolResponsable.localeCompare(b.rolResponsable));
  }

  get gruposResumen(): GrupoCategoria[] {
    return this.agruparPorCategoria(this.actividadesPorFrecuencia, `resumen|${this.frecuenciaActiva}`);
  }

  // ─── Agrupación por categoría (acordeón) ────────────────────────────────────
  // Todas las categorías empiezan cerradas — el prevencionista las va abriendo
  // una por una a medida que trabaja, en vez de recibir la pantalla ya abierta
  // de punta a punta. `contexto` evita que dos vistas distintas (mío vs.
  // por-proyecto, o una frecuencia vs. otra) compartan el mismo estado.
  private categoriasAbiertas = new Set<string>();

  private agruparPorCategoria(items: CumplimientoItemDto[], contexto: string): GrupoCategoria[] {
    const mapa = new Map<string, CumplimientoItemDto[]>();
    for (const item of items) {
      const cat = item.categoria?.trim() || SIN_CATEGORIA;
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(item);
    }
    return Array.from(mapa.entries()).map(([categoria, its]) => ({
      categoria,
      items: its,
      total: its.length,
      cumplidas: its.filter((i) => i.estado === 'cumplido').length,
    }));
  }

  private categoriaKey(contexto: string, categoria: string): string {
    return `${contexto}|${categoria}`;
  }

  categoriaAbierta(contexto: string, categoria: string): boolean {
    return this.categoriasAbiertas.has(this.categoriaKey(contexto, categoria));
  }

  toggleCategoria(contexto: string, categoria: string): void {
    const key = this.categoriaKey(contexto, categoria);
    if (this.categoriasAbiertas.has(key)) this.categoriasAbiertas.delete(key);
    else this.categoriasAbiertas.add(key);
    this.cdr.markForCheck();
  }

  // ─── Ciclo de estado con un solo tap: pendiente → cumplido → no_aplica → pendiente ──
  // Reutiliza marcarEstado tal cual: al pasar el mismo estado que ya tiene, esa función
  // ya lo regresa a "pendiente" (toggle), así que solo hay que pedir el siguiente estado
  // del ciclo — no hace falta una rama nueva para "volver a pendiente".
  cicloEstado(proyectoId: number, item: CumplimientoItemDto): void {
    const siguiente: CumplimientoEstado = item.estado === 'pendiente' ? 'cumplido' : 'no_aplica';
    this.marcarEstado(proyectoId, item, siguiente);
  }

  iconoEstado(estado: CumplimientoEstado): string {
    switch (estado) {
      case 'cumplido': return 'ti-check';
      case 'no_aplica': return 'ti-ban';
      default: return 'ti-circle';
    }
  }

  // ─── Observación: icono + modal, en vez de un input siempre visible ────────────
  obsModalItem: CumplimientoItemDto | null = null;
  obsModalProyectoId: number | null = null;
  obsModalTexto = '';
  guardandoObs = false;

  abrirObsModal(proyectoId: number, item: CumplimientoItemDto): void {
    this.obsModalItem = item;
    this.obsModalProyectoId = proyectoId;
    this.obsModalTexto = item.observacion ?? '';
    this.cdr.markForCheck();
  }

  cerrarObsModal(): void {
    this.obsModalItem = null;
    this.obsModalProyectoId = null;
    this.obsModalTexto = '';
    this.cdr.markForCheck();
  }

  guardarObs(): void {
    if (!this.obsModalItem || !this.obsModalProyectoId) return;
    const item = this.obsModalItem;
    const proyectoId = this.obsModalProyectoId;
    this.guardandoObs = true;
    this.cdr.markForCheck();
    this.svc
      .marcar(proyectoId, item.actividadId, {
        estado: item.estado,
        motivoNoAplica: item.motivoNoAplica,
        observacion: this.obsModalTexto.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          item.observacion = res.observacion;
          this.guardandoObs = false;
          this.cerrarObsModal();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoObs = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  get frecuenciaChips(): { key: CumplimientoFrecuencia; label: string; icono: string; total: number; cumplidas: number }[] {
    return this.frecuencias.map((f) => {
      const items = this.actividades.filter((a) => a.frecuencia === f.value);
      return {
        key: f.value,
        label: f.label,
        icono: f.icono,
        total: items.length,
        cumplidas: items.filter((i) => i.estado === 'cumplido').length,
      };
    });
  }

  rolLabel(rol: CumplimientoRol): string {
    return ROLES.find((r) => r.value === rol)?.label ?? rol;
  }

  setFrecuencia(f: CumplimientoFrecuencia): void {
    this.frecuenciaActiva = f;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadProyectos();
    this.loadMiResumen();
  }

  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res
          .map((p) => ({ projectId: p.projectId, projectDescription: p.projectDescription }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));

        if (!this.proyectoId && this.proyectos.length > 0) {
          this.proyectoId = this.proyectos[0].projectId;
          this.onProyectoChange();
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onProyectoChange(): void {
    if (!this.proyectoId) {
      this.actividades = [];
      this.cdr.markForCheck();
      return;
    }
    this.loadResumen();
  }

  loadResumen(): void {
    if (!this.proyectoId) return;
    this.loadingResumen = true;
    this.cdr.markForCheck();
    this.svc.getResumen(this.proyectoId).subscribe({
      next: (res) => {
        this.actividades = res.actividades;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // Marca/desmarca una actividad: si ya estaba en ese estado, la regresa a "pendiente"
  // (toggle) — así el mismo botón sirve para marcar y para deshacer un clic accidental.
  marcarEstado(proyectoId: number, item: CumplimientoItemDto, estado: CumplimientoEstado): void {
    if (this.guardandoActividadId === item.actividadId) return;

    const aplicar = (nuevoEstado: CumplimientoEstado, motivo?: string) => {
      this.guardandoActividadId = item.actividadId;
      this.cdr.markForCheck();
      this.svc
        .marcar(proyectoId, item.actividadId, {
          estado: nuevoEstado,
          motivoNoAplica: motivo,
          observacion: item.observacion || undefined,
        })
        .subscribe({
          next: (res) => {
            item.estado = res.estado;
            item.motivoNoAplica = res.motivoNoAplica;
            item.fechaCumplimiento = res.fechaCumplimiento;
            item.cumplidoPor = res.cumplidoPor;
            item.observacion = res.observacion;
            this.guardandoActividadId = null;
            this.cdr.markForCheck();
          },
          error: (err: HttpErrorResponse) => {
            this.guardandoActividadId = null;
            this.errorSvc.handleError(err);
            this.cdr.markForCheck();
          },
        });
    };

    const nuevoEstado: CumplimientoEstado = item.estado === estado ? 'pendiente' : estado;

    if (nuevoEstado === 'no_aplica') {
      Swal.fire({
        icon: 'question',
        title: 'No aplica',
        input: 'text',
        inputPlaceholder: 'Motivo (opcional, ej. etapa del proyecto aún no lo requiere)',
        showCancelButton: true,
        confirmButtonText: 'Marcar como no aplica',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (!result.isConfirmed) return;
        aplicar('no_aplica', (result.value as string | undefined)?.trim() || undefined);
      });
      return;
    }

    aplicar(nuevoEstado);
  }

  // Wrapper con `this` fijo, para usarlo como callback desde el ng-template compartido.
  cicloEstadoWrapper = (proyectoId: number, item: CumplimientoItemDto): void =>
    this.cicloEstado(proyectoId, item);

  abrirObsModalWrapper = (proyectoId: number, item: CumplimientoItemDto): void =>
    this.abrirObsModal(proyectoId, item);

  // ─── Mi Checklist (auto: rol + proyecto actual del usuario, pensado para celular) ──

  miResumen: CumplimientoMiResumenDto | null = null;
  loadingMio = false;
  frecuenciaActivaMio: CumplimientoFrecuencia = 'diaria';

  get actividadesMioPorFrecuencia(): CumplimientoItemDto[] {
    return (this.miResumen?.actividades ?? []).filter((a) => a.frecuencia === this.frecuenciaActivaMio);
  }

  get gruposMio(): GrupoCategoria[] {
    return this.agruparPorCategoria(this.actividadesMioPorFrecuencia, `mio|${this.frecuenciaActivaMio}`);
  }

  get frecuenciaChipsMio(): { key: CumplimientoFrecuencia; label: string; icono: string; total: number; cumplidas: number }[] {
    const items = this.miResumen?.actividades ?? [];
    return this.frecuencias.map((f) => {
      const delGrupo = items.filter((a) => a.frecuencia === f.value);
      return {
        key: f.value,
        label: f.label,
        icono: f.icono,
        total: delGrupo.length,
        cumplidas: delGrupo.filter((i) => i.estado === 'cumplido').length,
      };
    });
  }

  setFrecuenciaMio(f: CumplimientoFrecuencia): void {
    this.frecuenciaActivaMio = f;
    this.cdr.markForCheck();
  }

  loadMiResumen(): void {
    this.loadingMio = true;
    this.cdr.markForCheck();
    this.svc.getMiResumen().subscribe({
      next: (res) => {
        this.miResumen = res;
        this.loadingMio = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingMio = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Histórico / indicadores ────────────────────────────────────────────────

  historicoProyectoId: number | null = null;
  historicoFrecuencia: CumplimientoFrecuencia = 'diaria';
  historicoDesde = haceDiasIso(30);
  historicoHasta = hoyIso();
  historicoDias: CumplimientoHistoricoDiaDto[] = [];
  loadingHistorico = false;

  onHistoricoProyectoChange(): void {
    this.loadHistorico();
  }

  setHistoricoFrecuencia(f: CumplimientoFrecuencia): void {
    this.historicoFrecuencia = f;
    this.historicoDesde =
      f === 'anual' ? haceDiasIso(1825) : f === 'mensual' ? haceDiasIso(365) : f === 'semanal' ? haceDiasIso(90) : haceDiasIso(30);
    this.loadHistorico();
  }

  loadHistorico(): void {
    if (!this.historicoProyectoId) return;
    this.loadingHistorico = true;
    this.cdr.markForCheck();
    this.svc
      .getHistorico(this.historicoProyectoId, this.historicoFrecuencia, this.historicoDesde, this.historicoHasta)
      .subscribe({
        next: (res) => {
          this.historicoDias = [...res.dias].reverse();
          this.loadingHistorico = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loadingHistorico = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  get promedioHistorico(): number {
    if (this.historicoDias.length === 0) return 0;
    const suma = this.historicoDias.reduce((acc, d) => acc + d.porcentajeCumplimiento, 0);
    return Math.round((suma / this.historicoDias.length) * 10) / 10;
  }

  // ─── Catálogo de actividades ────────────────────────────────────────────────

  actividadesCatalogo: CumplimientoActividadDto[] = [];
  loadingCatalogo = false;
  private readonly catalogoPager = new ClientPager<CumplimientoActividadDto>();

  filtroCatalogoFrecuencia: CumplimientoFrecuencia | null = null;
  filtroCatalogoRol: CumplimientoRol | null = null;
  filtroCatalogoTexto = '';

  readonly opcionesFiltroFrecuencia = [{ value: null, label: 'Todas las frecuencias' }, ...FRECUENCIAS];
  readonly opcionesFiltroRol = [{ value: null, label: 'Todos los responsables' }, ...ROLES];

  get categoriasExistentes(): string[] {
    const set = new Set(
      this.actividadesCatalogo.map((a) => a.categoria?.trim()).filter((c): c is string => !!c),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  get actividadesCatalogoFiltradas(): CumplimientoActividadDto[] {
    const texto = this.filtroCatalogoTexto.trim().toLowerCase();
    return this.actividadesCatalogo.filter((a) =>
      (!this.filtroCatalogoFrecuencia || a.frecuencia === this.filtroCatalogoFrecuencia) &&
      (!this.filtroCatalogoRol || a.rolResponsable === this.filtroCatalogoRol) &&
      (!texto || a.nombre.toLowerCase().includes(texto) || (a.categoria ?? '').toLowerCase().includes(texto)),
    );
  }

  get filtrosCatalogoActivos(): boolean {
    return !!(this.filtroCatalogoFrecuencia || this.filtroCatalogoRol || this.filtroCatalogoTexto.trim());
  }

  limpiarFiltrosCatalogo(): void {
    this.filtroCatalogoFrecuencia = null;
    this.filtroCatalogoRol = null;
    this.filtroCatalogoTexto = '';
    this.catalogoPager.reset();
    this.cdr.markForCheck();
  }

  onFiltroCatalogoChange(): void {
    this.catalogoPager.reset();
    this.cdr.markForCheck();
  }

  get catalogoCurrentPage(): number {
    return this.catalogoPager.currentPage;
  }
  get catalogoTotalPages(): number {
    return this.catalogoPager.totalPages(this.actividadesCatalogoFiltradas);
  }
  // Fila de la tabla del catálogo: o un separador de categoría, o una actividad.
  // Se arma sobre `catalogoPaged` (ya paginado) — si una categoría queda partida
  // entre dos páginas, su encabezado se repite al tope de la siguiente, que es
  // el comportamiento esperado de una tabla paginada agrupada.
  get catalogoFilas(): ({ tipo: 'categoria'; categoria: string } | { tipo: 'actividad'; actividad: CumplimientoActividadDto })[] {
    const filas: ({ tipo: 'categoria'; categoria: string } | { tipo: 'actividad'; actividad: CumplimientoActividadDto })[] = [];
    let categoriaAnterior: string | null = null;
    for (const a of this.catalogoPaged) {
      const categoria = a.categoria?.trim() || 'Sin categoría';
      if (categoria !== categoriaAnterior) {
        filas.push({ tipo: 'categoria', categoria });
        categoriaAnterior = categoria;
      }
      filas.push({ tipo: 'actividad', actividad: a });
    }
    return filas;
  }

  get catalogoPaged(): CumplimientoActividadDto[] {
    return this.catalogoPager.page(this.actividadesCatalogoFiltradas);
  }
  changeCatalogoPage(page: number): void {
    this.catalogoPager.goTo(page);
  }

  eliminarActividad(a: CumplimientoActividadDto, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar actividad?',
      text: `"${a.nombre}" se quitará del catálogo. Si ya tiene cumplimientos registrados, se desactivará en vez de borrarse.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.svc.deleteActividad(a.id).subscribe({
        next: () => this.loadCatalogo(),
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }

  loadCatalogo(): void {
    this.loadingCatalogo = true;
    this.cdr.markForCheck();
    this.svc.getActividades().subscribe({
      next: (res) => {
        this.actividadesCatalogo = res;
        this.catalogoPager.reset();
        this.loadingCatalogo = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCatalogo = false;
        this.cdr.markForCheck();
      },
    });
  }

  frecuenciaLabel(f: CumplimientoFrecuencia): string {
    return FRECUENCIAS.find((x) => x.value === f)?.label ?? f;
  }

  // ── Crear / Editar actividad ─────────────────────────────────────────────
  showFormModal = false;
  editandoId: number | null = null;
  saving = false;
  form: CumplimientoActividadUpsertDto = this.formVacio();

  private formVacio(): CumplimientoActividadUpsertDto {
    return { nombre: '', descripcion: '', categoria: '', rolResponsable: 'ambos', frecuencia: 'diaria', orden: 0 };
  }

  abrirNuevaActividad(): void {
    this.editandoId = null;
    this.form = this.formVacio();
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  abrirEditarActividad(a: CumplimientoActividadDto): void {
    this.editandoId = a.id;
    this.form = {
      nombre: a.nombre,
      descripcion: a.descripcion,
      categoria: a.categoria,
      rolResponsable: a.rolResponsable,
      frecuencia: a.frecuencia,
      orden: a.orden,
    };
    this.showFormModal = true;
    this.cdr.markForCheck();
  }

  cerrarFormModal(): void {
    this.showFormModal = false;
    this.cdr.markForCheck();
  }

  get canSubmitForm(): boolean {
    return !!(this.form.nombre.trim() && !this.saving);
  }

  guardarActividad(): void {
    if (!this.canSubmitForm) return;
    this.saving = true;
    this.cdr.markForCheck();
    const obs: Observable<unknown> = this.editandoId
      ? this.svc.updateActividad(this.editandoId, this.form)
      : this.svc.createActividad(this.form);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showFormModal = false;
        this.loadCatalogo();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
