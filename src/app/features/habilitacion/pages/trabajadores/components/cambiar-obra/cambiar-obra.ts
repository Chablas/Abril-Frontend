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
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { CatalogosSaludService } from '../../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';

interface CambiarObraForm {
  proyectoId: number | null;
  empresaId: number | null;
  staffOficina: string;
  fechaCambio: string;
}

@Component({
  selector: 'app-hab-cambiar-obra',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './cambiar-obra.html',
  styleUrl: './cambiar-obra.css',
})
export class CambiarObra implements OnChanges {
  @Input() open = false;
  @Input() worker: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  empresas: EmpresaSimpleDto[] = [];

  model: CambiarObraForm = this.empty();
  saving = false;
  loadingCatalogos = false;

  staffOficinaOptions = [
    { id: 'Obra', nombre: 'Obra' },
    { id: 'Staff', nombre: 'Staff' },
    { id: 'Oficina Central', nombre: 'Oficina Central' },
  ];

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private projectService: ProjectService,
    private catalogosService: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      this.model.staffOficina = this.worker?.obraOficina ?? 'Obra';
      this.loadCatalogos();
    }
  }

  private empty(): CambiarObraForm {
    return {
      proyectoId: null,
      empresaId: null,
      staffOficina: 'Obra',
      fechaCambio: new Date().toISOString().substring(0, 10),
    };
  }

  private loadCatalogos(): void {
    this.loadingCatalogos = true;
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.proyectos = [];
        this.errorService.handleError(err);
      },
    });
    this.catalogosService.getEmpresas().subscribe({
      next: (res) => {
        this.empresas = res ?? [];
        this.loadingCatalogos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.empresas = [];
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
      },
    });
  }

  get title(): string {
    return 'Cambiar obra';
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.model.proyectoId && !!this.model.fechaCambio;
  }

  submit(): void {
    if (!this.canSubmit || !this.worker) return;

    const payload = {
      nuevoProyectoId: this.model.proyectoId,
      nuevaEmpresaId: this.model.empresaId ?? undefined,
      staffOficina: this.model.staffOficina,
      fechaCambio: this.model.fechaCambio,
    };

    this.saving = true;
    this.loaderService.show();

    this.trabajadorHabService.cambiarObra(this.worker.workerId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Cambio de obra registrado',
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
