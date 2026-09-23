import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ConstanciaResiduoService } from '../../services/constancia-residuo.service';
import { ResiduoConstanciaDto, ResiduoConstanciaUpsertDto } from '../../dtos/constancia-residuo.dtos';
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
import { ClientPager } from '../../../../../../../shared/utils/client-pager';
import { RESIDUOS_TABS } from '../../../residuos-tabs';

@Component({
  selector: 'app-constancia-lista',
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
  templateUrl: './constancia-lista.html',
  styleUrl: './constancia-lista.css',
})
export class ConstanciaLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  items: ResiduoConstanciaDto[] = [];
  proyectos: ProyectoSsomaSimpleDTO[] = [];
  eoRsList: ResiduoEoRsDto[] = [];
  loading = false;

  filtrosAbiertos = false;
  filtroProjectId: number | null = null;
  filtroAnio: number | null = null;
  filtroMes: number | null = null;

  private readonly pager = new ClientPager<ResiduoConstanciaDto>();

  modalAbierto = false;
  guardando = false;
  editando: ResiduoConstanciaDto | null = null;
  archivo: File | null = null;
  form: ResiduoConstanciaUpsertDto = this.formVacio();

  constructor(
    private service: ConstanciaResiduoService,
    private eoRsService: EoRsService,
    private proyectoService: ProyectoHabilitadoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private formVacio(): ResiduoConstanciaUpsertDto {
    const now = new Date();
    return {
      projectId: 0,
      eoRsId: null,
      contratista: '',
      destino: '',
      periodoAnio: now.getFullYear(),
      periodoMes: now.getMonth() + 1,
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
      .getAll(this.filtroProjectId ?? undefined, this.filtroAnio ?? undefined, this.filtroMes ?? undefined)
      .subscribe({
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
    if (this.filtroProjectId !== null) n++;
    if (this.filtroAnio !== null) n++;
    if (this.filtroMes !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtroProjectId = null;
    this.filtroAnio = null;
    this.filtroMes = null;
    this.load();
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.items);
  }

  get pagedItems(): ResiduoConstanciaDto[] {
    return this.pager.page(this.items);
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  abrirNuevo(): void {
    this.editando = null;
    this.archivo = null;
    this.form = this.formVacio();
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
    if (!this.form.projectId || !this.form.periodoAnio || !this.form.periodoMes) return;
    if (!this.editando && !this.archivo) return;
    this.guardando = true;
    const obs: Observable<any> = this.editando ? this.service.update(this.editando.id, this.form) : this.service.create(this.form, this.archivo!);
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

  eliminar(item: ResiduoConstanciaDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Eliminar la constancia "${item.numeroCertificado ?? item.id}"?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
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
