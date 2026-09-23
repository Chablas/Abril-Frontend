import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ViajeResiduoService } from '../../services/viaje-residuo.service';
import { ResiduoViajeDto, ResiduoViajeUpsertDto, ResiduoViajePagedDto } from '../../dtos/viaje-residuo.dtos';
import { TipoResiduoService } from '../../../tipos/services/tipo-residuo.service';
import { ResiduoTipoDto } from '../../../tipos/dtos/tipo-residuo.dtos';
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
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { DEFAULT_PAGE_SIZE } from '../../../../../../../shared/constants/pagination';
import { RESIDUOS_TABS } from '../../../residuos-tabs';

const ORIGEN_OPTIONS = [
  { value: 'DEMOLICION', label: 'Demolición' },
  { value: 'EXCAVACION', label: 'Excavación' },
  { value: 'CONSTRUCCION', label: 'Construcción' },
  { value: 'OTRO', label: 'Otro' },
];

const TIPO_MANEJO_OPTIONS = [
  { value: 'ALMACENADO', label: 'Almacenado' },
  { value: 'TRATADO', label: 'Tratado' },
  { value: 'ACONDICIONADO', label: 'Acondicionado' },
  { value: 'VALORIZADO', label: 'Valorizado' },
  { value: 'COMERCIALIZADO', label: 'Comercializado' },
  { value: 'DISPOSICION_FINAL', label: 'Disposición final' },
];

@Component({
  selector: 'app-viaje-lista',
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
    SearchSelect,
  ],
  templateUrl: './viaje-lista.html',
  styleUrl: './viaje-lista.css',
})
export class ViajeLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  readonly origenOptions = ORIGEN_OPTIONS;
  readonly tipoManejoOptions = TIPO_MANEJO_OPTIONS;

  result: ResiduoViajePagedDto | null = null;
  loading = false;
  pagina = 1;
  tamanoPagina = DEFAULT_PAGE_SIZE;

  proyectos: ProyectoSsomaSimpleDTO[] = [];
  tiposResiduo: ResiduoTipoDto[] = [];
  eoRsList: ResiduoEoRsDto[] = [];

  filtrosAbiertos = false;
  filtroProjectId: number | null = null;
  filtroResiduoTipoId: number | null = null;
  filtroEoRsId: number | null = null;
  filtroFechaDesde: string | null = null;
  filtroFechaHasta: string | null = null;

  modalAbierto = false;
  guardando = false;
  editando: ResiduoViajeDto | null = null;
  archivo: File | null = null;
  form: ResiduoViajeUpsertDto = this.formVacio();

  constructor(
    private service: ViajeResiduoService,
    private tipoResiduoService: TipoResiduoService,
    private eoRsService: EoRsService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private formVacio(): ResiduoViajeUpsertDto {
    return {
      projectId: 0,
      autorizacionDmeId: null,
      residuoTipoId: 0,
      eoRsId: 0,
      contratista: '',
      origen: null,
      fecha: '',
      cantidadM3: 0,
      cantidadTon: null,
      tipoManejo: 'ALMACENADO',
      gestorReceptor: '',
      destinoFinal: '',
      numeroRegistro: '',
      numeroCertificado: '',
    };
  }

  ngOnInit(): void {
    this.load();
    this.proyectoService.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = [...res].sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.tipoResiduoService.getAll(true).subscribe({
      next: (res) => {
        this.tiposResiduo = [...res].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.eoRsService.getAll(true).subscribe({
      next: (res) => {
        this.eoRsList = [...res].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service
      .getAll({
        pagina: this.pagina,
        tamanoPagina: this.tamanoPagina,
        projectId: this.filtroProjectId ?? undefined,
        residuoTipoId: this.filtroResiduoTipoId ?? undefined,
        eoRsId: this.filtroEoRsId ?? undefined,
        fechaDesde: this.filtroFechaDesde ?? undefined,
        fechaHasta: this.filtroFechaHasta ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.result = res;
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
    if (this.filtroProjectId !== null) n++;
    if (this.filtroResiduoTipoId !== null) n++;
    if (this.filtroEoRsId !== null) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtroProjectId = null;
    this.filtroResiduoTipoId = null;
    this.filtroEoRsId = null;
    this.filtroFechaDesde = null;
    this.filtroFechaHasta = null;
    this.buscar();
  }

  buscar(): void {
    this.pagina = 1;
    this.load();
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > Math.ceil(this.result.total / this.result.tamanoPagina))) return;
    this.pagina = p;
    this.load();
  }

  get totalPages(): number {
    if (!this.result) return 1;
    return Math.max(1, Math.ceil(this.result.total / this.result.tamanoPagina));
  }

  abrirNuevo(): void {
    this.editando = null;
    this.archivo = null;
    this.form = this.formVacio();
    this.modalAbierto = true;
  }

  abrirEditar(item: ResiduoViajeDto): void {
    this.editando = item;
    this.archivo = null;
    this.form = {
      projectId: item.projectId,
      autorizacionDmeId: item.autorizacionDmeId ?? null,
      residuoTipoId: item.residuoTipoId,
      eoRsId: item.eoRsId,
      contratista: item.contratista ?? '',
      origen: item.origen ?? null,
      fecha: item.fecha.substring(0, 10),
      cantidadM3: item.cantidadM3,
      cantidadTon: item.cantidadTon ?? null,
      tipoManejo: item.tipoManejo,
      gestorReceptor: item.gestorReceptor ?? '',
      destinoFinal: item.destinoFinal ?? '',
      numeroRegistro: item.numeroRegistro ?? '',
      numeroCertificado: item.numeroCertificado ?? '',
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.editando = null;
  }

  guardar(): void {
    if (!this.form.projectId || !this.form.residuoTipoId || !this.form.eoRsId || !this.form.fecha) return;
    this.guardando = true;
    const obs: Observable<any> = this.editando ? this.service.update(this.editando.id, this.form) : this.service.create(this.form);
    obs.subscribe({
      next: (res: any) => {
        const id = this.editando ? this.editando.id : res?.id;
        if (this.archivo && id) {
          this.service.subirArchivo(id, this.archivo).subscribe();
        }
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

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
  }

  eliminar(item: ResiduoViajeDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar el viaje #${item.id}${item.nombreEoRs ? ' (' + item.nombreEoRs + ')' : ''}?`,
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
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
