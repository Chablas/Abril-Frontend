import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { DriverProyectoDto, ActualizarDriversDto } from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-drivers-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './drivers-page.html',
  styleUrl: './drivers-page.css',
})
export class DriversPage implements OnInit {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  private cdr    = inject(ChangeDetectorRef);
  private router = inject(Router);

  drivers: DriverProyectoDto[] = [];
  loading = false;
  editandoId: number | null = null;

  // Formulario de edición inline
  form: Partial<ActualizarDriversDto> = {};

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getDrivers().subscribe({
      next: (d) => {
        this.drivers = d;
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

  abrirEdicion(d: DriverProyectoDto): void {
    this.editandoId = d.projectId;
    this.form = {
      hhTotalCasa:   d.hhTotalCasa   ?? 0,
      areaTechadaM2: d.areaTechadaM2 ?? 0,
      trabajadores:  d.trabajadores  ?? 0,
      hhFuente:      d.hhFuente || 'HH_REAL',
      recalcularRatios: true,
    };
    this.cdr.markForCheck();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.cdr.markForCheck();
  }

  guardar(projectId: number): void {
    if (!this.form.hhTotalCasa && !this.form.areaTechadaM2) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Ingrese al menos HH o Área.' });
      return;
    }
    this.loader.show();
    this.svc.actualizarDrivers(projectId, this.form as ActualizarDriversDto).subscribe({
      next: (res) => {
        this.loader.hide();
        this.editandoId = null;
        Swal.fire({
          icon: 'success',
          title: 'Drivers actualizados',
          text: `${res.ratiosCalculados} ratios recalculados.`,
          timer: 2000,
          showConfirmButton: false,
        });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irAProyecto(projectId: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', projectId]);
  }

  fuente(d: DriverProyectoDto): string {
    switch (d.hhFuente) {
      case 'HH_REAL':              return 'Real';
      case 'HH_PROYECTADO':        return 'Proyectado';
      case 'HH_CALCULADO_MEDIANA': return 'Calc. mediana';
      default:                     return d.hhFuente;
    }
  }

  fuenteClass(d: DriverProyectoDto): string {
    switch (d.hhFuente) {
      case 'HH_REAL':              return 'badge-ok';
      case 'HH_PROYECTADO':        return 'badge-warn';
      case 'HH_CALCULADO_MEDIANA': return 'badge-info';
      default:                     return 'badge-neutral';
    }
  }
}
