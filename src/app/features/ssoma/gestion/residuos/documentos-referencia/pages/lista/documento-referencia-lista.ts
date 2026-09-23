import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { DocumentoReferenciaService } from '../../services/documento-referencia.service';
import { ResiduoDocumentoReferenciaDto, ResiduoDocumentoReferenciaUpsertDto } from '../../dtos/documento-referencia.dtos';
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

const TIPO_OPTIONS = [
  { value: 'MANUAL_SIGERSOL', label: 'Manual Sigersol' },
  { value: 'MODELO_DECLARACION_JURADA', label: 'Modelo declaración jurada' },
  { value: 'MODELO_CARACTERISTICAS_RESIDUOS', label: 'Modelo características de residuos' },
  { value: 'OTRO', label: 'Otro' },
];

@Component({
  selector: 'app-documento-referencia-lista',
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
  templateUrl: './documento-referencia-lista.html',
  styleUrl: './documento-referencia-lista.css',
})
export class DocumentoReferenciaLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  readonly tipoOptions = TIPO_OPTIONS;

  items: ResiduoDocumentoReferenciaDto[] = [];
  loading = false;

  searchText = '';
  tipoFilter: string | null = null;
  activoFilter: boolean | null = null;
  readonly activoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ResiduoDocumentoReferenciaDto>();

  modalAbierto = false;
  guardando = false;
  editando: ResiduoDocumentoReferenciaDto | null = null;
  archivo: File | null = null;
  form: ResiduoDocumentoReferenciaUpsertDto = { tipo: 'OTRO', nombre: '', descripcion: '', version: '', activo: true };

  constructor(
    private service: DocumentoReferenciaService,
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
    if (this.tipoFilter !== null) n++;
    if (this.activoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.tipoFilter = null;
    this.activoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.detectChanges();
  }

  get filteredItems(): ResiduoDocumentoReferenciaDto[] {
    return this.items.filter((d) => {
      const matchesTexto = !this.searchText.trim() || SearchInput.matches(d.nombre ?? '', this.searchText);
      const matchesTipo = this.tipoFilter === null || d.tipo === this.tipoFilter;
      const matchesActivo = this.activoFilter === null || d.activo === this.activoFilter;
      return matchesTexto && matchesTipo && matchesActivo;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredItems);
  }

  get pagedItems(): ResiduoDocumentoReferenciaDto[] {
    return this.pager.page(this.filteredItems);
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  abrirNuevo(): void {
    this.editando = null;
    this.archivo = null;
    this.form = { tipo: 'OTRO', nombre: '', descripcion: '', version: '', activo: true };
    this.modalAbierto = true;
  }

  abrirEditar(item: ResiduoDocumentoReferenciaDto): void {
    this.editando = item;
    this.archivo = null;
    this.form = {
      tipo: item.tipo,
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      version: item.version ?? '',
      activo: item.activo,
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
    if (!this.form.nombre.trim()) return;
    if (!this.editando && !this.archivo) return;
    this.guardando = true;
    if (this.editando) {
      this.service.update(this.editando.id, this.form).subscribe({
        next: () => {
          if (this.archivo) {
            this.service.subirArchivo(this.editando!.id, this.archivo).subscribe();
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
    } else {
      this.service.create(this.form, this.archivo!).subscribe({
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
  }

  eliminar(item: ResiduoDocumentoReferenciaDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar el documento "${item.nombre}"?`,
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
