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
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { EquipoHabService } from '../../../../services/equipo-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { EmpresaContratistaListDto } from '../../../../dtos/empresa.model';
import { EquipoListDto, EquipoUpsertDto } from '../../../../dtos/equipo.model';

@Component({
  selector: 'app-equipo-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './equipo-form.html',
  styleUrl: './equipo-form.css',
})
export class EquipoForm implements OnChanges {
  @Input() open = false;
  @Input() equipo: EquipoListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  empresas: EmpresaContratistaListDto[] = [];

  model: EquipoUpsertDto & { emailAdmin?: string; emailSsoma?: string; nVin?: string } =
    this.empty();
  saving = false;

  constructor(
    private equipoService: EquipoHabService,
    private projectService: ProjectService,
    private empresaService: EmpresaContratistaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadCatalogos();
    }
  }

  private empty(): EquipoUpsertDto {
    return {
      tipo: '',
      marca: '',
      modelo: '',
      nSerie: '',
      nVin: '',
      capacidad: '',
      propietarioEmpresaId: null,
      proyectoId: 0,
      emailAdmin: '',
      emailSsoma: '',
    };
  }

  private reset(): void {
    if (!this.equipo) {
      this.model = this.empty();
      return;
    }
    this.model = {
      tipo: this.equipo.tipo ?? '',
      marca: this.equipo.marca ?? '',
      modelo: this.equipo.modelo ?? '',
      nSerie: this.equipo.nSerie ?? '',
      nVin: '',
      capacidad: this.equipo.capacidad ?? '',
      propietarioEmpresaId: null,
      proyectoId: this.equipo.proyectoId,
      emailAdmin: '',
      emailSsoma: '',
    };
  }

  private loadCatalogos(): void {
    this.projectService.getProjectPaged(1).subscribe({
      next: (res) => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectos = [];
      },
    });
    this.empresaService.getEmpresas({ pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresas = [];
      },
    });
  }

  get title(): string {
    return this.equipo ? 'Editar equipo / máquina' : 'Nuevo equipo / máquina';
  }

  get isEdit(): boolean {
    return !!this.equipo;
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.model.tipo?.trim()) return false;
    if (!this.model.proyectoId) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Tipo y proyecto son obligatorios.',
      });
      return;
    }

    const payload: EquipoUpsertDto = {
      tipo: this.model.tipo.trim(),
      marca: this.model.marca?.trim() || undefined,
      modelo: this.model.modelo?.trim() || undefined,
      nSerie: this.model.nSerie?.trim() || undefined,
      nVin: this.model.nVin?.trim() || undefined,
      capacidad: this.model.capacidad?.trim() || undefined,
      propietarioEmpresaId: this.model.propietarioEmpresaId ?? undefined,
      proyectoId: this.model.proyectoId,
      emailAdmin: this.model.emailAdmin?.trim() || undefined,
      emailSsoma: this.model.emailSsoma?.trim() || undefined,
    };

    this.saving = true;
    this.loaderService.show();

    const req$ = this.isEdit && this.equipo
      ? this.equipoService.update(this.equipo.id, payload)
      : this.equipoService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.isEdit ? 'Equipo actualizado' : 'Equipo creado',
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
