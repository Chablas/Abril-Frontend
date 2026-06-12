import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  CatCatalogosService,
  CatCategoriaAdminDto,
  CatOcupacionAdminDto,
} from '../../../../../../features/habilitacion/services/cat-catalogos.service';

type CatItem = CatCategoriaAdminDto | CatOcupacionAdminDto;

@Component({
  selector: 'app-catalogos-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogos-modal.html',
  styleUrl: './catalogos-modal.css',
})
export class CatalogosModal implements OnInit {
  @Output() cerrar = new EventEmitter<void>();

  tab: 'categoria' | 'ocupacion' = 'categoria';
  categorias: CatCategoriaAdminDto[] = [];
  ocupaciones: CatOcupacionAdminDto[] = [];

  editandoId: number | null = null;
  editandoNombre = '';
  nuevoNombre = '';
  guardando = false;

  constructor(private svc: CatCatalogosService) {}

  ngOnInit() {
    this.cargarTodo();
  }

  cargarTodo() {
    this.svc.getCategorias().subscribe((d) => (this.categorias = d));
    this.svc.getOcupaciones().subscribe((d) => (this.ocupaciones = d));
  }

  get items(): CatItem[] {
    return this.tab === 'categoria' ? this.categorias : this.ocupaciones;
  }

  iniciarEdicion(item: CatItem) {
    this.editandoId = item.id;
    this.editandoNombre = item.nombre;
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.editandoNombre = '';
  }

  guardarEdicion(item: CatItem) {
    if (!this.editandoNombre.trim()) return;
    const obs =
      this.tab === 'categoria'
        ? this.svc.actualizarCategoria(item.id, this.editandoNombre.trim())
        : this.svc.actualizarOcupacion(item.id, this.editandoNombre.trim());
    obs.subscribe({
      next: (updated) => {
        item.nombre = updated.nombre;
        this.cancelarEdicion();
      },
      error: () => Swal.fire('Error', 'No se pudo guardar el cambio.', 'error'),
    });
  }

  toggleActivo(item: CatItem) {
    const obs =
      this.tab === 'categoria'
        ? this.svc.toggleCategoria(item.id, !item.activo)
        : this.svc.toggleOcupacion(item.id, !item.activo);
    obs.subscribe({
      next: () => (item.activo = !item.activo),
      error: () => Swal.fire('Error', 'No se pudo actualizar.', 'error'),
    });
  }

  agregar() {
    if (!this.nuevoNombre.trim()) return;
    this.guardando = true;
    const obs =
      this.tab === 'categoria'
        ? this.svc.crearCategoria(this.nuevoNombre.trim())
        : this.svc.crearOcupacion(this.nuevoNombre.trim());
    obs.subscribe({
      next: (item) => {
        if (this.tab === 'categoria') this.categorias.push(item as CatCategoriaAdminDto);
        else this.ocupaciones.push(item as CatOcupacionAdminDto);
        this.nuevoNombre = '';
        this.guardando = false;
      },
      error: () => {
        Swal.fire('Error', 'No se pudo crear.', 'error');
        this.guardando = false;
      },
    });
  }
}
