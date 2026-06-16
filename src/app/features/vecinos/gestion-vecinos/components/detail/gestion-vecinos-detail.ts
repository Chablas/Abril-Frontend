import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { StatusPills } from '../status-pills/status-pills';
import { GestionVecinosCompromisos } from '../compromisos/gestion-vecinos-compromisos';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  VecinoListItemDTO,
  VecinoSolicitudItemDTO,
  CatalogOptionDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SectionTabs, StatusPills, GestionVecinosCompromisos],
  templateUrl: './gestion-vecinos-detail.html',
})
export class GestionVecinosDetail implements OnInit {
  @Input() item!: VecinoListItemDTO;
  @Output() closeModal = new EventEmitter<void>();

  activeTab = 'detalle';

  solicitudes: VecinoSolicitudItemDTO[] = [];
  estados: CatalogOptionDTO[] = [];
  compromisoEstados: CatalogOptionDTO[] = [];
  entregableEstados: CatalogOptionDTO[] = [];
  solicitudesLoaded = false;

  expandedSolicitudId: number | null = null;

  // Formulario de nueva solicitud
  nuevaDescripcion = '';
  nuevaCritica = false;

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  get tabs(): SectionTab[] {
    return [
      { id: 'detalle', label: 'Detalle' },
      { id: 'solicitudes', label: 'Solicitudes', badge: this.solicitudesLoaded ? this.solicitudes.length : null },
    ];
  }

  ngOnInit(): void {
    this.loadSolicitudes();
  }

  /** Ordena un catálogo según un orden explícito de descripciones; los no listados van al final. */
  private sortByDescripcion(options: CatalogOptionDTO[], order: string[]): CatalogOptionDTO[] {
    const rank = (d: string) => {
      const i = order.indexOf(d);
      return i === -1 ? order.length : i;
    };
    return [...options].sort((a, b) => rank(a.descripcion) - rank(b.descripcion));
  }

  private loadSolicitudes(): void {
    this.loaderService.show();
    this.service.getSolicitudes(this.item.vecinoId).subscribe({
      next: (res) => {
        this.solicitudes = res.solicitudes;
        this.estados = this.sortByDescripcion(res.estados, ['Por responder', 'Denegada', 'Aceptada']);
        this.compromisoEstados = this.sortByDescripcion(res.compromisoEstados, [
          'Pendiente',
          'En proceso',
          'Culminado',
        ]);
        this.entregableEstados = this.sortByDescripcion(res.entregableEstados, [
          'Falta',
          'No aplica',
          'Enviado',
          'Aprobado',
        ]);
        this.solicitudesLoaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  addSolicitud(): void {
    if (!this.nuevaDescripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción requerida',
        text: 'Ingresa la descripción de la solicitud.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .createSolicitud(this.item.vecinoId, {
        descripcion: this.nuevaDescripcion.trim(),
        esCritica: this.nuevaCritica,
      })
      .subscribe({
        next: () => {
          this.nuevaDescripcion = '';
          this.nuevaCritica = false;
          this.loadSolicitudes();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  toggleCompromisos(solicitud: VecinoSolicitudItemDTO): void {
    this.expandedSolicitudId =
      this.expandedSolicitudId === solicitud.vecinoSolicitudId ? null : solicitud.vecinoSolicitudId;
  }

  onEstadoChange(solicitud: VecinoSolicitudItemDTO, estadoId: number): void {
    const previo = solicitud.vecinoSolicitudEstadoId;
    if (estadoId === previo) return;

    this.loaderService.show();
    this.service.updateSolicitudEstado(solicitud.vecinoSolicitudId, estadoId).subscribe({
      next: () => {
        const estado = this.estados.find((e) => e.id === estadoId);
        solicitud.vecinoSolicitudEstadoId = estadoId;
        if (estado) solicitud.estadoDescripcion = estado.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        solicitud.vecinoSolicitudEstadoId = previo; // revertir
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
