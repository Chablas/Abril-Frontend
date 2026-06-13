import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RacService } from '../../services/rac.service';
import {
  PenalidadListItemDto,
  PenalidadListQuery,
  PenalidadDetalleDto,
  PenalidadDescargaRequest,
  PenalidadResolverRequest,
  RacPagedResult,
} from '../../dtos/rac.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rac-penalidades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './rac-penalidades.html',
  styleUrl: './rac-penalidades.css',
})
export class RacPenalidades implements OnInit {
  result: RacPagedResult<PenalidadListItemDto> | null = null;
  loading = false;

  filtroEstado = '';
  filtroProyectoId: number | undefined = undefined;

  penalidadSeleccionada: PenalidadDetalleDto | null = null;
  loadingDetalle = false;
  mostrarModal = false;

  descargoTexto = '';
  resolucionTexto = '';
  resolucionTipo = '';
  guardandoAccion = false;

  query: PenalidadListQuery = { page: 1, pageSize: 20 };

  constructor(
    private racService: RacService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: PenalidadListQuery = {
      ...this.query,
      estado: this.filtroEstado || undefined,
      page: 1,
    };
    this.query = q;
    this.racService.getPenalidadList(q).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cambiarPagina(p: number): void {
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.load();
  }

  abrirDetalle(id: number): void {
    this.loadingDetalle = true;
    this.mostrarModal = true;
    this.penalidadSeleccionada = null;
    this.descargoTexto = '';
    this.resolucionTexto = '';
    this.resolucionTipo = '';
    this.cdr.markForCheck();
    this.racService.getPenalidadDetalle(id).subscribe({
      next: (p) => {
        this.penalidadSeleccionada = p;
        this.loadingDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadingDetalle = false;
        this.mostrarModal = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.penalidadSeleccionada = null;
    this.cdr.markForCheck();
  }

  presentarDescargo(): void {
    if (!this.penalidadSeleccionada) return;
    if (this.descargoTexto.trim().length < 10) return;
    const req: PenalidadDescargaRequest = {
      descargoTexto: this.descargoTexto.trim(),
    };
    this.guardandoAccion = true;
    this.racService.presentarDescargo(this.penalidadSeleccionada.id, req).subscribe({
      next: () => {
        this.guardandoAccion = false;
        Swal.fire('Descargo presentado', '', 'success');
        this.cerrarModal();
        this.load();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardandoAccion = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  resolver(tipo: 'Aplicada' | 'Anulada'): void {
    if (!this.penalidadSeleccionada) return;
    Swal.fire({
      title: tipo === 'Aplicada' ? '¿Aplicar penalidad?' : '¿Anular penalidad?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: tipo === 'Aplicada' ? '#b91c1c' : '#2e7d32',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const req: PenalidadResolverRequest = {
        tipo,
        resolucionTexto: this.resolucionTexto || undefined,
      };
      this.guardandoAccion = true;
      this.racService.resolverPenalidad(this.penalidadSeleccionada!.id, req).subscribe({
        next: () => {
          this.guardandoAccion = false;
          Swal.fire('Listo', `Penalidad ${tipo.toLowerCase()}`, 'success');
          this.cerrarModal();
          this.load();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardandoAccion = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  irARac(racId: number): void {
    this.router.navigate(['/ssoma/gestion/rac', racId]);
  }

  estadoPenalClass(est: string): string {
    switch (est) {
      case 'EnEvaluacion':       return 'pen-evaluacion';
      case 'DescargoPresentado': return 'pen-descargo';
      case 'Aplicada':           return 'pen-aplicada';
      case 'Anulada':            return 'pen-anulada';
      default:                   return '';
    }
  }
}
