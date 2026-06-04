import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoListItemDto, PasoDetalleDto, PasoSpiDto, PasoCategoriaDto, CreateActividadDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { ActividadTreeComponent } from '../../components/actividad-tree/actividad-tree.component';
import { PasoGanttComponent } from '../../components/paso-gantt/paso-gantt.component';
import { InstanciarModalComponent } from '../../components/instanciar-modal/instanciar-modal.component';
import { PasoNavComponent } from '../../components/paso-nav/paso-nav.component';
import { SsomaPageHeaderComponent } from '../../../shared/ssoma-page-header/ssoma-page-header.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

type TabAmbito = 'Seguridad' | 'Salud' | 'Ambiente' | 'Gantt';

@Component({
  selector: 'app-paso-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, SpiBadgeComponent, ActividadTreeComponent,
            PasoGanttComponent, InstanciarModalComponent, PasoNavComponent, SsomaPageHeaderComponent],
  templateUrl: './paso-lista.component.html',
  styleUrl: './paso-lista.component.css',
})
export class PasoListaComponent implements OnInit {
  programas: PasoListItemDto[] = [];
  selectedPasoId: number | null = null;

  paso: PasoDetalleDto | null = null;
  spi: PasoSpiDto | null = null;
  categorias: PasoCategoriaDto[] = [];

  loading = false;
  loadingDetalle = false;
  tabActiva: TabAmbito = 'Seguridad';
  tabs: TabAmbito[] = ['Seguridad', 'Salud', 'Ambiente', 'Gantt'];

  agregarOpen = false;
  agregarForm: Partial<CreateActividadDto> = {};
  saving = false;
  instanciarOpen = false;
  exportOpen = false;

  readonly anioActual = new Date().getFullYear();

  constructor(
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      programas: this.pasoService.getAll({ esPlantilla: false, anio: this.anioActual, pageSize: 50 }),
      categorias: this.pasoService.getCategorias(),
    }).subscribe({
      next: ({ programas, categorias }) => {
        this.programas = programas.items;
        this.categorias = categorias;
        if (this.programas.length > 0) {
          this.selectedPasoId = this.programas[0].id;
          this.loadDetalle(this.programas[0].id);
        }
        this.cdr.detectChanges();
      },
      error: (err) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(): void {
    if (this.selectedPasoId) this.loadDetalle(this.selectedPasoId);
  }

  private loadDetalle(id: number): void {
    this.loadingDetalle = true;
    this.loaderService.show();
    forkJoin({
      paso: this.pasoService.getById(id),
      spi: this.pasoService.getSpi(id),
    }).subscribe({
      next: ({ paso, spi }) => {
        this.paso = paso;
        this.spi = spi;
        this.loadingDetalle = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get actividadesTab() {
    if (!this.paso?.actividades) return [];
    return this.paso.actividades.filter(a => a.categoriaAmbito === this.tabActiva && a.activo);
  }

  get categoriasFiltradas() {
    return this.categorias.filter(c => c.ambito === (this.tabActiva as 'Seguridad' | 'Salud' | 'Ambiente'));
  }

  countTab(tab: Exclude<TabAmbito, 'Gantt'>): number {
    return this.paso?.actividades?.filter(a => a.categoriaAmbito === tab && a.activo).length ?? 0;
  }

  setTab(tab: TabAmbito): void { this.tabActiva = tab; this.exportOpen = false; }

  aprobar(): void {
    if (!this.paso) return;
    Swal.fire({ icon: 'question', title: '¿Aprobar programa?', showCancelButton: true, confirmButtonText: 'Aprobar' }).then(r => {
      if (!r.isConfirmed) return;
      this.pasoService.aprobar(this.paso!.id).subscribe({
        next: (p) => {
          if (this.paso) this.paso = { ...this.paso, estado: p.estado, aprobadoPorNombre: p.aprobadoPorNombre, aprobadoEn: p.aprobadoEn };
          Swal.fire('Aprobado', '', 'success');
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    });
  }

  abrirAgregar(): void {
    this.agregarForm = { pasoId: this.paso?.id, mesInicio: 1, mesFin: 12, cantidadPlanificada: 1 };
    this.agregarOpen = true;
  }

  guardarActividad(): void {
    if (!this.agregarForm.nombre?.trim() || !this.agregarForm.categoriaId) return;
    this.saving = true;
    this.actividadService.create(this.agregarForm as CreateActividadDto).subscribe({
      next: (a) => {
        this.saving = false;
        this.agregarOpen = false;
        if (this.paso) this.paso.actividades = [...(this.paso.actividades ?? []), a];
        this.cdr.detectChanges();
      },
      error: (err) => { this.saving = false; this.errorService.handleError(err); },
    });
  }

  onEliminada(id: number): void {
    if (this.paso) this.paso.actividades = this.paso.actividades?.filter(a => a.id !== id);
    this.cdr.detectChanges();
  }

  onInstanciaCreada(): void { this.instanciarOpen = false; this.ngOnInit(); }

  exportar(format: 'excel' | 'pdf'): void {
    if (!this.paso) return;
    this.exportOpen = false;
    this.pasoService.exportReporte(this.paso.id, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PASO-${this.paso!.id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.errorService.handleError(err),
    });
  }

  tabColor(t: TabAmbito): string {
    const m: Record<TabAmbito, string> = { Seguridad: 'tab--seg', Salud: 'tab--sal', Ambiente: 'tab--amb', Gantt: 'tab--gantt' };
    return m[t];
  }

  tabIcon(t: TabAmbito): string {
    const m: Record<TabAmbito, string> = { Seguridad: 'ti-shield', Salud: 'ti-heart-pulse', Ambiente: 'ti-leaf', Gantt: 'ti-chart-gantt' };
    return m[t];
  }

  tabLabel(t: TabAmbito): string { return t === 'Salud' ? 'Salud Ocupacional' : t; }
}
