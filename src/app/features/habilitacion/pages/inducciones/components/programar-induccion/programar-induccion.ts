import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { InduccionService } from '../../../../services/induccion.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';
import { InduccionCreateDto } from '../../../../dtos/induccion.model';

@Component({
  selector: 'app-programar-induccion',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './programar-induccion.html',
  styleUrl: './programar-induccion.css',
})
export class ProgramarInduccion implements OnChanges, OnDestroy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];

  workersSearch = '';
  workersResultados: WorkerHabilitacionListDto[] = [];
  loadingWorkers = false;
  selectedWorker: WorkerHabilitacionListDto | null = null;

  proyectoId: number | null = null;
  fechaProgramada = '';
  trabajoAltura = false;

  saving = false;
  hoy = new Date().toISOString().substring(0, 10);

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private induccionService: InduccionService,
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.searchWorkers());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadProyectos();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private reset(): void {
    this.workersSearch = '';
    this.workersResultados = [];
    this.selectedWorker = null;
    this.proyectoId = null;
    this.fechaProgramada = this.hoy;
    this.trabajoAltura = false;
  }

  private loadProyectos(): void {
    if (this.authService.isContratista()) {
      const empresaId = this.authService.getEmpresaId();
      if (!empresaId) { this.proyectos = []; return; }
      this.empresaContratistaService.getProyectos(empresaId).subscribe({
        next: (res) => {
          this.proyectos = (res ?? []).map((p: any) => ({
            projectId: p.proyectoId,
            projectDescription: p.proyectoNombre,
          })) as unknown as ProjectGetDTO[];
          this.cdr.detectChanges();
        },
        error: () => { this.proyectos = []; },
      });
      return;
    }
    this.projectService.getProjectPaged(1).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
      },
    });
  }

  onWorkersSearchChange(): void {
    this.searchChange$.next();
  }

  private searchWorkers(): void {
    const term = this.workersSearch.trim();
    if (!term) {
      this.workersResultados = [];
      return;
    }
    this.loadingWorkers = true;

    const empresaId = this.authService.isContratista()
      ? (this.authService.getEmpresaId() ?? undefined)
      : undefined;

    this.trabajadorHabService
      .getTrabajadores({ search: term, page: 1, pageSize: 20, empresaId })
      .subscribe({
        next: (res) => {
          this.workersResultados = res.data ?? [];
          this.loadingWorkers = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.workersResultados = [];
          this.loadingWorkers = false;
        },
      });
  }

  selectWorker(worker: WorkerHabilitacionListDto): void {
    this.selectedWorker = worker;
    this.workersSearch = worker.apellidoNombre;
    this.workersResultados = [];
  }

  clearWorker(): void {
    this.selectedWorker = null;
    this.workersSearch = '';
  }

  get title(): string {
    return 'Programar inducción';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.selectedWorker) return false;
    if (!this.proyectoId) return false;
    if (!this.fechaProgramada) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit || !this.selectedWorker || !this.proyectoId) return;

    if (!this.selectedWorker.empresaId) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'El trabajador seleccionado no tiene empresa asociada.',
      });
      return;
    }

    const payload: InduccionCreateDto = {
      workerId: this.selectedWorker.workerId,
      proyectoId: this.proyectoId,
      empresaId: this.selectedWorker.empresaId,
      fechaProgramada: this.fechaProgramada,
      trabajoAltura: this.trabajoAltura,
    };

    this.saving = true;
    this.loaderService.show();

    this.induccionService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Inducción programada',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
