import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { VecinoLicenciaItemDTO, VecinoLicenciaVisitaDTO } from '../../dtos/control-licencias.dto';

@Component({
  selector: 'app-licencia-visitas',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './licencia-visitas.html',
})
export class LicenciaVisitas implements OnInit {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  nuevaFecha: string | null = null;
  nuevaObservacion = '';

  /** Correos que efectivamente recibirán el recordatorio (Residente + Administración), para que quien registra la visita los confirme. */
  destinatariosResueltos: string[] = [];
  destinatariosLoaded = false;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getDestinatarios(this.projectId).subscribe({
      next: (res) => {
        this.destinatariosResueltos = res.automaticos
          .filter((a) => (a.rol === 'Residente' || a.rol === 'Administración') && a.email)
          .map((a) => `${a.rol}: ${a.email}`);
        this.destinatariosLoaded = true;
      },
      error: () => {
        this.destinatariosLoaded = true;
      },
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  agregar(): void {
    if (!this.nuevaFecha) {
      Swal.fire({ icon: 'warning', title: 'Indica la fecha de visita', confirmButtonColor: '#0F6E56' });
      return;
    }

    this.loaderService.show();
    this.service
      .addVisita(this.projectId, this.item.vecinoLicenciaControlTipoId, {
        fechaVisita: this.nuevaFecha,
        observacion: this.nuevaObservacion.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.item.visitas = [...this.item.visitas, res.visita].sort((a, b) => a.fechaVisita.localeCompare(b.fechaVisita));
          this.nuevaFecha = null;
          this.nuevaObservacion = '';
          this.loaderService.hide();
          this.changed.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  async eliminar(v: VecinoLicenciaVisitaDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar esta visita?',
      text: `Visita del ${v.fechaVisita}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteVisita(v.vecinoLicenciaControlVisitaId).subscribe({
      next: () => {
        this.item.visitas = this.item.visitas.filter(
          (x) => x.vecinoLicenciaControlVisitaId !== v.vecinoLicenciaControlVisitaId,
        );
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
