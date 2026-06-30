import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PresupuestoResumenDto, GenerarPresupuestoDto } from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-proyecto-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './proyecto-page.html',
  styleUrl: './proyecto-page.css',
})
export class ProyectoPage implements OnInit {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  projectId!: number;
  presupuestos: PresupuestoResumenDto[] = [];
  loading = false;
  mostrarFormGenerar = false;
  generando = false;

  formGenerar: GenerarPresupuestoDto = {};

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getPresupuestosPorProyecto(this.projectId).subscribe({
      next: (p) => {
        this.presupuestos = p;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  generar(): void {
    if (this.generando) return;
    this.generando = true;
    this.loader.show();
    this.svc.generarPresupuesto(this.projectId, this.formGenerar).subscribe({
      next: (p) => {
        this.generando = false;
        this.mostrarFormGenerar = false;
        this.loader.hide();
        this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', p.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.generando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id]);
  }

  irAControl(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id, 'control']);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/drivers']);
  }

  estadoClass(estado: string): string {
    return estado === 'APROBADO' ? 'badge-ok' : 'badge-warn';
  }

  get proyectNombre(): string {
    return this.presupuestos[0]?.projectDescription ?? `Proyecto #${this.projectId}`;
  }
}
