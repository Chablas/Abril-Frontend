import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { DeclaracionResiduoService } from '../../services/declaracion-residuo.service';
import { DeclaracionResiduoDto, DeclaracionResiduoUpsertRequest } from '../../dtos/declaracion-residuo.dtos';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../../shared/components/fab-button/fab-button';
import { AbrilModalPanel } from '../../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { Paginator } from '../../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../../shared/utils/client-pager';
import { RESIDUOS_TABS } from '../../../residuos-tabs';

@Component({
  selector: 'app-declaracion-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, FabButton, AbrilModalPanel, Paginator],
  templateUrl: './declaracion-lista.html',
  styleUrl: './declaracion-lista.css',
})
export class DeclaracionLista implements OnInit {
  readonly tabs = RESIDUOS_TABS;
  items: DeclaracionResiduoDto[] = [];
  loading = false;
  search = '';

  pager = new ClientPager<DeclaracionResiduoDto>();

  modalAbierto = false;
  guardando = false;
  form: DeclaracionResiduoUpsertRequest = { contributorId: 0, periodoAnio: new Date().getFullYear() };

  constructor(
    private service: DeclaracionResiduoService,
    private router: Router,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get filteredItems(): DeclaracionResiduoDto[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.items;
    return this.items.filter(
      (i) =>
        (i.nombreContributor ?? '').toLowerCase().includes(term) ||
        String(i.periodoAnio).includes(term) ||
        i.estado.toLowerCase().includes(term),
    );
  }

  get pageItems(): DeclaracionResiduoDto[] {
    return this.pager.page(this.filteredItems);
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredItems);
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (res) => {
        this.items = res;
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

  buscar(): void {
    this.pager.reset();
    this.cdr.detectChanges();
  }

  cambiarPagina(p: number): void {
    this.pager.goTo(p);
    this.cdr.detectChanges();
  }

  abrirNuevo(): void {
    this.form = { contributorId: 0, periodoAnio: new Date().getFullYear() };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  guardar(): void {
    if (!this.form.contributorId || !this.form.periodoAnio) return;
    this.guardando = true;
    this.service.create(this.form).subscribe({
      next: (res) => {
        this.guardando = false;
        this.modalAbierto = false;
        this.cdr.detectChanges();
        this.router.navigate(['/ssoma/gestion/residuos/declaraciones', res.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  abrir(item: DeclaracionResiduoDto): void {
    this.router.navigate(['/ssoma/gestion/residuos/declaraciones', item.id]);
  }

  eliminar(item: DeclaracionResiduoDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Eliminar la declaración del periodo ${item.periodoAnio}?`,
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

  estadoClass(estado: string): string {
    return estado === 'PRESENTADA' ? 'chip-estado--activo' : 'chip-estado--inactivo';
  }
}
