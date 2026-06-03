import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoDto, PasoActividadDto, PasoSpiDto, PasoCategoriaDto, CreateActividadDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { ActividadTreeComponent } from '../../components/actividad-tree/actividad-tree.component';
import { PasoGanttComponent } from '../../components/paso-gantt/paso-gantt.component';
import { InstanciarModalComponent } from '../../components/instanciar-modal/instanciar-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

type TabAmbito = 'Seguridad' | 'Salud' | 'Ambiente' | 'Gantt';

@Component({
  selector: 'app-paso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, SpiBadgeComponent, ActividadTreeComponent, PasoGanttComponent, InstanciarModalComponent],
  templateUrl: './paso-detalle.component.html',
})
export class PasoDetalleComponent implements OnInit {
  paso: PasoDto | null = null;
  spi: PasoSpiDto | null = null;
  categorias: PasoCategoriaDto[] = [];
  loading = false;
  tabActiva: TabAmbito = 'Seguridad';

  // Agregar actividad offcanvas
  agregarOpen = false;
  agregarForm: Partial<CreateActividadDto> = {};
  saving = false;

  // Instanciar
  instanciarOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPaso(id);
    this.loadCategorias();
  }

  private loadPaso(id: number): void {
    this.loading = true;
    this.loaderService.show();
    this.pasoService.getById(id).subscribe({
      next: (p) => {
        this.paso = p;
        this.loading = false;
        this.loaderService.hide();
        this.loadSpi(id);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private loadSpi(id: number): void {
    this.pasoService.getSpi(id).subscribe({ next: (s) => { this.spi = s; this.cdr.detectChanges(); } });
  }

  private loadCategorias(): void {
    this.pasoService.getCategorias().subscribe({
      next: (c) => { this.categorias = c; this.cdr.detectChanges(); },
    });
  }

  get actividadesTab(): PasoActividadDto[] {
    if (!this.paso?.actividades) return [];
    return this.paso.actividades.filter(a => a.categoriaAmbito === this.tabActiva && a.activo);
  }

  get categoriasFiltradas(): PasoCategoriaDto[] {
    return this.categorias.filter(c => c.ambito === this.tabActiva);
  }

  setTab(tab: TabAmbito): void { this.tabActiva = tab; }

  aprobar(): void {
    if (!this.paso) return;
    Swal.fire({ icon: 'question', title: '¿Aprobar programa?', showCancelButton: true, confirmButtonText: 'Aprobar' }).then(r => {
      if (!r.isConfirmed) return;
      this.pasoService.aprobar(this.paso!.id).subscribe({
        next: (p) => { this.paso = p; Swal.fire('Aprobado', '', 'success'); this.cdr.detectChanges(); },
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
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  onEliminada(id: number): void {
    if (this.paso) this.paso.actividades = this.paso.actividades?.filter(a => a.id !== id);
    this.cdr.detectChanges();
  }

  onInstanciaCreada(): void {
    this.instanciarOpen = false;
  }

  exportar(format: 'excel' | 'pdf'): void {
    if (!this.paso) return;
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

  estadoBadge(e: string): string {
    const m: Record<string, string> = { Borrador: 'bg-gray-100 text-gray-600', Aprobado: 'bg-blue-100 text-blue-700', Activo: 'bg-green-100 text-green-700', Cerrado: 'bg-gray-200 text-gray-800' };
    return m[e] ?? 'bg-gray-100 text-gray-500';
  }

  volver(): void { this.router.navigate(['/ssoma/gestion/paso/lista']); }

  tabs: TabAmbito[] = ['Seguridad', 'Salud', 'Ambiente', 'Gantt'];
  tabColors: Record<TabAmbito, string> = { Seguridad: 'blue', Salud: 'green', Ambiente: 'teal', Gantt: 'gray' };

  tabClass(t: TabAmbito): string {
    return this.tabActiva === t
      ? 'border-b-2 border-blue-600 text-blue-700 font-semibold'
      : 'text-gray-500 hover:text-gray-700';
  }
}
