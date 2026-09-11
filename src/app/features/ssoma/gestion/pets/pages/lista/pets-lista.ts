import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PetsService } from '../../pets.service';
import { PetListItemDto } from '../../pets.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { environment } from '../../../../../../../environments/environment';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-pets-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
    AbrilBulkActionDirective,
    AbrilModalPanel,
  ],
  templateUrl: './pets-lista.html',
  styleUrl: './pets-lista.css',
})
export class PetsLista implements OnInit {
  pets: PetListItemDto[] = [];
  loading = false;

  mostrarFormCrear = false;
  creando = false;
  nuevoNombre = '';
  nuevoCodigo = '';

  searchText = '';
  estadoFilter: boolean | null = null;
  filtrosAbiertos = false;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];

  private readonly pager = new ClientPager<PetListItemDto>();

  readonly plantillaUrl = `${environment.apiUrl.replace(/\/$/, '')}/templates/pets-plantilla.docx`;

  // Biblioteca pública (QR único): URL FIJA a producción a propósito — no se arma
  // con window.location.origin porque si alguien abre esta pantalla desde
  // demo.abril.pe generaría un QR distinto (apuntando a demo). El QR que se
  // imprime debe ser siempre el mismo, sin importar desde dónde se genere.
  mostrarQr = false;
  qrDataUrl: string | null = null;
  readonly bibliotecaUrl = 'https://intranet.abril.pe/pets';

  constructor(
    private petsService: PetsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.petsService.getList().subscribe({
      next: (data) => {
        this.pets = data;
        this.pager.reset();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  onFilterChange(): void {
    this.pager.reset();
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.onFilterChange();
  }

  get filteredPets(): PetListItemDto[] {
    return this.pets.filter((p) => {
      const texto = `${p.codigo ?? ''} ${p.nombre}`;
      const matchesTexto = !this.searchText.trim() || SearchInput.matches(texto, this.searchText);
      const matchesEstado = this.estadoFilter === null || p.activo === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredPets);
  }

  get pagedPets(): PetListItemDto[] {
    return this.pager.page(this.filteredPets);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  toggleFormCrear(): void {
    this.mostrarFormCrear = !this.mostrarFormCrear;
    this.nuevoNombre = '';
    this.nuevoCodigo = '';
    this.cdr.markForCheck();
  }

  get puedeCrear(): boolean {
    return this.nuevoNombre.trim().length > 0 && !this.creando;
  }

  crear(): void {
    if (!this.puedeCrear) return;
    this.creando = true;
    this.petsService
      .crear({ nombre: this.nuevoNombre.trim(), codigo: this.nuevoCodigo.trim() || undefined })
      .subscribe({
        next: ({ id }) => {
          this.creando = false;
          this.router.navigate(['/ssoma/gestion/pets', id]);
        },
        error: (err: HttpErrorResponse) => {
          this.creando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/pets', id]);
  }

  duplicando: number | null = null;

  // Clona un PETS existente como borrador nuevo (inactivo) para partir de él en
  // vez de armar uno parecido desde cero.
  duplicar(pet: PetListItemDto): void {
    Swal.fire({
      icon: 'question',
      title: 'Duplicar PETS',
      text: `Se creará "${pet.nombre} (copia)" con los mismos pasos, responsabilidades, secciones y catálogo — inactivo hasta que lo revises. No copia firmas ni anexos.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.duplicando = pet.id;
      this.petsService.duplicar(pet.id).subscribe({
        next: ({ id }) => {
          this.duplicando = null;
          this.router.navigate(['/ssoma/gestion/pets', id]);
        },
        error: (err: HttpErrorResponse) => {
          this.duplicando = null;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  abrirQr(): void {
    this.mostrarQr = true;
    if (this.qrDataUrl || !this.bibliotecaUrl) return;
    QRCode.toDataURL(this.bibliotecaUrl, { width: 480, margin: 2 }).then((dataUrl) => {
      this.qrDataUrl = dataUrl;
      this.cdr.markForCheck();
    });
  }

  cerrarQr(): void {
    this.mostrarQr = false;
  }

  descargarQr(): void {
    if (!this.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = this.qrDataUrl;
    a.download = 'qr-biblioteca-pets.png';
    a.click();
  }

  toggleActivo(pet: PetListItemDto): void {
    Swal.fire({
      icon: 'question',
      title: pet.activo ? 'Desactivar PETS' : 'Activar PETS',
      text: pet.activo
        ? 'Las herramientas que lo consumen (OPT, checklists) dejarán de jalarlo.'
        : 'Volverá a estar disponible para las herramientas que lo consumen.',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.petsService
        .actualizar(pet.id, { nombre: pet.nombre, codigo: pet.codigo, activo: !pet.activo })
        .subscribe({
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
