import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ConsumoCargaResumenDto,
  ImportConsumoResultDto,
  MaterialPendienteDto,
  RevisionDecisionDto,
} from '../../presupuesto.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

type Tab = 'cargas' | 'revision';

@Component({
  selector: 'app-presupuesto-main',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './presupuesto-main.html',
  styleUrl: './presupuesto-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestoMainComponent implements OnInit {
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  tab: Tab = 'cargas';
  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Cargas S10
  cargas: ConsumoCargaResumenDto[] = [];
  loadingCargas = false;
  subiendoArchivo = false;
  uploadResult: ImportConsumoResultDto | null = null;
  archivoSeleccionado: File | null = null;
  estandarizandoId: number | null = null;

  // Revisión
  pendientes: MaterialPendienteDto[] = [];
  loadingPendientes = false;
  decisiones: Map<number, RevisionDecisionDto> = new Map();
  procesando = false;

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Cargas S10', icono: 'ti-file-spreadsheet', active: this.tab === 'cargas' },
      { label: 'Revisión de Materiales', icono: 'ti-clipboard-check', active: this.tab === 'revision' },
      { label: 'Drivers', icono: 'ti-settings', route: '/ssoma/gestion/presupuesto-materiales/drivers' },
      { label: 'Ratios', icono: 'ti-chart-bar', route: '/ssoma/gestion/presupuesto-materiales/ratios' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    if (t.label === 'Cargas S10') this.setTab('cargas');
    else if (t.label === 'Revisión de Materiales') this.setTab('revision');
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'revision' && this.proyectoId && this.pendientes.length === 0) {
      this.loadPendientes();
    }
    this.cdr.markForCheck();
  }

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
    this.cargas = [];
    this.pendientes = [];
    this.uploadResult = null;
    this.decisiones.clear();
    if (!this.proyectoId) { this.cdr.markForCheck(); return; }
    if (this.tab === 'cargas') this.loadCargas();
    else this.loadPendientes();
  }

  // ─── Cargas ──────────────────────────────────────────────────────────────

  loadCargas(): void {
    if (!this.proyectoId) return;
    this.loadingCargas = true;
    this.cdr.markForCheck();
    this.svc.listarCargas(this.proyectoId).subscribe({
      next: (c) => {
        this.cargas = c;
        this.loadingCargas = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCargas = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files?.[0] ?? null;
    this.uploadResult = null;
    this.cdr.markForCheck();
  }

  subirS10(): void {
    if (!this.proyectoId || !this.archivoSeleccionado || this.subiendoArchivo) return;
    this.subiendoArchivo = true;
    this.uploadResult = null;
    this.cdr.markForCheck();
    this.svc.importarS10(this.proyectoId, this.archivoSeleccionado).subscribe({
      next: (res) => {
        this.uploadResult = res;
        this.subiendoArchivo = false;
        this.archivoSeleccionado = null;
        this.loadCargas();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivo = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  estandarizar(cargaId: number): void {
    if (this.estandarizandoId === cargaId) return;
    this.estandarizandoId = cargaId;
    this.cdr.markForCheck();
    this.svc.estandarizar(cargaId).subscribe({
      next: () => {
        this.estandarizandoId = null;
        this.loadCargas();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.estandarizandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Revisión ─────────────────────────────────────────────────────────────

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
      next: (res) => {
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  estadoCargaClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'completado': return 'pres-badge--ok';
      case 'pendiente_revision': return 'pres-badge--warn';
      default: return 'pres-badge--neutral';
    }
  }

  scoreColor(score?: number): string {
    if (!score) return '#9ca3af';
    if (score >= 0.85) return '#16a34a';
    if (score >= 0.6) return '#d97706';
    return '#dc2626';
  }
}
