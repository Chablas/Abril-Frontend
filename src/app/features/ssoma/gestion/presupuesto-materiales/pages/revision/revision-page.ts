import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import { MaterialPendienteDto, RevisionDecisionDto } from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

@Component({
  selector: 'app-revision-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './revision-page.html',
  styleUrl: './revision-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisionPage implements OnInit {
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  readonly headerTabs = PRESUPUESTO_TABS;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  pendientes: MaterialPendienteDto[] = [];
  loadingPendientes = false;
  decisiones: Map<number, RevisionDecisionDto> = new Map();
  procesando = false;

  ngOnInit(): void {
    this.loadProyectos();
  }

  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res.map((p) => ({
          projectId: p.projectId,
          projectDescription: p.projectDescription,
        }));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onProyectoChange(): void {
    this.pendientes = [];
    this.decisiones.clear();
    if (this.proyectoId) this.loadPendientes();
    this.cdr.markForCheck();
  }

  loadPendientes(): void {
    if (!this.proyectoId) return;
    this.loadingPendientes = true;
    this.decisiones.clear();
    this.cdr.markForCheck();
    this.svc.getPendientes(this.proyectoId).subscribe({
      next: (p) => {
        this.pendientes = p;
        this.loadingPendientes = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPendientes = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  setDecision(item: MaterialPendienteDto, decision: 'AUTORIZADO' | 'RECHAZADO'): void {
    if (this.decisiones.has(item.lineaId) && this.decisiones.get(item.lineaId)!.decision === decision) {
      this.decisiones.delete(item.lineaId);
    } else {
      this.decisiones.set(item.lineaId, {
        lineaId: item.lineaId,
        decision,
        itemIdConfirmado: decision === 'AUTORIZADO' ? item.itemIdSugerido : undefined,
      });
    }
    this.cdr.markForCheck();
  }

  getDecision(lineaId: number): string | null {
    return this.decisiones.get(lineaId)?.decision ?? null;
  }

  get totalSeleccionados(): number { return this.decisiones.size; }

  procesarRevision(): void {
    if (!this.proyectoId || this.decisiones.size === 0 || this.procesando) return;
    this.procesando = true;
    this.cdr.markForCheck();
    this.svc.procesarRevision(this.proyectoId, Array.from(this.decisiones.values())).subscribe({
      next: () => {
        this.procesando = false;
        this.decisiones.clear();
        this.loadPendientes();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.procesando = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  scoreColor(score?: number): string {
    if (!score) return '#9ca3af';
    if (score >= 0.85) return '#16a34a';
    if (score >= 0.6) return '#d97706';
    return '#dc2626';
  }
}
