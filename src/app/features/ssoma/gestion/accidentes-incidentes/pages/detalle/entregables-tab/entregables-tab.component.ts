import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccidenteIncidenteService } from '../../../accidente-incidente.service';
import {
  EntregableDto,
  ActualizarEntregableRequest,
  ESTADOS_ENTREGABLE,
} from '../../../accidente-incidente.dtos';
import { environment } from '../../../../../../../../environments/environment';

@Component({
  selector: 'app-entregables-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './entregables-tab.component.html',
  styleUrl: './entregables-tab.component.css',
})
export class EntregablesTabComponent implements OnInit {
  @Input() accidenteId!: number;

  entregables: EntregableDto[] = [];
  cargando = true;
  editandoId?: number;
  editForm: Partial<ActualizarEntregableRequest> = {};
  guardando = false;
  subiendoId?: number;

  readonly estadosEntregable = ESTADOS_ENTREGABLE;

  constructor(
    private service: AccidenteIncidenteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getEntregables(this.accidenteId).subscribe({
      next: (list) => {
        this.entregables = list;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  editar(e: EntregableDto): void {
    this.editandoId = e.id;
    this.editForm = {
      estado: e.estado,
      fechaLimite: e.fechaLimite ?? '',
      observacion: e.observacion ?? '',
      responsables: e.responsables.filter((r) => !r.workerId).map((r) => r.nombre),
      responsableWorkerIds: e.responsables.filter((r) => r.workerId).map((r) => r.workerId!),
    };
    this.cdr.detectChanges();
  }

  cancelarEdicion(): void {
    this.editandoId = undefined;
    this.cdr.detectChanges();
  }

  guardar(e: EntregableDto): void {
    this.guardando = true;
    const req: ActualizarEntregableRequest = {
      estado: this.editForm.estado ?? e.estado,
      fechaLimite: this.editForm.fechaLimite || undefined,
      observacion: this.editForm.observacion || undefined,
      responsables: this.editForm.responsables ?? [],
      responsableWorkerIds: this.editForm.responsableWorkerIds ?? [],
    };
    this.service.actualizarEntregable(e.id, req).subscribe({
      next: () => {
        this.editandoId = undefined;
        this.guardando = false;
        this.cargar();
      },
      error: () => {
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  onArchivoSelect(event: Event, e: EntregableDto): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.subiendoId = e.id;
    this.cdr.detectChanges();
    this.service.subirArchivoEntregable(e.id, input.files[0]).subscribe({
      next: () => {
        this.subiendoId = undefined;
        this.cargar();
      },
      error: () => {
        this.subiendoId = undefined;
        this.cdr.detectChanges();
      },
    });
    input.value = '';
  }

  verArchivo(url: string): void {
    const token = localStorage.getItem('access_token');
    fetch(`${environment.apiUrl}api/v1/habilitacion/archivos/ver?url=${encodeURIComponent(url)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => window.open(URL.createObjectURL(new Blob([blob], { type: blob.type || 'application/pdf' })), '_blank'));
  }

  estadoClass(estado: string): string {
    return {
      Pendiente: 'chip chip--pendiente',
      Presentado: 'chip chip--presentado',
      Observado: 'chip chip--observado',
      Aprobado: 'chip chip--aprobado',
      'No aplica': 'chip chip--noaplica',
    }[estado] ?? 'chip';
  }
}
