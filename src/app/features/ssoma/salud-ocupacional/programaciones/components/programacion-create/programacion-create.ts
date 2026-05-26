import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkerSearchInput } from '../../../shared/worker-search-input/worker-search-input';
import { ProgramacionService } from '../../../services/programacion.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  EmpresaSimpleDto,
  MedicoSimpleDto,
} from '../../../dtos/catalogos.model';
import { WorkerSearchItemDto } from '../../../dtos/worker-search.model';
import { ProgramacionCreateDto } from '../../../dtos/programacion.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-programacion-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, WorkerSearchInput],
  templateUrl: './programacion-create.html',
  styleUrl: './programacion-create.css',
})
export class ProgramacionCreate implements OnInit {
  @Input() open = false;
  @Input() preselectedWorkerId: number | null = null;
  @Input() preselectedWorkerNombre: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  worker: WorkerSearchItemDto | null = null;
  tipoEmoId = 0;
  empresaId = 0;
  fecha = '';
  hora = '';
  clinicaId: number | null = null;
  medicoId: number | null = null;
  motivo = '';
  notas = '';

  saving = false;

  emoTipos: EmoTipoDto[] = [];
  empresas: EmpresaSimpleDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];

  constructor(
    private service: ProgramacionService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalogos.getEmoTipos().subscribe((res) => {
      this.emoTipos = res;
      this.cdr.detectChanges();
    });
    this.catalogos.getEmpresas().subscribe((res) => {
      this.empresas = res;
      this.cdr.detectChanges();
    });
    this.catalogos.getClinicas().subscribe((res) => {
      this.clinicas = res;
      this.cdr.detectChanges();
    });
    this.catalogos.getMedicos().subscribe((res) => {
      this.medicos = res;
      this.cdr.detectChanges();
    });
    if (this.preselectedWorkerId && this.preselectedWorkerNombre) {
      this.worker = {
        id: this.preselectedWorkerId,
        apellidoNombre: this.preselectedWorkerNombre,
        dni: '',
        activo: true,
      } as WorkerSearchItemDto;
    }
  }

  onWorkerSelected(w: WorkerSearchItemDto | null): void {
    this.worker = w;
    if (w?.empresaActualId && !this.empresaId) {
      this.empresaId = w.empresaActualId;
    }
  }

  get medicosFiltrados(): MedicoSimpleDto[] {
    if (!this.clinicaId) return this.medicos;
    return this.medicos.filter((m) => !m.clinicaId || m.clinicaId === this.clinicaId);
  }

  onClinicaChange(id: number | null): void {
    this.clinicaId = id;
    if (id && this.medicoId) {
      const match = this.medicos.find((m) => m.id === this.medicoId);
      if (match && match.clinicaId && match.clinicaId !== id) {
        this.medicoId = null;
      }
    }
  }

  get canSubmit(): boolean {
    return !!(this.worker && this.tipoEmoId && this.empresaId && this.fecha) && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa trabajador, tipo EMO, empresa y fecha.',
      });
      return;
    }

    const payload: ProgramacionCreateDto = {
      workerId: this.worker.id,
      tipoEmoId: this.tipoEmoId,
      empresaId: this.empresaId,
      fecha: this.fecha,
      hora: this.hora || undefined,
      clinicaId: this.clinicaId || undefined,
      medicoId: this.medicoId || undefined,
      motivo: this.motivo || undefined,
      notas: this.notas || undefined,
    };

    this.saving = true;
    this.loaderService.show();
    this.service.createProgramacion(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Programación registrada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
