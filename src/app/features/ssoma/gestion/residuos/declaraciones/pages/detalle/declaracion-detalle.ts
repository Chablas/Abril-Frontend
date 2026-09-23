import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { DeclaracionResiduoService } from '../../services/declaracion-residuo.service';
import {
  DeclaracionResiduoDto,
  DeclaracionResiduoDetalleDto,
  DeclaracionResiduoDetalleUpsertRequest,
  DeclaracionResiduoEoRsDto,
  DeclaracionResiduoEoRsUpsertRequest,
  EtapaEoRsDeclaracion,
  MESES_DECLARACION,
  MANEJO_DECLARACION,
} from '../../dtos/declaracion-residuo.dtos';
import { TipoResiduoService } from '../../../tipos/services/tipo-residuo.service';
import { ResiduoTipoDto } from '../../../tipos/dtos/tipo-residuo.dtos';
import { EoRsService } from '../../../eo-rs/services/eo-rs.service';
import { ResiduoEoRsDto } from '../../../eo-rs/dtos/eo-rs.dtos';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { AbrilModalPanel } from '../../../../../../../shared/components/abril-modal-panel/abril-modal-panel';

type Tab = 'cantidad' | 'manejo' | 'eo-rs';

@Component({
  selector: 'app-declaracion-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, AbrilModalPanel],
  templateUrl: './declaracion-detalle.html',
  styleUrl: './declaracion-detalle.css',
})
export class DeclaracionDetalle implements OnInit {
  readonly meses = MESES_DECLARACION;
  readonly manejoCols = MANEJO_DECLARACION;

  declaracionId = 0;
  declaracion: DeclaracionResiduoDto | null = null;
  loading = false;
  tab: Tab = 'cantidad';

  tiposResiduo: ResiduoTipoDto[] = [];
  eoRsCatalogo: ResiduoEoRsDto[] = [];

  modalDetalleAbierto = false;
  guardandoDetalle = false;
  detalleForm: DeclaracionResiduoDetalleUpsertRequest = this.detalleVacio();
  detalleEditandoId: number | null = null;

  modalEoRsAbierto = false;
  guardandoEoRs = false;
  eoRsForm: DeclaracionResiduoEoRsUpsertRequest = { eoRsId: 0, etapa: 'RECOLECCION_TRANSPORTE', numeroServiciosAnio: 0, totalResiduoTon: 0 };
  eoRsEditandoId: number | null = null;

