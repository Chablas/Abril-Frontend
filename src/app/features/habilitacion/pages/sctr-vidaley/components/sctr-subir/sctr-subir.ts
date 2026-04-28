import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { SctrVidaLeyService } from '../../../../services/sctr-vidaley.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { SctrVidaLeyCreateDto } from '../../../../dtos/sctr.model';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';

interface SctrSubirForm {
  tipo: 'SCTR' | 'VIDA_LEY';
  proyectoId: number | null;
  mes: number;
  anio: number;
  archivoUrl: string;
  archivoNombre: string;
  archivoUrl2: string;
  archivoNombre2: string;
}

@Component({
  selector: 'app-sctr-subir',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './sctr-subir.html',
  styleUrl: './sctr-subir.css',
})
export class SctrSubir implements OnChanges {
  @ViewChild('fileInput1') fileInput1?: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput2') fileInput2?: ElementRef<HTMLInputElement>;

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];

  workersSearch = '';
  workersResultados: WorkerHabilitacionListDto[] = [];
  workersSeleccionados: WorkerHabilitacionListDto[] = [];
  loadingWorkers = false;

  model: SctrSubirForm = this.empty();
  saving = false;

  meses = [
    { num: 1, label: 'Enero' },
    { num: 2, label: 'Febrero' },
    { num: 3, label: 'Marzo' },
    { num: 4, label: 'Abril' },
    { num: 5, label: 'Mayo' },
    { num: 6, label: 'Junio' },
    { num: 7, label: 'Julio' },
    { num: 8, label: 'Agosto' },
    { num: 9, label: 'Septiembre' },
    { num: 10, label: 'Octubre' },
    { num: 11, label: 'Noviembre' },
    { num: 12, label: 'Diciembre' },
  ];

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private sctrService: SctrVidaLeyService,
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
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
      this.model = this.empty();
      this.workersSearch = '';
      this.workersResultados = [];
      this.workersSeleccionados = [];
      this.loadProyectos();
    }
  }

  private empty(): SctrSubirForm {
    return {
      tipo: 'SCTR',
      proyectoId: null,
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      archivoUrl: '',
      archivoNombre: '',
      archivoUrl2: '',
      archivoNombre2: '',
    };
  }

  private loadProyectos(): void {
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
    this.trabajadorHabService
      .getTrabajadores({ search: term, page: 1, pageSize: 20 })
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

  isWorkerSelected(workerId: number): boolean {
    return this.workersSeleccionados.some((w) => w.workerId === workerId);
  }

  toggleWorker(worker: WorkerHabilitacionListDto): void {
    if (this.isWorkerSelected(worker.workerId)) {
      this.workersSeleccionados = this.workersSeleccionados.filter(
        (w) => w.workerId !== worker.workerId,
      );
    } else {
      this.workersSeleccionados = [...this.workersSeleccionados, worker];
    }
  }

  removeWorker(workerId: number): void {
    this.workersSeleccionados = this.workersSeleccionados.filter(
      (w) => w.workerId !== workerId,
    );
  }

  triggerFile1(): void {
    this.fileInput1?.nativeElement.click();
  }

  triggerFile2(): void {
    this.fileInput2?.nativeElement.click();
  }

  onFile1Selected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.model.archivoNombre = file.name;
    this.model.archivoUrl = `pending-upload://${file.name}`;
    input.value = '';
  }

  onFile2Selected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.model.archivoNombre2 = file.name;
    this.model.archivoUrl2 = `pending-upload://${file.name}`;
    input.value = '';
  }

  clearFile1(): void {
    this.model.archivoUrl = '';
    this.model.archivoNombre = '';
  }

  clearFile2(): void {
    this.model.archivoUrl2 = '';
    this.model.archivoNombre2 = '';
  }

  get title(): string {
    return 'Subir SCTR / Vida Ley';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.model.proyectoId) return false;
    if (!this.model.mes || !this.model.anio) return false;
    if (!this.model.archivoUrl) return false;
    if (this.workersSeleccionados.length === 0) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit || !this.model.proyectoId) return;

    const payload: SctrVidaLeyCreateDto = {
      proyectoId: this.model.proyectoId,
      tipo: this.model.tipo,
      mes: this.model.mes,
      anio: this.model.anio,
      archivoUrl: this.model.archivoUrl,
      archivoUrl2: this.model.archivoUrl2 || undefined,
      workerIds: this.workersSeleccionados.map((w) => w.workerId),
    };

    this.saving = true;
    this.loaderService.show();

    this.sctrService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Documento creado',
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
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
    this.searchChange$ = new Subject<void>();
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.searchWorkers());
    this.closed.emit();
  }
}
