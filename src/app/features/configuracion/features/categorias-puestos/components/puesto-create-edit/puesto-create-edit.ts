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
import { AreaCascade, AreaCascadeNode } from '../../area-tree';

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
  /** Árbol de áreas ya jerarquizado: alimenta las dos cascadas de área del formulario. */
  @Input() areaRoots: AreaCascadeNode[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  categoriaId: number | null = null;
  /**
   * Cascada del área que puede pedir el puesto. Sin área es válido: los puestos de obra no
   * tienen ninguna.
   */
  solicitante = new AreaCascade();
  /** Cascada del área a la que entra el postulante. Vacía = se cae al área del solicitante. */
  destino = new AreaCascade();
  /**
   * El usuario ya eligió un destino a mano (o el puesto venía con uno guardado). Mientras sea
   * false, el destino sigue al solicitante paso a paso.
   */
  private destinoTocado = false;
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
    this.solicitante = new AreaCascade(this.areaRoots, this.puesto?.areaSolicitanteScopeId ?? null);
    this.destino = new AreaCascade(this.areaRoots, this.puesto?.areaDestinoScopeId ?? null);
    // Un destino ya guardado no se pisa al mover el área solicitante.
    this.destinoTocado = this.puesto?.areaDestinoScopeId != null;
  }

  get titulo(): string {
    return this.puesto ? 'EDITAR PUESTO' : 'NUEVO PUESTO';
  }

  /**
   * Al elegir quién pide el puesto se propone esa misma área como destino, que es el caso de
   * la enorme mayoría (de 112 puestos mapeados, solo 6 difieren). Con la cascada el área se
   * elige en varios pasos, así que el destino acompaña al solicitante en cada paso mientras no
   * lo hayan tocado a mano: si ya eligieron uno distinto, no se pisa.
   */
  onSolicitanteLevelChange(index: number, areaScopeId: number | null): void {
    this.solicitante.onLevelChange(index, areaScopeId);
    if (!this.destinoTocado) this.destino.reset(this.solicitante.selectedId);
  }

  onDestinoLevelChange(index: number, areaScopeId: number | null): void {
    this.destino.onLevelChange(index, areaScopeId);
    this.destinoTocado = true;
  }

  save(): void {
    this.submitted = true;
    const nombre = this.nombre.trim();
    // La categoría es obligatoria: es de acá de donde sale la categoría de cada trabajador
    // que tenga este puesto, y un puesto sin ella dejaría a esas fichas fuera de todo filtro
    // y de toda regla.
    if (!nombre || this.categoriaId == null) return;

    this.loaderService.show();
    // Sin área es un envío válido, no un campo vacío: los puestos de obra no tienen ninguna.
    // De cada cascada sale el nodo más profundo elegido: dejar la subárea vacía guarda el
    // área del nivel de arriba.
    const req = {
      nombre,
      categoriaId: this.categoriaId,
      areaSolicitanteScopeId: this.solicitante.selectedId,
      areaDestinoScopeId: this.destino.selectedId,
    };
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
