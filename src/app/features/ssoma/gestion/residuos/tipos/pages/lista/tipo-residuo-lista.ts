import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { TipoResiduoService } from '../../services/tipo-residuo.service';
import {
  ResiduoTipoDto,
  ResiduoTipoUpsertDto,
  ResiduoTipoFactorDto,
  ResiduoTipoFactorUpsertDto,
} from '../../dtos/tipo-residuo.dtos';
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

@Component({
  selector: 'app-tipo-residuo-lista',
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
  templateUrl: './tipo-residuo-lista.html',
  styleUrl: './tipo-residuo-lista.css',
})
export class TipoResiduoLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  items: ResiduoTipoDto[] = [];
  loading = false;

  searchText = '';
  activoFilter: boolean | null = null;
  readonly activoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ResiduoTipoDto>();

  modalAbierto = false;
  guardando = false;
  editando: ResiduoTipoDto | null = null;
  form: ResiduoTipoUpsertDto = { codigoSigersol: '', nombre: '', esPeligroso: false, activo: true };

  factores: ResiduoTipoFactorDto[] = [];
  cargandoFactores = false;
  factorForm: ResiduoTipoFactorUpsertDto = { factorM3aTon: 0, vigenciaDesde: '', vigenciaHasta: null };
  factorEditandoId: number | null = null;

  constructor(
    private service: TipoResiduoService,
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
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.activoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.detectChanges();
  }

  get filteredItems(): ResiduoTipoDto[] {
    return this.items.filter((t) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(t.nombre ?? '', this.searchText) ||
        SearchInput.matches(t.codigoSigersol ?? '', this.searchText);
      const matchesActivo = this.activoFilter === null || t.activo === this.activoFilter;
      return matchesTexto && matchesActivo;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredItems);
  }

  get pagedItems(): ResiduoTipoDto[] {
    return this.pager.page(this.filteredItems);
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  abrirNuevo(): void {
    this.editando = null;
    this.form = { codigoSigersol: '', nombre: '', esPeligroso: false, activo: true };
    this.factores = [];
    this.modalAbierto = true;
  }

  abrirEditar(item: ResiduoTipoDto): void {
    this.editando = item;
    this.form = {
      codigoSigersol: item.codigoSigersol ?? '',
      nombre: item.nombre,
      esPeligroso: item.esPeligroso,
      activo: item.activo,
    };
    this.cargarFactores(item.id);
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.editando = null;
    this.factores = [];
    this.factorEditandoId = null;
  }

  guardar(): void {
    if (!this.form.nombre.trim()) return;
    this.guardando = true;
    const obs: Observable<any> = this.editando
      ? this.service.update(this.editando.id, this.form)
      : this.service.create(this.form);
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

  eliminar(item: ResiduoTipoDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Desactivar "${item.nombre}"?`,
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

  // ── Factores vigentes (sub-catálogo dentro del formulario de edición) ──

  cargarFactores(tipoId: number): void {
    this.cargandoFactores = true;
    this.service.getFactores(tipoId).subscribe({
      next: (res) => {
        this.factores = res;
        this.cargandoFactores = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoFactores = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  nuevoFactor(): void {
    this.factorEditandoId = null;
    this.factorForm = { factorM3aTon: 0, vigenciaDesde: '', vigenciaHasta: null };
  }

  editarFactor(f: ResiduoTipoFactorDto): void {
    this.factorEditandoId = f.id;
    this.factorForm = {
      factorM3aTon: f.factorM3aTon,
      vigenciaDesde: f.vigenciaDesde?.substring(0, 10) ?? '',
      vigenciaHasta: f.vigenciaHasta ? f.vigenciaHasta.substring(0, 10) : null,
    };
  }

  guardarFactor(): void {
    if (!this.editando) return;
    if (!this.factorForm.vigenciaDesde || !this.factorForm.factorM3aTon) return;
    const obs: Observable<any> = this.factorEditandoId
      ? this.service.updateFactor(this.factorEditandoId, this.factorForm)
      : this.service.createFactor(this.editando.id, this.factorForm);
    this.loaderService.show();
    obs.subscribe({
      next: () => {
        this.loaderService.hide();
        this.nuevoFactor();
        this.cargarFactores(this.editando!.id);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarFactor(f: ResiduoTipoFactorDto): void {
    if (!this.editando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar este factor?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.deleteFactor(f.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.cargarFactores(this.editando!.id);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
