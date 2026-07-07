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
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

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

  readonly headerTabs = PRESUPUESTO_TABS;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Cargas S10
  cargas: ConsumoCargaResumenDto[] = [];
  loadingCargas = false;
  subiendoArchivo = false;
  uploadResult: ImportConsumoResultDto | null = null;
  archivoSeleccionado: File | null = null;
  estandarizandoId: number | null = null;

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
    this.uploadResult = null;
    if (!this.proyectoId) { this.cdr.markForCheck(); return; }
    this.loadCargas();
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  estadoCargaClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'completado': return 'pres-badge--ok';
      case 'pendiente_revision': return 'pres-badge--warn';
      default: return 'pres-badge--neutral';
    }
  }
}
