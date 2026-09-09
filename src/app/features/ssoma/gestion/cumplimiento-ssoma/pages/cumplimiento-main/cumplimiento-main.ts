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

type Tab = 'resumen' | 'catalogo';

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

  tab: Tab = 'resumen';

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  actividades: CumplimientoItemDto[] = [];
  loadingResumen = false;
  frecuenciaActiva: CumplimientoFrecuencia = 'diaria';

  guardandoActividadId: number | null = null;
  observacionTemp: { [actividadId: number]: string } = {};

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Por Proyecto', icono: 'ti-building', active: this.tab === 'resumen' },
      { label: 'Catálogo de Actividades', icono: 'ti-list-check', active: this.tab === 'catalogo' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    this.tab = t.label === 'Por Proyecto' ? 'resumen' : 'catalogo';
    if (this.tab === 'catalogo' && this.actividadesCatalogo.length === 0) this.loadCatalogo();
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
        cumplidas: items.filter((i) => i.cumplido).length,
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

  toggleActividad(item: CumplimientoItemDto): void {
    if (!this.proyectoId || this.guardandoActividadId === item.actividadId) return;
    this.guardandoActividadId = item.actividadId;
    this.cdr.markForCheck();

    const nuevoEstado = !item.cumplido;
    this.svc
      .marcar(this.proyectoId, item.actividadId, {
        cumplido: nuevoEstado,
        observacion: this.observacionTemp[item.actividadId] || undefined,
      })
      .subscribe({
        next: (res) => {
          item.cumplido = res.cumplido;
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
