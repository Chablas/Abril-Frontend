import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { AutorizacionDmeService } from '../../services/autorizacion-dme.service';
import { ResiduoAutorizacionDmeDto, ResiduoAutorizacionDmeUpsertDto } from '../../dtos/autorizacion-dme.dtos';
import { EoRsService } from '../../../eo-rs/services/eo-rs.service';
import { ResiduoEoRsDto } from '../../../eo-rs/dtos/eo-rs.dtos';
import { ProyectoHabilitadoService } from '../../../../../shared/services/proyecto-habilitado.service';
import { ProyectoSsomaSimpleDTO } from '../../../../../shared/dtos/proyecto-habilitado.dtos';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../../shared/components/fab-button/fab-button';
import { AbrilModalPanel } from '../../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { Paginator } from '../../../../../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../../../../../shared/utils/client-pager';
import { RESIDUOS_TABS } from '../../../residuos-tabs';

const ESTADO_OPTIONS = [
  { value: 'VIGENTE', label: 'Vigente' },
  { value: 'VENCIDA', label: 'Vencida' },
  { value: 'ANULADA', label: 'Anulada' },
];

const DIAS_ALERTA_VENCIMIENTO = 30;

@Component({
  selector: 'app-autorizacion-dme-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    FabButton,
    AbrilModalPanel,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './autorizacion-dme-lista.html',
  styleUrl: './autorizacion-dme-lista.css',
})
export class AutorizacionDmeLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  readonly estadoOptions = ESTADO_OPTIONS;

  items: ResiduoAutorizacionDmeDto[] = [];
  proyectos: ProyectoSsomaSimpleDTO[] = [];
  escombreras: ResiduoEoRsDto[] = [];
  loading = false;

  searchText = '';
  estadoFilter: string | null = null;
  proyectoFilter: number | null = null;
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ResiduoAutorizacionDmeDto>();

  modalAbierto = false;
  guardando = false;
  editando: ResiduoAutorizacionDmeDto | null = null;
  archivo: File | null = null;
  form: ResiduoAutorizacionDmeUpsertDto = {
    projectId: 0,
    municipalidad: '',
    numeroResolucion: '',
    escombreraDestinoId: null,
    vigenciaDesde: '',
    vigenciaHasta: '',
    placasAutorizadas: '',
    estado: 'VIGENTE',
  };

  constructor(
    private service: AutorizacionDmeService,
    private eoRsService: EoRsService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.proyectoService.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = [...res].sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.eoRsService.getAll(true).subscribe({
      next: (res) => {
        const disposicion = res.filter((e) => e.tipoOperador === 'DISPOSICION_FINAL');
        this.escombreras = (disposicion.length ? disposicion : res).sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial),
        );
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (res) => {
        this.items = res;
        this.pager.reset();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    if (this.proyectoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.proyectoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.detectChanges();
  }

  get filteredItems(): ResiduoAutorizacionDmeDto[] {
    return this.items.filter((a) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(a.numeroResolucion ?? '', this.searchText) ||
        SearchInput.matches(a.municipalidad ?? '', this.searchText);
      const matchesEstado = this.estadoFilter === null || a.estado === this.estadoFilter;
      const matchesProyecto = this.proyectoFilter === null || a.projectId === this.proyectoFilter;
      return matchesTexto && matchesEstado && matchesProyecto;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredItems);
  }

  get pagedItems(): ResiduoAutorizacionDmeDto[] {
    return this.pager.page(this.filteredItems);
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  diasParaVencer(fecha: string): number {
    const ms = new Date(fecha).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  esVencidaOProxima(item: ResiduoAutorizacionDmeDto): boolean {
    if (item.estado !== 'VIGENTE') return false;
    return this.diasParaVencer(item.vigenciaHasta) < DIAS_ALERTA_VENCIMIENTO;
  }

  claseAlerta(item: ResiduoAutorizacionDmeDto): string {
    if (item.estado !== 'VIGENTE') return '';
    const dias = this.diasParaVencer(item.vigenciaHasta);
    if (dias < 0) return 'chip-alerta--vencida';
    if (dias < DIAS_ALERTA_VENCIMIENTO) return 'chip-alerta--proxima';
    return '';
  }

  abrirNuevo(): void {
    this.editando = null;
    this.archivo = null;
    this.form = {
      projectId: 0,
      municipalidad: '',
      numeroResolucion: '',
      escombreraDestinoId: null,
      vigenciaDesde: '',
      vigenciaHasta: '',
      placasAutorizadas: '',
      estado: 'VIGENTE',
    };
    this.modalAbierto = true;
  }

  abrirEditar(item: ResiduoAutorizacionDmeDto): void {
    this.editando = item;
    this.archivo = null;
    this.form = {
      projectId: item.projectId,
      municipalidad: item.municipalidad,
      numeroResolucion: item.numeroResolucion,
      escombreraDestinoId: item.escombreraDestinoId ?? null,
      vigenciaDesde: item.vigenciaDesde.substring(0, 10),
      vigenciaHasta: item.vigenciaHasta.substring(0, 10),
      placasAutorizadas: item.placasAutorizadas ?? '',
      estado: item.estado,
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.editando = null;
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
  }

  guardar(): void {
    if (!this.form.municipalidad.trim() || !this.form.numeroResolucion.trim() || !this.form.projectId) return;
    this.guardando = true;
    const obs: Observable<any> = this.editando
      ? this.service.update(this.editando.id, this.form)
      : this.service.create(this.form, this.archivo);
    obs.subscribe({
      next: () => {
        this.guardando = false;
        this.modalAbierto = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminar(item: ResiduoAutorizacionDmeDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Anular la autorización "${item.numeroResolucion}"?`,
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(item.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
