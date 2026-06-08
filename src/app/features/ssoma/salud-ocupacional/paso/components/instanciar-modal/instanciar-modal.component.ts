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
import { PasoService } from '../../services/paso.service';
import { PasoListItemDto, InstanciarPasoDto } from '../../dtos/paso.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectScheduleSimpleDTO } from '../../../../../../core/dtos/project/projectScheduleSimple.model';

@Component({
  selector: 'app-instanciar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './instanciar-modal.component.html',
})
export class InstanciarModalComponent implements OnInit {
  @Input() pasoPlantillaId!: number;
  @Input() plantillaNombre = '';
  @Output() closed = new EventEmitter<void>();
  @Output() instanciaCreada = new EventEmitter<PasoListItemDto>();

  step = 1;
  proyectos: ProjectScheduleSimpleDTO[] = [];
  loadingProyectos = false;

  proyectoId: number | null = null;
  anio = new Date().getFullYear();
  nombreGenerado = '';

  saving = false;

  constructor(
    private pasoService: PasoService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProyectos();
  }

  private loadProyectos(): void {
    this.loadingProyectos = true;
    this.projectService.getWithResidentByUserId().subscribe({
      next: (list) => {
        this.proyectos = list;
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  get proyectoNombre(): string {
    return this.proyectos.find(p => p.projectId === this.proyectoId)?.projectDescription ?? '';
  }

  siguente(): void {
    if (!this.proyectoId) {
      Swal.fire('', 'Selecciona un proyecto', 'warning');
      return;
    }
    this.nombreGenerado = `${this.plantillaNombre} — ${this.proyectoNombre} ${this.anio}`;
    this.step = 2;
  }

  anterior(): void {
    this.step = 1;
  }

  instanciar(): void {
    if (!this.proyectoId) return;
    this.saving = true;
    const dto: InstanciarPasoDto = {
      proyectoId: this.proyectoId,
      anio: this.anio,
      nombre: this.nombreGenerado,
    };
    this.pasoService.instanciar(this.pasoPlantillaId, dto).subscribe({
      next: (paso) => {
        this.saving = false;
        Swal.fire('Listo', 'Programa instanciado correctamente', 'success');
        this.instanciaCreada.emit(paso);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        Swal.fire('Error', err.error?.message ?? 'No se pudo instanciar', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
