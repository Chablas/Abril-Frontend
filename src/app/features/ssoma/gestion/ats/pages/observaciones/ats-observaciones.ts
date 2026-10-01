import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AtsService } from '../../services/ats.service';
import { AtsObservacionesDto } from '../../dtos/ats.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';

/** Observaciones sobre un ATS (tipo 'ats') o un ATS grupal (tipo 'grupo'). Una observación NO modifica el
 *  documento: queda registrada con quién y cuándo, y mientras esté abierta bloquea las firmas de validación. */
@Component({
  selector: 'app-ats-observaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cargando) {
      <p class="obs-vacio">Cargando…</p>
    } @else if (data) {
      @if (data.puedeObservar) {
        <div class="obs-nueva">
          <textarea class="abril-field-input" rows="2" maxlength="1000" [(ngModel)]="texto"
            placeholder="Ej.: el riesgo de caída está subvalorado; falta el control de línea de vida…"></textarea>
          <button type="button" class="btn btn-primary btn-sm" [disabled]="enviando || texto.trim().length < 5" (click)="agregar()">
            <i class="ti ti-message-plus"></i> {{ enviando ? 'Enviando…' : 'Registrar observación' }}
          </button>
        </div>
      }

      @if (data.observaciones.length === 0) {
        <p class="obs-vacio">Sin observaciones.</p>
      }
      @for (o of data.observaciones; track o.id) {
        <div class="obs-item" [class.obs-resuelta]="o.estado === 'Resuelta'">
          <div class="obs-cab">
            <strong>{{ o.autorNombre }}</strong>
            <span class="obs-rol">{{ o.rol }}</span>
            <span class="obs-estado" [class.abierta]="o.estado === 'Abierta'">{{ o.estado }}</span>
            <span class="obs-fecha">{{ o.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <p class="obs-texto">{{ o.texto }}</p>
          @if (o.estado === 'Resuelta') {
            <p class="obs-resp"><i class="ti ti-check"></i> {{ o.resueltaPorNombre }}: {{ o.respuesta }}</p>
          } @else if (data.puedeResolver) {
            <button type="button" class="btn btn-outline btn-sm" (click)="resolver(o.id)"><i class="ti ti-check"></i> Resolver</button>
          }
        </div>
      }
    }
  `,
  styles: [`
    .obs-nueva { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
    .obs-nueva textarea { width: 100%; }
    .obs-vacio { color: #9ca3af; font-style: italic; font-size: 13px; }
    .obs-item { border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
    .obs-item.obs-resuelta { border-color: #e5e7eb; background: #f9fafb; }
    .obs-cab { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; }
    .obs-rol { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
    .obs-estado { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #dcfce7; color: #166534; }
    .obs-estado.abierta { background: #fee2e2; color: #b91c1c; }
    .obs-fecha { margin-left: auto; color: #9ca3af; font-size: 11px; }
    .obs-texto { margin: 6px 0; font-size: 13px; color: #111827; white-space: pre-wrap; }
    .obs-resp { margin: 4px 0 0; font-size: 12.5px; color: #166534; }
  `],
})
export class AtsObservaciones implements OnInit {
  @Input() tipo: 'ats' | 'grupo' = 'ats';
  @Input() id!: number;
  /** Se emite cada vez que se crea o resuelve una observación — para refrescar el contador del padre. */
  @Output() cambio = new EventEmitter<void>();

  data: AtsObservacionesDto | null = null;
  cargando = true;
  texto = '';
  enviando = false;

  constructor(private svc: AtsService, private errorService: ErrorService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.cargar(); }

  private cargar(): void {
    const req$ = this.tipo === 'ats' ? this.svc.getObservacionesAts(this.id) : this.svc.getObservacionesGrupo(this.id);
    req$.subscribe({
      next: (d) => { this.data = d; this.cargando = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.cargando = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  agregar(): void {
    if (this.enviando) return;
    this.enviando = true;
    const req$ = this.tipo === 'ats' ? this.svc.crearObservacionAts(this.id, this.texto.trim()) : this.svc.crearObservacionGrupo(this.id, this.texto.trim());
    req$.subscribe({
      next: () => { this.enviando = false; this.texto = ''; this.cargar(); this.cambio.emit(); },
      error: (err: HttpErrorResponse) => { this.enviando = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  resolver(observacionId: number): void {
    Swal.fire({
      title: 'Resolver observación',
      input: 'textarea',
      inputLabel: 'Qué se hizo para atenderla',
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: 'Resolver',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v || v.trim().length < 5 ? 'Escribe al menos 5 caracteres.' : null),
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.resolverObservacion(observacionId, r.value as string).subscribe({
        next: () => { this.cargar(); this.cambio.emit(); },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
