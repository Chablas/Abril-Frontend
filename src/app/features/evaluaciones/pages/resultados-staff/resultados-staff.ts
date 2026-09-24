import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent, AbrilPageTabGroup } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvEvaluacionStaffService } from '../../services/ev-evaluacion-staff.service';
import { EvAccesoService } from '../../services/ev-acceso.service';
import { buildEvaluacionesTabGroups } from '../../shared/evaluaciones-tabs';
import { EvEvaluacionStaffResultadoDto } from '../../dtos/ev-evaluacion-staff.model';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';

@Component({
  selector: 'app-resultados-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent, TitleCasePipe],
  templateUrl: './resultados-staff.html',
  styleUrl: './resultados-staff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosStaff implements OnInit {
  resultados: EvEvaluacionStaffResultadoDto[] = [];
  loading = true;
  tabGroups: AbrilPageTabGroup[] = buildEvaluacionesTabGroups(null);
  busqueda = '';

  get resultadosFiltrados(): EvEvaluacionStaffResultadoDto[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.resultados;
    return this.resultados.filter(
      (r) => r.nombreCompleto.toLowerCase().includes(q) || r.puesto.toLowerCase().includes(q),
    );
  }

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota >= 4) return 'nota-aprobado';
    if (nota >= 3) return 'nota-regular';
    return 'nota-desaprobado';
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(2) : '—';
  }

  constructor(
    private svc: EvEvaluacionStaffService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
    private accesoSvc: EvAccesoService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.accesoSvc.getAcceso().subscribe((acceso) => {
      this.tabGroups = buildEvaluacionesTabGroups(acceso);
      this.cdr.markForCheck();
    });
  }

  cargar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getResultados().subscribe({
      next: (data) => {
        this.resultados = data;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
