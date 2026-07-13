import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Modal estándar (2026) para formularios de creación/edición SSOMA y afines:
 * fondo gris + panel centrado redondeado + header de color con ícono + footer
 * fijo. Único origen de verdad — no reimplementar este shell por página (era
 * el bug: Amonestaciones, y antes RAC/OPT/Inspección como página completa,
 * cada uno con su propio overlay/header/footer).
 *
 * Dos variantes de color: 'teal' (--color-abril-standard, el acento general
 * de la app — Gestión Administrativa/Salidas) y 'blue' (--color-abril-logo-blue,
 * el azul del logo — SSOMA). No inventar un tercer color sin agregarlo acá.
 *
 * El body es scrollable y `<ng-content>` recibe el contenido (incluye el
 * stepper de pasos si el formulario es multi-paso — el shell no impone
 * estructura interna, solo el contenedor). El footer se proyecta aparte con
 * `<ng-content select="[modalFooter]">` porque cada formulario tiene botones
 * distintos (Cancelar/Guardar vs Anterior/Siguiente).
 */
@Component({
  selector: 'app-abril-modal-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './abril-modal-panel.html',
  styleUrl: './abril-modal-panel.css',
})
export class AbrilModalPanel {
  @Input() titulo = '';
  @Input() icono = 'ti-edit';
  @Input() variant: 'teal' | 'blue' = 'teal';
  @Input() width = '620px';
  @Output() closeModal = new EventEmitter<void>();

  onBackdropClick(): void {
    this.closeModal.emit();
  }
}
