import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { CrearAccidenteIncidenteRequest, ActualizarAccidenteIncidenteRequest } from '../../accidente-incidente.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-crear-editar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './accidente-crear-editar.component.html',
  styleUrl: './accidente-crear-editar.component.css',
})
export class AccidenteCrearEditarComponent implements OnInit {
  modoEditar = false;
  id?: number;
  guardando = false;

  proyectos: any[] = [];

  form: CrearAccidenteIncidenteRequest = {
    proyectoId: 0,
    fecha: '',
    descripcion: '',
    tipo: 'Incidente',
    estado: 'Abierto',
    responsableId: undefined,
  };

  errores: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEditar = true;
      this.id = Number(idParam);
    }

    this.loaderService.show();
    this.projectService.getProjectsPaged({ pageSize: 200, active: true }).subscribe({
      next: (res) => {
        this.proyectos = res.data;
        this.loaderService.hide();
        if (this.modoEditar) this.cargarDetalle();
        else this.cdr.detectChanges();
      },
      error: () => {
        this.loaderService.hide();
        if (this.modoEditar) this.cargarDetalle();
        else this.cdr.detectChanges();
      },
    });
  }

  cargarDetalle(): void {
    this.loaderService.show();
    this.service.getDetalle(this.id!).subscribe({
      next: (res) => {
        this.form = {
          proyectoId: res.proyectoId,
          fecha: res.fecha.substring(0, 10),
          descripcion: res.descripcion,
          tipo: res.tipo,
          estado: res.estado,
          responsableId: res.responsableId,
        };
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  validar(): boolean {
    this.errores = {};
    if (!this.form.proyectoId || this.form.proyectoId <= 0)
      this.errores['proyectoId'] = 'El proyecto es requerido.';
    if (!this.form.fecha)
      this.errores['fecha'] = 'La fecha es requerida.';
    if (!this.form.descripcion?.trim())
      this.errores['descripcion'] = 'La descripción es requerida.';
    if (!this.form.tipo)
      this.errores['tipo'] = 'El tipo es requerido.';
    return Object.keys(this.errores).length === 0;
  }

  guardar(): void {
    if (!this.validar()) {
      this.cdr.detectChanges();
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    const obs$ = this.modoEditar
      ? this.service.actualizar(this.id!, this.form as ActualizarAccidenteIncidenteRequest)
      : this.service.crear(this.form);

    obs$.subscribe({
      next: async (res: any) => {
        this.guardando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: this.modoEditar ? 'Actualizado' : 'Registrado',
          text: res.message ?? 'Operación exitosa.',
          timer: 1800,
          showConfirmButton: false,
        });
        const destId = this.modoEditar ? this.id! : res.id;
        this.router.navigate(['/ssoma/gestion/accidentes-incidentes', destId]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    if (this.modoEditar) {
      this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id]);
    } else {
      this.router.navigate(['/ssoma/gestion/accidentes-incidentes/lista']);
    }
  }

  get titulo(): string {
    return this.modoEditar ? 'Editar registro' : 'Nuevo registro';
  }
}
