import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ArquitecturaComercialService } from '../../../../../core/services/arquitectura-comercial.service';
import {
  AcEtapaDTO,
  ActividadListItemDTO,
  CreateActividadBody,
  SupervisorAcDTO,
} from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

interface NuevaConsultaForm {
  etapaNombre: string;
  rfiNumero: number | null;
  ubicacion: string;
  etapaId: number | null;
  inicioProgramado: string;
  finProgramado: string;
  userId: number | null;
}

@Component({
  selector: 'app-nueva-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './nueva-consulta.html',
  styleUrl: './nueva-consulta.css',
})
export class NuevaConsulta implements OnChanges {
  @Input() open = false;
  @Input() projectId: number | null = null;
  @Input() supervisores: SupervisorAcDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ActividadListItemDTO>();

  readonly etapasNombre = ['ETAPA 1', 'ETAPA 2', 'ETAPA 3', 'ETAPA 4'];

  etapas: AcEtapaDTO[] = [];
  loadingEtapas = false;
  saving = false;

  model: NuevaConsultaForm = this.empty();

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      this.loadEtapas();
    }
  }

  private empty(): NuevaConsultaForm {
    return {
      etapaNombre: '',
      rfiNumero: null,
      ubicacion: '',
      etapaId: null,
      inicioProgramado: '',
      finProgramado: '',
      userId: null,
    };
  }

  private loadEtapas(): void {
    if (this.etapas.length > 0) return;
    this.loadingEtapas = true;
    this.service.getEtapas().subscribe({
      next: data => {
        this.etapas = data;
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
    });
  }

  get nombreCalculado(): string {
    const etapa = this.model.etapaNombre;
    const rfi = this.model.rfiNumero;
    const ubi = this.model.ubicacion.trim();
    if (!etapa || rfi == null || !ubi) return '';
    return `${etapa}_RFI_${rfi}_${ubi}`;
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.projectId && !!this.nombreCalculado;
  }

  submit(): void {
    if (!this.canSubmit || !this.projectId) return;

    const body: CreateActividadBody = {
      nombre: this.nombreCalculado,
      tipo: 'CONSULTA',
      projectId: this.projectId,
      etapaId: this.model.etapaId,
      userId: this.model.userId,
      inicioProgramado: this.model.inicioProgramado || null,
      finProgramado: this.model.finProgramado || null,
    };

    this.saving = true;
    this.service.createActividad(body).subscribe({
      next: created => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Consulta creada', timer: 1500, showConfirmButton: false });
        this.saved.emit(created);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'No se pudo crear la consulta';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }

  trackByEtapa(_: number, e: AcEtapaDTO): number {
    return e.id;
  }

  trackBySupervisor(_: number, s: SupervisorAcDTO): number {
    return s.id;
  }
}
