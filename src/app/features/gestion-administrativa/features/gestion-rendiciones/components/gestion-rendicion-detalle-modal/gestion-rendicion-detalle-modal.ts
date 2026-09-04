import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GestionRendicionesService } from '../../services/gestion-rendiciones.service';
import {
  GestionRendicionDetalleDto,
  ReembolsoAccionDto,
} from '../../dtos/gestion-rendicion.dto';
import { reembolsoColors } from '../../../../shared/dtos/rendicion-shared.dto';

/**
 * Detalle de una planilla para el revisor: sus documentos y las salidas que agrupa.
 *
 * Acá el reembolso se decide SALIDA POR SALIDA, que es la granularidad que el modelo soporta y la
 * que hace falta cuando una planilla trae una salida con problema y el resto bien. La decisión en
 * bloque, por planilla entera, se hace desde la tabla.
 */
@Component({
  standalone: true,
  selector: 'app-gestion-rendicion-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, TitleCasePipe, AbrilBulkActionDirective],
  templateUrl: './gestion-rendicion-detalle-modal.html',
})
export class GestionRendicionDetalleModal implements OnInit {
  @Input({ required: true }) rendicionId!: number;

  /** Emite true si algo cambió (hay que recargar la tabla de atrás), false si solo se cerró. */
  @Output() close = new EventEmitter<boolean>();

  detalle: GestionRendicionDetalleDto | null = null;

  /** Salidas marcadas para decidir su reembolso una por una. */
  seleccionadas = new Set<number>();

  private huboCambios = false;

  constructor(
    private service: GestionRendicionesService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.rendicionId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.seleccionadas.clear();
        this.loader.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.huboCambios);
      },
    });
  }

  cerrar(): void {
    this.close.emit(this.huboCambios);
  }

  // ── Selección de salidas ─────────────────────────────────────────────

  /** Solo se decide lo que tiene reembolso pendiente y no es del propio revisor. */
  puedeDecidirSalida(id: number): boolean {
    const s = this.detalle?.salidas.find((x) => x.id === id);
    return !!s && s.porDecidir && !s.esPropia;
  }

  toggleSalida(id: number): void {
    if (!this.puedeDecidirSalida(id)) return;
    if (this.seleccionadas.has(id)) this.seleccionadas.delete(id);
    else                            this.seleccionadas.add(id);
  }

  get decidibles(): number[] {
    return (this.detalle?.salidas ?? [])
      .filter((s) => s.porDecidir && !s.esPropia)
      .map((s) => s.id);
  }

  get todasSeleccionadas(): boolean {
    const ids = this.decidibles;
    return ids.length > 0 && ids.every((id) => this.seleccionadas.has(id));
  }

  toggleTodas(): void {
    if (this.todasSeleccionadas) this.seleccionadas.clear();
    else this.seleccionadas = new Set(this.decidibles);
  }

  private accion(observacion?: string): ReembolsoAccionDto {
    return {
      rendicionIds: [],
      solicitudIds: [...this.seleccionadas],
      observacion: observacion ?? null,
    };
  }

  // ── Acciones ─────────────────────────────────────────────────────────

  async aprobar(): Promise<void> {
    const n = this.seleccionadas.size;
    if (n === 0) return;

    const result = await Swal.fire({
      icon: 'question',
      title: n === 1 ? '¿Aprobar esta salida?' : `¿Aprobar ${n} salidas?`,
      text: 'Se les avisará a sus solicitantes.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    });
    if (!result.isConfirmed) return;

    this.loader.show();
    this.service.aprobarReembolso(this.accion()).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  async rechazar(): Promise<void> {
    const n = this.seleccionadas.size;
    if (n === 0) return;

    const { value: observacion, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: n === 1 ? '¿Rechazar esta salida?' : `¿Rechazar ${n} salidas?`,
      input: 'textarea',
      inputLabel: 'Observación',
      inputPlaceholder: 'Qué tiene que corregir el trabajador…',
      inputValidator: (v) => (v && v.trim() ? null : 'La observación es obligatoria'),
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed || !observacion) return;

    this.loader.show();
    this.service.rechazarReembolso(this.accion(observacion)).subscribe({
      next: (res) => this.trasAccion(res.message),
      error: (err: HttpErrorResponse) => this.errorAccion(err),
    });
  }

  private trasAccion(message: string): void {
    this.loader.hide();
    this.huboCambios = true;
    Swal.fire({ title: message, icon: 'success', timer: 1800, showConfirmButton: false });
    this.cargar();
  }

  private errorAccion(err: HttpErrorResponse): void {
    this.loader.hide();
    this.errorService.handleError(err);
    this.cdr.detectChanges();
  }

  // ── Presentación ─────────────────────────────────────────────────────

  readonly reembolsoColors = reembolsoColors;

  reembolsoTexto(estado: string): string {
    return estado === 'Rechazado' ? 'Observado' : estado;
  }
}
