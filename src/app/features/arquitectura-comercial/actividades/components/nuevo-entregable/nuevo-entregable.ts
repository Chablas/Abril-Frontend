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

interface NuevoEntregableForm {
  etapaNombre: string;
  reporte: string;
  categoriaId: number | null;
  etapaId: number | null;
  inicioProgramado: string;
  finProgramado: string;
  userId: number | null;
}

@Component({
  selector: 'app-nuevo-entregable',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './nuevo-entregable.html',
  styleUrl: './nuevo-entregable.css',
})
export class NuevoEntregable implements OnChanges {
  @Input() open = false;
  @Input() projectId: number | null = null;
  @Input() supervisores: SupervisorAcDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ActividadListItemDTO>();

  readonly etapasNombre = ['ETAPA 1', 'ETAPA 2', 'ETAPA 3', 'ETAPA 4'];
  readonly reportes = [
    'REPORTE DE LEVANTAMIENTO DE OBS MENSUAL',
    'REPORTE DE SATISFACCIÓN MENSUAL',
    'REPORTE DE OS - OC MENSUAL',
    'REPORTE DE ALMACENES MENSUAL',
    'REPORTE DE RECICLAJE MENSUAL',
  ];
  readonly categorias = [
    { id: 3, nombre: 'POST VENTA' },
    { id: 4, nombre: 'ALMACENES' },
  ];

  etapas: AcEtapaDTO[] = [];
  loadingEtapas = false;
  saving = false;

  model: NuevoEntregableForm = this.empty();

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

  private empty(): NuevoEntregableForm {
    return {
      etapaNombre: '',
      reporte: '',
      categoriaId: null,
      etapaId: null,
      inicioProgramado: '',
      finProgramado: '',
      userId: null,
    };
  }

  private loadEtapas(): void {
    if (this.etapas.length > 0) {
      this.applyDefaultEtapa();
      return;
    }
    this.loadingEtapas = true;
    this.service.getEtapas().subscribe({
      next: data => {
        this.etapas = data;
        this.applyDefaultEtapa();
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyDefaultEtapa(): void {
    const postVenta = this.etapas.find(e => e.nombre === 'POST VENTA Y EXPERIENCIA');
    if (postVenta) this.model.etapaId = postVenta.id;
  }

  get nombreCalculado(): string {
    const { etapaNombre, reporte } = this.model;
    if (!etapaNombre || !reporte) return '';
    return `${etapaNombre}_${reporte}`;
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.projectId && !!this.model.etapaNombre && !!this.model.reporte;
  }

  submit(): void {
    if (!this.canSubmit || !this.projectId) return;

    const body: CreateActividadBody = {
      nombre: this.nombreCalculado,
      tipo: 'ENTREGABLE',
      projectId: this.projectId,
      etapaId: this.model.etapaId,
      categoriaId: this.model.categoriaId,
      especialidadId: 2,
      userId: this.model.userId,
      inicioProgramado: this.model.inicioProgramado || null,
      finProgramado: this.model.finProgramado || null,
    };

    this.saving = true;
    this.service.createActividad(body).subscribe({
      next: created => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Entregable creado', timer: 1500, showConfirmButton: false });
        this.saved.emit(created);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'No se pudo crear el entregable';
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
