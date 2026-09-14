import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

/**
 * Tarjeta de los detalles de Seguridad: encabezado con ícono, título y conteo, buscador cuando la
 * lista es larga, cuerpo con scroll propio y los estados de carga y vacío. Las filas las proyecta
 * cada lista (usuarios, roles, funcionalidades); el filtrado lo hace la lista con lo que emite
 * `busquedaChange`.
 */
@Component({
  selector: 'app-access-panel',
  standalone: true,
  imports: [CommonModule, SearchInput],
  templateUrl: './access-panel.html',
  styleUrl: './access-panel.css',
})
export class AccessPanel {
  /** Con menos filas que esto el buscador sobra: se lee la lista de un vistazo. */
  static readonly FILAS_PARA_BUSCAR = 6;

  @Input() titulo = '';
  /** Ícono de tabler (ej. 'ti-users'). */
  @Input() icono = '';
  @Input() total = 0;
  /** Filas que pasan la búsqueda. */
  @Input() visibles = 0;
  @Input() placeholder = 'Buscar...';
  /** Texto cuando la lista no tiene ninguna fila. */
  @Input() vacio = '';
  @Input() cargando = false;
  @Output() busquedaChange = new EventEmitter<string>();

  termino = '';

  readonly lineasSkeleton = [1, 2, 3, 4];

  get buscable(): boolean {
    return !this.cargando && this.total >= AccessPanel.FILAS_PARA_BUSCAR;
  }

  get filtrando(): boolean {
    return this.termino.trim() !== '';
  }

  onBuscar(valor: string): void {
    this.termino = valor;
    this.busquedaChange.emit(valor);
  }
}
