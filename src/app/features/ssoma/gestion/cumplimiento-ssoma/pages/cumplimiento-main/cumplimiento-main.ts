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

type Tab = 'mio' | 'resumen' | 'historico' | 'catalogo';

const FRECUENCIAS: { value: CumplimientoFrecuencia; label: string; icono: string }[] = [
  { value: 'diaria', label: 'Diaria', icono: 'ti-sun' },
  { value: 'semanal', label: 'Semanal', icono: 'ti-calendar-week' },
  { value: 'mensual', label: 'Mensual', icono: 'ti-calendar-month' },
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
  observacionTemp: { [actividadId: number]: string } = {};

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
        this.observacionTemp = {};
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
          observacion: this.observacionTemp[item.actividadId] || undefined,
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
  marcarEstadoWrapper = (proyectoId: number, item: CumplimientoItemDto, estado: CumplimientoEstado): void =>
    this.marcarEstado(proyectoId, item, estado);

  // ─── Mi Checklist (auto: rol + proyecto actual del usuario, pensado para celular) ──

  miResumen: CumplimientoMiResumenDto | null = null;
  loadingMio = false;
  frecuenciaActivaMio: CumplimientoFrecuencia = 'diaria';

  get actividadesMioPorFrecuencia(): CumplimientoItemDto[] {
    return (this.miResumen?.actividades ?? []).filter((a) => a.frecuencia === this.frecuenciaActivaMio);
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
    this.historicoDesde = f === 'mensual' ? haceDiasIso(365) : f === 'semanal' ? haceDiasIso(90) : haceDiasIso(30);
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

  get catalogoCurrentPage(): number {
    return this.catalogoPager.currentPage;
  }
  get catalogoTotalPages(): number {
    return this.catalogoPager.totalPages(this.actividadesCatalogo);
  }
  get catalogoPaged(): CumplimientoActividadDto[] {
    return this.catalogoPager.page(this.actividadesCatalogo);
  }
  changeCatalogoPage(page: number): void {
    this.catalogoPager.goTo(page);
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
    return { nombre: '', descripcion: '', rolResponsable: 'ambos', frecuencia: 'diaria', orden: 0 };
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
