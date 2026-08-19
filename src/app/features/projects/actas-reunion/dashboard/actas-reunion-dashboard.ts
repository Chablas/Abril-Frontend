import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ACTAS_REUNION_TABS } from '../actas-reunion-tabs';
import { MisAcuerdoDTO } from '../dtos/actas-reunion.dto';

const HOY = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-actas-reunion-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, BaseModal],
  templateUrl: './actas-reunion-dashboard.html',
})
export class ActasReunionDashboard implements OnInit {
  readonly tabs = ACTAS_REUNION_TABS;

  acuerdos: MisAcuerdoDTO[] = [];

  /** Acuerdo cuyo modal rápido de acción está abierto (marcar cumplido / reprogramar), o null. */
  acuerdoSeleccionado: MisAcuerdoDTO | null = null;
  reprogramando = false;
  nuevaFecha = '';
  motivo = '';

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.loaderService.show();
    this.service.getMisAcuerdos().subscribe({
      next: (data) => {
        this.acuerdos = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private get pendientes(): MisAcuerdoDTO[] {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado !== 'CUMPLIDO' && a.reunionAcuerdoEstado !== 'ANULADO');
  }

  esVencido(a: MisAcuerdoDTO): boolean {
    return !!a.fechaProgramada && a.fechaProgramada < HOY()
      && a.reunionAcuerdoEstado !== 'CUMPLIDO' && a.reunionAcuerdoEstado !== 'ANULADO';
  }

  get totalPendientes(): number {
    return this.pendientes.length;
  }

  get totalCriticos(): number {
    return this.pendientes.filter((a) => a.criticidad === 'CRITICO').length;
  }

  get totalVencidos(): number {
    return this.pendientes.filter((a) => this.esVencido(a)).length;
  }

  get totalCumplidosRecientes(): number {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado === 'CUMPLIDO').length;
  }

  get vencidos(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => this.esVencido(a));
  }

  get criticos(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => !this.esVencido(a) && a.criticidad === 'CRITICO');
  }

  get otrosPendientes(): MisAcuerdoDTO[] {
    return this.pendientes.filter((a) => !this.esVencido(a) && a.criticidad !== 'CRITICO');
  }

  get cumplidosRecientes(): MisAcuerdoDTO[] {
    return this.acuerdos.filter((a) => a.reunionAcuerdoEstado === 'CUMPLIDO');
  }

  criticidadClass(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIO':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-500 border border-gray-200';
    }
  }

  criticidadLabel(criticidad: string): string {
    switch (criticidad) {
      case 'CRITICO':
        return 'Crítico';
      case 'MEDIO':
        return 'Medio';
      default:
        return 'Normal';
    }
  }

  irAReunion(a: MisAcuerdoDTO): void {
    this.router.navigate(['/projects/actas-reunion', a.reunionId]);
  }

  abrirAcuerdo(a: MisAcuerdoDTO): void {
    this.acuerdoSeleccionado = a;
    this.reprogramando = false;
  }

  cerrarModal(): void {
    this.acuerdoSeleccionado = null;
    this.reprogramando = false;
  }

  marcarCumplido(): void {
    const a = this.acuerdoSeleccionado;
    if (!a) return;
    if (a.requiereEvidencia && !a.evidenciaUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta evidencia',
        text: 'Este acuerdo requiere adjuntar evidencia antes de poder marcarse como cumplido. Edítalo desde el acta completa para subirla.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const tieneEvidencia = !!a.evidenciaUrl;
    Swal.fire({
      icon: 'question',
      title: '¿Marcar acuerdo como cumplido?',
      input: 'textarea',
      inputLabel: tieneEvidencia ? 'Comentario (opcional)' : 'Cómo se levantó (obligatorio, no hay evidencia adjunta)',
      inputPlaceholder: 'Describe cómo se resolvió el acuerdo...',
      inputValidator: (value) => (!tieneEvidencia && !value?.trim() ? 'Indica cómo se levantó el acuerdo.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Sí, cumplido',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.marcarAcuerdoCumplido(a.reunionAcuerdoId, { comentario: result.value?.trim() || null }).subscribe({
        next: () => {
          this.loaderService.hide();
          this.cerrarModal();
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  abrirReprogramar(): void {
    this.reprogramando = true;
    this.nuevaFecha = this.acuerdoSeleccionado?.fechaProgramada ?? '';
    this.motivo = '';
  }

  confirmarReprogramar(): void {
    const a = this.acuerdoSeleccionado;
    if (!a) return;
    if (!this.nuevaFecha || !this.motivo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Indica la nueva fecha y el motivo de la reprogramación.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service.reprogramarAcuerdo(a.reunionAcuerdoId, { nuevaFechaProgramada: this.nuevaFecha, motivo: this.motivo.trim() }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cerrarModal();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
