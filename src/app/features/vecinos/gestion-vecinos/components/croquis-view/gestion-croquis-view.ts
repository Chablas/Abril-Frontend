import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../../environments/environment';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DraggableImage } from '../../../../../shared/components/draggable-image/draggable-image';
import {
  CroquisGestionDTO,
  CroquisGestionLoteDTO,
  VecinoListItemDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-croquis-view',
  standalone: true,
  imports: [CommonModule, BaseModal, DraggableImage],
  templateUrl: './gestion-croquis-view.html',
})
export class GestionCroquisView {
  @Input() croquis: CroquisGestionDTO[] = [];

  /** Base del backend (sin slash final) para componer URLs de imágenes. */
  get apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  /** Filtro de proyecto (cliente), controlado por el padre. */
  @Input() filterProjectId: number | null = null;
  /** Pide al padre abrir el detalle del vecino. */
  @Output() viewVecino = new EventEmitter<VecinoListItemDTO>();

  selected: CroquisGestionDTO | null = null;
  selectedLote: CroquisGestionLoteDTO | null = null;

  imageSrc(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  /** Croquis filtrados por proyecto. */
  get filteredCroquis(): CroquisGestionDTO[] {
    if (!this.filterProjectId) return this.croquis;
    return this.croquis.filter((c) => c.projectId === this.filterProjectId);
  }

  /** Cuántos lotes del croquis tienen vecino asignado. */
  countAssigned(c: CroquisGestionDTO): number {
    return c.lotes.filter((l) => l.vecinoId).length;
  }

  /** % de entregables aprobados sobre los evaluables (Falta + Enviado + Aprobado). */
  aprobadosPct(item: { entregablesAprobados: number; entregablesEvaluables: number }): number {
    if (!item.entregablesEvaluables) return 0;
    return Math.round((item.entregablesAprobados / item.entregablesEvaluables) * 100);
  }

  /** % de solicitudes aprobadas (Aceptada) sobre las evaluables (Aceptada + Por responder). */
  solicitudesAprobadasPct(item: { solicitudesAprobadas: number; solicitudesEvaluables: number }): number {
    if (!item.solicitudesEvaluables) return 0;
    return Math.round((item.solicitudesAprobadas / item.solicitudesEvaluables) * 100);
  }

  /** % de requisitos subidos sobre los evaluables (Subido + No subido, sin "No aplica"). */
  requisitosSubidosPct(item: { requisitosSubidos: number; requisitosEvaluables: number }): number {
    if (!item.requisitosEvaluables) return 0;
    return Math.round((item.requisitosSubidos / item.requisitosEvaluables) * 100);
  }

  // ── Apertura del croquis agrandado (solo lectura) ──────────────────────
  open(c: CroquisGestionDTO): void {
    this.selected = c;
    this.selectedLote = null;
  }

  close(): void {
    this.selected = null;
    this.selectedLote = null;
  }

  // ── Lotes ──────────────────────────────────────────────────────────────
  selectLote(lote: CroquisGestionLoteDTO): void {
    this.selectedLote = lote;
  }

  /** Clic fuera de un lote: deselecciona y vuelve al resumen del proyecto. */
  clearLote(): void {
    this.selectedLote = null;
  }

  pointsToSvg(puntos: number[][]): string {
    return puntos.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ');
  }

  centroid(puntos: number[][]): { x: number; y: number } {
    const n = puntos.length || 1;
    return {
      x: (puntos.reduce((a, p) => a + p[0], 0) / n) * 100,
      y: (puntos.reduce((a, p) => a + p[1], 0) / n) * 100,
    };
  }

  loteFill(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return 'rgba(0,134,165,0.45)';
    return lote.vecinoId ? 'rgba(100,188,4,0.35)' : 'rgba(156,163,175,0.25)';
  }

  loteStroke(lote: CroquisGestionLoteDTO): string {
    if (this.selectedLote === lote) return '#0086A5';
    return lote.vecinoId ? '#64BC04' : '#9CA3AF';
  }

  assignedVecino(): VecinoListItemDTO | null {
    if (!this.selected || !this.selectedLote?.vecinoId) return null;
    return this.selected.vecinos.find((v) => v.vecinoId === this.selectedLote!.vecinoId) ?? null;
  }

  verVecino(): void {
    const v = this.assignedVecino();
    if (v) this.viewVecino.emit(v);
  }
}
