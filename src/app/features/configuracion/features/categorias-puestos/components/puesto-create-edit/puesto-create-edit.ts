import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { CategoriaAdminDto, PuestoAdminDto } from '../../dtos/categorias-puestos.dto';

/**
 * Alta y edición de un puesto. El mismo componente cubre ambos casos: si llega
 * `puesto` edita ese registro, si no crea uno nuevo.
 */
@Component({
  standalone: true,
  selector: 'app-puesto-create-edit',
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './puesto-create-edit.html',
})
export class PuestoCreateEdit implements OnInit {
  /** Puesto a editar; null/undefined = alta. */
  @Input() puesto: PuestoAdminDto | null = null;
  /** Categorías disponibles para asignar (ya vienen ordenadas del contenedor). */
  @Input() categorias: CategoriaAdminDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  categoriaId: number | null = null;
  submitted = false;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.nombre = this.puesto?.nombre ?? '';
    this.categoriaId = this.puesto?.categoriaId ?? null;
  }

  get titulo(): string {
    return this.puesto ? 'EDITAR PUESTO' : 'NUEVO PUESTO';
  }

  save(): void {
    this.submitted = true;
    const nombre = this.nombre.trim();
    if (!nombre) return;

    this.loaderService.show();
    const req = { nombre, categoriaId: this.categoriaId };
    const request$ = this.puesto
      ? this.service.actualizarPuesto(this.puesto.id, req)
      : this.service.crearPuesto(req);

    request$.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: this.puesto ? 'Puesto actualizado.' : 'Puesto creado.',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
