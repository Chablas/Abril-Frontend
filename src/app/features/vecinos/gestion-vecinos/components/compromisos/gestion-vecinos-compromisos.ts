import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { StatusPills } from '../status-pills/status-pills';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  VecinoSolicitudItemDTO,
  VecinoCompromisoItemDTO,
  VecinoEntregableItemDTO,
  CatalogOptionDTO,
} from '../../dtos/gestion-vecinos.dto';

@Component({
  selector: 'app-gestion-vecinos-compromisos',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPills],
  templateUrl: './gestion-vecinos-compromisos.html',
})
export class GestionVecinosCompromisos implements OnInit {
  @Input() solicitud!: VecinoSolicitudItemDTO;
  @Input() compromisoEstados: CatalogOptionDTO[] = [];
  @Input() entregableEstados: CatalogOptionDTO[] = [];
  /** Se emite cuando cambia el número de compromisos (para refrescar badges). */
  @Output() changed = new EventEmitter<void>();

  compromisos: VecinoCompromisoItemDTO[] = [];
  loaded = false;

  showForm = false;
  nuevo = {
    descripcion: '',
    esCritico: false,
    vecinoCompromisoEstadoId: null as number | null,
    fechaInicio: '' as string,
    fechaFin: '' as string,
  };

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Estado por defecto del nuevo compromiso = "Pendiente".
    this.nuevo.vecinoCompromisoEstadoId =
      this.compromisoEstados.find((e) => e.descripcion === 'Pendiente')?.id ?? null;
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getCompromisos(this.solicitud.vecinoSolicitudId).subscribe({
      next: (res) => {
        this.compromisos = res;
        this.loaded = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  addCompromiso(): void {
    if (!this.nuevo.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Descripción requerida', text: 'Ingresa la descripción del compromiso.', confirmButtonColor: '#64BC04' });
      return;
    }
    if (this.nuevo.fechaInicio && this.nuevo.fechaFin && this.nuevo.fechaFin < this.nuevo.fechaInicio) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha fin no puede ser anterior a la fecha de inicio.', confirmButtonColor: '#64BC04' });
      return;
    }

    this.loaderService.show();
    this.service
      .createCompromiso(this.solicitud.vecinoSolicitudId, {
        descripcion: this.nuevo.descripcion.trim(),
        esCritico: this.nuevo.esCritico,
        vecinoCompromisoEstadoId: this.nuevo.vecinoCompromisoEstadoId,
        fechaInicio: this.nuevo.fechaInicio || null,
        fechaFin: this.nuevo.fechaFin || null,
      })
      .subscribe({
        next: () => {
          this.nuevo = { descripcion: '', esCritico: false, vecinoCompromisoEstadoId: null, fechaInicio: '', fechaFin: '' };
          this.showForm = false;
          this.changed.emit();
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  onCompromisoEstadoChange(c: VecinoCompromisoItemDTO, estadoId: number): void {
    const previo = c.vecinoCompromisoEstadoId;
    if (estadoId === previo) return;
    this.loaderService.show();
    this.service.updateCompromisoEstado(c.vecinoCompromisoId, estadoId).subscribe({
      next: () => {
        const e = this.compromisoEstados.find((x) => x.id === estadoId);
        c.vecinoCompromisoEstadoId = estadoId;
        if (e) c.estadoDescripcion = e.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        c.vecinoCompromisoEstadoId = previo;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Tipo de entregable obligatorio: no admite el estado "No aplica". */
  private static readonly ENTREGABLE_OBLIGATORIO = 'Acta de Compromiso';

  esObligatorio(ent: VecinoEntregableItemDTO): boolean {
    return ent.tipoDescripcion === GestionVecinosCompromisos.ENTREGABLE_OBLIGATORIO;
  }

  /** Estados disponibles para un entregable (oculta "No aplica" en los obligatorios). */
  estadosPara(ent: VecinoEntregableItemDTO): CatalogOptionDTO[] {
    if (!this.esObligatorio(ent)) return this.entregableEstados;
    return this.entregableEstados.filter((e) => e.descripcion !== 'No aplica');
  }

  /** URL absoluta del archivo del entregable (la ruta guardada es relativa al backend). */
  entregableFileUrl(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  onEntregableFileSelected(ent: VecinoEntregableItemDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loaderService.show();
    this.service.uploadEntregable(ent.vecinoCompromisoEntregableId, file).subscribe({
      next: (res) => {
        ent.archivoUrl = res.archivoUrl;
        ent.originalFileName = file.name;
        input.value = '';
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        input.value = '';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onEntregableEstadoChange(ent: VecinoEntregableItemDTO, estadoId: number): void {
    const previo = ent.vecinoEntregableEstadoId;
    if (estadoId === previo) return;
    this.loaderService.show();
    this.service.updateEntregableEstado(ent.vecinoCompromisoEntregableId, estadoId).subscribe({
      next: () => {
        const e = this.entregableEstados.find((x) => x.id === estadoId);
        ent.vecinoEntregableEstadoId = estadoId;
        if (e) ent.estadoDescripcion = e.descripcion;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        ent.vecinoEntregableEstadoId = previo;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
