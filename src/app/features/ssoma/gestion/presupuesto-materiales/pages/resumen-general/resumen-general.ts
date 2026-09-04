import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ResumenRatiosDto } from '../../presupuesto.dtos';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';

/**
 * Gasto SSOMA total por proyecto (histórico calculado a la fecha de la última corrida de
 * ratios) — se separó de Ratios porque es una vista de auditoría/monitoreo, no la mesa de
 * trabajo donde se arma la mediana/precio recomendado por familia.
 */
@Component({
  selector: 'app-resumen-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './resumen-general.html',
  styleUrl: './resumen-general.css',
})
export class ResumenGeneralPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  resumen: ResumenRatiosDto | null = null;
  loadingResumen = false;
  errorResumen: string | null = null;
  calculandoTodos = false;

  ngOnInit(): void {
    this.loadResumen();
  }

  loadResumen(): void {
    this.loadingResumen = true;
    this.errorResumen = null;
    this.cdr.markForCheck();
    this.svc.getResumenRatios().subscribe({
      next: (r) => {
        this.resumen = r;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.errorResumen = err.error?.message ?? 'No se pudo cargar el resumen. Intenta actualizar.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Calcula ratios de TODOS los proyectos con consumo SSOMA estandarizado de una sola vez —
   * se deja acá también (no solo en Ratios) porque es el gatillo natural para refrescar este
   * resumen tras subir/limpiar Kardex. */
  calcularTodosLosRatios(): void {
    if (this.calculandoTodos) return;
    this.calculandoTodos = true;
    this.loader.show();
    this.svc.calcularRatiosTodos().subscribe({
      next: (res) => {
        this.calculandoTodos = false;
        this.loader.hide();
        const conAdvertencias = res.proyectos.filter((p) => p.advertencias.length > 0).length;
        Swal.fire({
          icon: 'success',
          title: 'Ratios calculados',
          text: `${res.totalProyectosProcesados} proyecto(s) procesados.` +
            (conAdvertencias > 0 ? ` ${conAdvertencias} con alguna advertencia (revisa la consola/detalle).` : ''),
        });
        this.loadResumen();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoTodos = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irAProyecto(projectId: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', projectId]);
  }
}
