import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { EoRsService } from '../../services/eo-rs.service';
import {
  ResiduoEoRsDto,
  ResiduoEoRsUpsertDto,
  ResiduoEoRsDocumentoDto,
  ResiduoEoRsDocumentoUpsertDto,
} from '../../dtos/eo-rs.dtos';
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

const TIPO_OPERADOR_OPTIONS = [
  { value: 'TRANSPORTISTA', label: 'Transportista' },
  { value: 'DISPOSICION_FINAL', label: 'Disposición final' },
  { value: 'VALORIZACION', label: 'Valorización' },
  { value: 'COMERCIALIZADORA', label: 'Comercializadora' },
];

const AMBITO_GESTION_OPTIONS = [
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'NO_MUNICIPAL', label: 'No municipal' },
];

@Component({
  selector: 'app-eo-rs-lista',
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
  templateUrl: './eo-rs-lista.html',
  styleUrl: './eo-rs-lista.css',
})
export class EoRsLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  readonly tipoOperadorOptions = TIPO_OPERADOR_OPTIONS;
  readonly ambitoGestionOptions = AMBITO_GESTION_OPTIONS;

  items: ResiduoEoRsDto[] = [];
  loading = false;

  searchText = '';
  activoFilter: boolean | null = null;
  tipoOperadorFilter: string | null = null;
  readonly activoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ResiduoEoRsDto>();

  modalAbierto = false;
  guardando = false;
  editando: ResiduoEoRsDto | null = null;
  form: ResiduoEoRsUpsertDto = {
    ruc: '',
    razonSocial: '',
    tipoOperador: 'TRANSPORTISTA',
    numeroRegistroMinam: '',
    vigenciaRegistro: '',
    direccion: '',
    ambitoGestion: null,
    activo: true,
  };

  // Documentos
  docsAbierto = false;
  docsEoRs: ResiduoEoRsDto | null = null;
  documentos: ResiduoEoRsDocumentoDto[] = [];
  cargandoDocs = false;
  docForm: ResiduoEoRsDocumentoUpsertDto = { tipoDocumento: '', numero: '', vigenciaDesde: '', vigenciaHasta: '', cumple: true };
  docArchivo: File | null = null;
  docEditandoId: number | null = null;

  constructor(
    private service: EoRsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
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
    if (this.activoFilter !== null) n++;
    if (this.tipoOperadorFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.activoFilter = null;
    this.tipoOperadorFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.detectChanges();
  }

  get filteredItems(): ResiduoEoRsDto[] {
    return this.items.filter((e) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(e.razonSocial ?? '', this.searchText) ||
        SearchInput.matches(e.ruc ?? '', this.searchText);
      const matchesActivo = this.activoFilter === null || e.activo === this.activoFilter;
      const matchesTipo = this.tipoOperadorFilter === null || e.tipoOperador === this.tipoOperadorFilter;
      return matchesTexto && matchesActivo && matchesTipo;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredItems);
  }

  get pagedItems(): ResiduoEoRsDto[] {
    return this.pager.page(this.filteredItems);
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  abrirNuevo(): void {
    this.editando = null;
    this.form = {
      ruc: '',
      razonSocial: '',
      tipoOperador: 'TRANSPORTISTA',
      numeroRegistroMinam: '',
      vigenciaRegistro: '',
      direccion: '',
      ambitoGestion: null,
      activo: true,
    };
    this.modalAbierto = true;
  }

  abrirEditar(item: ResiduoEoRsDto): void {
    this.editando = item;
    this.form = {
      ruc: item.ruc,
      razonSocial: item.razonSocial,
      tipoOperador: item.tipoOperador,
      numeroRegistroMinam: item.numeroRegistroMinam ?? '',
      vigenciaRegistro: item.vigenciaRegistro ? item.vigenciaRegistro.substring(0, 10) : '',
      direccion: item.direccion ?? '',
      ambitoGestion: item.ambitoGestion ?? null,
      activo: item.activo,
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.editando = null;
  }

  guardar(): void {
    if (!this.form.razonSocial.trim() || !this.form.ruc.trim()) return;
    this.guardando = true;
    const obs: Observable<any> = this.editando ? this.service.update(this.editando.id, this.form) : this.service.create(this.form);
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

  eliminar(item: ResiduoEoRsDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar "${item.razonSocial}"?`,
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

  // ── Documentos ───────────────────────────────────────────────────────

  vencido(fecha?: string | null): boolean {
    if (!fecha) return false;
    return new Date(fecha).getTime() < Date.now();
  }

  abrirDocumentos(item: ResiduoEoRsDto): void {
    this.docsEoRs = item;
    this.docsAbierto = true;
    this.resetDocForm();
    this.cargarDocumentos();
  }

  cerrarDocumentos(): void {
    this.docsAbierto = false;
    this.docsEoRs = null;
    this.documentos = [];
  }

  cargarDocumentos(): void {
    if (!this.docsEoRs) return;
    this.cargandoDocs = true;
    this.service.getDocumentos(this.docsEoRs.id).subscribe({
      next: (res) => {
        this.documentos = res;
        this.cargandoDocs = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoDocs = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  resetDocForm(): void {
    this.docEditandoId = null;
    this.docForm = { tipoDocumento: '', numero: '', vigenciaDesde: '', vigenciaHasta: '', cumple: true };
    this.docArchivo = null;
  }

  editarDocumento(d: ResiduoEoRsDocumentoDto): void {
    this.docEditandoId = d.id;
    this.docForm = {
      tipoDocumento: d.tipoDocumento,
      numero: d.numero ?? '',
      vigenciaDesde: d.vigenciaDesde ? d.vigenciaDesde.substring(0, 10) : '',
      vigenciaHasta: d.vigenciaHasta ? d.vigenciaHasta.substring(0, 10) : '',
      cumple: d.cumple,
    };
    this.docArchivo = null;
  }

  onDocArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.docArchivo = input.files && input.files.length ? input.files[0] : null;
  }

  guardarDocumento(): void {
    if (!this.docsEoRs || !this.docForm.tipoDocumento.trim()) return;
    this.loaderService.show();
    const obs: Observable<any> = this.docEditandoId
      ? this.service.updateDocumento(this.docEditandoId, this.docForm)
      : this.service.createDocumento(this.docsEoRs.id, this.docForm, this.docArchivo);
    obs.subscribe({
      next: () => {
        this.loaderService.hide();
        this.resetDocForm();
        this.cargarDocumentos();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarDocumento(d: ResiduoEoRsDocumentoDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar este documento?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.deleteDocumento(d.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.cargarDocumentos();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
