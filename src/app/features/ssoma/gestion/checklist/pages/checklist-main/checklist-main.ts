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
import { ChecklistService } from '../../checklist.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  ChecklistPlantillaListDto,
  ChecklistProyectoCardDto,
  ChecklistProyectoDetalleDto,
  ChecklistProyectoItemDto,
} from '../../checklist.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

type Tab = 'resumen' | 'plantillas';

@Component({
  selector: 'app-checklist-main',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './checklist-main.html',
  styleUrl: './checklist-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistMainComponent implements OnInit {
  private svc = inject(ChecklistService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);

  tab: Tab = 'resumen';

  // Proyectos
  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Resumen de checklists del proyecto
  checklistCards: ChecklistProyectoCardDto[] = [];
  loadingResumen = false;

  // Detalle de un checklist seleccionado
  detalleVisible = false;
  detalle: ChecklistProyectoDetalleDto | null = null;
  loadingDetalle = false;

  // Items guardando
  guardandoItemId: number | null = null;
  observacionTemp: { [itemId: number]: string } = {};

  // Activar checklist opcional
  plantillas: ChecklistPlantillaListDto[] = [];
  loadingPlantillas = false;
  activandoId: number | null = null;

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Por Proyecto', icono: 'ti-building', active: this.tab === 'resumen' },
      { label: 'Catálogo de Plantillas', icono: 'ti-template', active: this.tab === 'plantillas' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    if (t.label === 'Por Proyecto') this.setTab('resumen');
    else this.setTab('plantillas');
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'plantillas' && this.plantillas.length === 0) this.loadPlantillas();
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadProyectos();
  }

  private loadProyectos(): void {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    fetch(`${(window as any).__env?.apiUrl ?? ''}api/v1/configuracion/proyectos?page=1&pageSize=200`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((r) => r.json())
      .then((res: any) => {
        this.proyectos = (res.data ?? res ?? []).map((p: any) => ({
          projectId: p.projectId,
          projectDescription: p.projectDescription,
        }));
        this.cdr.markForCheck();
      })
      .catch(() => {});
  }

  onProyectoChange(): void {
    if (!this.proyectoId) {
      this.checklistCards = [];
      this.detalleVisible = false;
      this.cdr.markForCheck();
      return;
    }
    this.detalleVisible = false;
    this.loadResumen();
  }

  loadResumen(): void {
    if (!this.proyectoId) return;
    this.loadingResumen = true;
    this.cdr.markForCheck();
    this.svc.getResumenProyecto(this.proyectoId).subscribe({
      next: (res) => {
        this.checklistCards = res.checklists;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirDetalle(card: ChecklistProyectoCardDto): void {
    this.detalleVisible = true;
    this.detalle = null;
    this.loadingDetalle = true;
    this.observacionTemp = {};
    this.cdr.markForCheck();
    this.svc.getChecklistDetalle(card.checklistProyectoId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.detalleVisible = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalle = null;
    this.cdr.markForCheck();
  }

  toggleItem(item: ChecklistProyectoItemDto): void {
    if (this.guardandoItemId === item.id) return;
    this.guardandoItemId = item.id;
    this.cdr.markForCheck();

    const nuevoEstado = !item.completado;
    this.svc
      .toggleItem(item.id, {
        completado: nuevoEstado,
        observacion: this.observacionTemp[item.id] || undefined,
      })
      .subscribe({
        next: (res) => {
          item.completado = nuevoEstado;
          item.fechaCompletado = nuevoEstado ? new Date().toISOString() : undefined;
          this.guardandoItemId = null;
          // Actualizar porcentaje en el detalle
          if (this.detalle) {
            this.detalle.porcentajeCompletado = res.porcentaje;
            this.detalle.estado = res.estado;
          }
          // Actualizar card del resumen
          const card = this.checklistCards.find(
            (c) => c.checklistProyectoId === this.detalle?.id,
          );
          if (card) {
            card.porcentajeCompletado = res.porcentaje;
            card.estado = res.estado as any;
            card.itemsCompletados = this.detalle!.items.filter((i) => i.completado).length;
          }
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoItemId = null;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Activar checklist opcional ────────────────────────────────────────────

  loadPlantillas(): void {
    this.loadingPlantillas = true;
    this.cdr.markForCheck();
    this.svc.getPlantillas().subscribe({
      next: (p) => {
        this.plantillas = p;
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
    });
  }

  activarChecklist(plantillaId: number): void {
    if (!this.proyectoId || this.activandoId === plantillaId) return;
    this.activandoId = plantillaId;
    this.cdr.markForCheck();
    this.svc.activarChecklist(this.proyectoId, { plantillaId }).subscribe({
      next: () => {
        this.activandoId = null;
        this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.activandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  plantillaYaActiva(plantillaId: number): boolean {
    return this.checklistCards.some((c) => c.plantillaId === plantillaId);
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  estadoClass(estado: string): string {
    switch (estado) {
      case 'completado': return 'estado-completado';
      case 'en_progreso': return 'estado-en-progreso';
      default: return 'estado-pendiente';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'en_progreso': return 'En progreso';
      default: return 'Pendiente';
    }
  }

  porcentajeColor(pct: number): string {
    if (pct === 100) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#1e3a5f';
  }
}