  modalPresentarAbierto = false;
  fechaPresentacion = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: DeclaracionResiduoService,
    private tipoResiduoService: TipoResiduoService,
    private eoRsService: EoRsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.declaracionId = Number(this.route.snapshot.paramMap.get('id'));
    this.tipoResiduoService.getAll(true).subscribe({ next: (r) => { this.tiposResiduo = r; this.cdr.detectChanges(); } });
    this.eoRsService.getAll(true).subscribe({ next: (r) => { this.eoRsCatalogo = r; this.cdr.detectChanges(); } });
    this.load();
  }

  private detalleVacio(): DeclaracionResiduoDetalleUpsertRequest {
    return {
      residuoTipoId: 0,
      cantidadAcumuladaAnterior: 0,
      ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, sep: 0, oct: 0, nov: 0, dic: 0,
      almacenado: 0, tratado: 0, acondicionado: 0, valorizado: 0, comercializado: 0, disposicionFinal: 0,
    };
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getById(this.declaracionId).subscribe({
      next: (res) => {
        this.declaracion = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/residuos/declaraciones']);
  }

  cambiarTab(t: Tab): void {
    this.tab = t;
  }

  get esBorrador(): boolean {
    return this.declaracion?.estado === 'BORRADOR';
  }

  // ---- Totales por fila (tab Cantidad de Residuos) ----
  totalMensual(d: DeclaracionResiduoDetalleDto): number {
    return d.ene + d.feb + d.mar + d.abr + d.may + d.jun + d.jul + d.ago + d.sep + d.oct + d.nov + d.dic;
  }

  totalGenerado(d: DeclaracionResiduoDetalleDto): number {
    return d.cantidadAcumuladaAnterior + this.totalMensual(d);
  }

  // ---- Totales por fila (tab Manejo del Residuo) ----
  totalManejo(d: DeclaracionResiduoDetalleDto): number {
    return d.almacenado + d.tratado + d.acondicionado + d.valorizado + d.comercializado + d.disposicionFinal;
  }

  manejoCuadra(d: DeclaracionResiduoDetalleDto): boolean {
    return Math.abs(this.totalManejo(d) - this.totalGenerado(d)) < 0.001;
  }

  nombreTipo(id: number): string {
    return this.tiposResiduo.find((t) => t.id === id)?.nombre ?? `Tipo #${id}`;
  }

  // ---- Recalcular ----
  recalcular(forzar = false): void {
    if (!this.declaracion) return;
    this.loaderService.show();
    this.service
      .recalcular({ contributorId: this.declaracion.contributorId, periodoAnio: this.declaracion.periodoAnio, forzar })
      .subscribe({
        next: (res) => {
          this.declaracion = res;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ---- Detalle por tipo de residuo ----
  abrirNuevoDetalle(): void {
    this.detalleForm = this.detalleVacio();
    this.detalleEditandoId = null;
    this.modalDetalleAbierto = true;
  }

  editarDetalle(d: DeclaracionResiduoDetalleDto): void {
    this.detalleForm = { ...d };
    this.detalleEditandoId = d.id;
    this.modalDetalleAbierto = true;
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto = false;
  }

  guardarDetalle(): void {
    if (!this.declaracion || !this.detalleForm.residuoTipoId) return;
    this.guardandoDetalle = true;
    this.service.upsertDetalle(this.declaracion.id, this.detalleForm).subscribe({
      next: () => {
        this.guardandoDetalle = false;
        this.modalDetalleAbierto = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoDetalle = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarDetalle(d: DeclaracionResiduoDetalleDto): void {
    Swal.fire({
      icon: 'question',
      title: `¿Eliminar el detalle de "${this.nombreTipo(d.residuoTipoId)}"?`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarDetalle(d.id).subscribe({
        next: () => { this.loaderService.hide(); this.load(); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  // ---- EO-RS intervinientes ----
  abrirNuevoEoRs(): void {
    this.eoRsForm = { eoRsId: 0, etapa: 'RECOLECCION_TRANSPORTE', numeroServiciosAnio: 0, totalResiduoTon: 0 };
    this.eoRsEditandoId = null;
    this.modalEoRsAbierto = true;
  }

  editarEoRs(item: DeclaracionResiduoEoRsDto): void {
    this.eoRsForm = { eoRsId: item.eoRsId, etapa: item.etapa, numeroServiciosAnio: item.numeroServiciosAnio, totalResiduoTon: item.totalResiduoTon };
    this.eoRsEditandoId = item.id;
    this.modalEoRsAbierto = true;
  }

  cerrarModalEoRs(): void {
    this.modalEoRsAbierto = false;
  }

  guardarEoRs(): void {
    if (!this.declaracion || !this.eoRsForm.eoRsId) return;
    this.guardandoEoRs = true;
    const obs: Observable<any> = this.eoRsEditandoId
      ? this.service.actualizarEoRsInterviniente(this.eoRsEditandoId, this.eoRsForm)
      : this.service.crearEoRsInterviniente(this.declaracion.id, this.eoRsForm);
    obs.subscribe({
      next: () => {
        this.guardandoEoRs = false;
        this.modalEoRsAbierto = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEoRs = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  eliminarEoRs(item: DeclaracionResiduoEoRsDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar este EO-RS interviniente?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarEoRsInterviniente(item.id).subscribe({
        next: () => { this.loaderService.hide(); this.load(); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  etiquetaEtapa(e: EtapaEoRsDeclaracion): string {
    switch (e) {
      case 'RECOLECCION_TRANSPORTE': return 'Recolección y transporte';
      case 'TRATAMIENTO': return 'Tratamiento';
      case 'VALORIZACION': return 'Valorización';
    }
  }

  // ---- Presentar / reabrir ----
  abrirModalPresentar(): void {
    this.fechaPresentacion = new Date().toISOString().slice(0, 10);
    this.modalPresentarAbierto = true;
  }

  cerrarModalPresentar(): void {
    this.modalPresentarAbierto = false;
  }

  confirmarPresentar(): void {
    if (!this.declaracion || !this.fechaPresentacion) return;
    this.loaderService.show();
    this.service.marcarPresentada(this.declaracion.id, { fechaPresentacion: this.fechaPresentacion }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.modalPresentarAbierto = false;
        this.cdr.detectChanges();
        this.load();
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  reabrir(): void {
    if (!this.declaracion) return;
    Swal.fire({
      icon: 'question',
      title: '¿Volver esta declaración a borrador?',
      showCancelButton: true,
      confirmButtonText: 'Reabrir',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed || !this.declaracion) return;
      this.loaderService.show();
      this.service.volverABorrador(this.declaracion.id).subscribe({
        next: () => { this.loaderService.hide(); this.load(); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }
}
