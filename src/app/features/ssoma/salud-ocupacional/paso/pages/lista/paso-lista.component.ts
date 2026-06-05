import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { PasoService } from '../../services/paso.service';
import { PasoActividadService } from '../../services/paso-actividad.service';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { PasoListItemDto, PasoDetalleDto, PasoActividadDto, PasoAuditoriaDto, PasoEjecucionDto, PasoSpiDto, PasoCategoriaDto, CreateActividadDto, PasoResumenMesDto, PasoResumenMesActividadDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { ActividadTreeComponent } from '../../components/actividad-tree/actividad-tree.component';
import { PasoGanttComponent } from '../../components/paso-gantt/paso-gantt.component';
import { InstanciarModalComponent } from '../../components/instanciar-modal/instanciar-modal.component';
import { PasoNavComponent } from '../../components/paso-nav/paso-nav.component';
import { SsomaPageHeaderComponent } from '../../../shared/ssoma-page-header/ssoma-page-header.component';
import { EjecucionModalComponent } from '../../components/ejecucion-modal/ejecucion-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

type TabAmbito = 'Seguridad' | 'Salud' | 'Ambiente' | 'Gantt';

@Component({
  selector: 'app-paso-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, SpiBadgeComponent, ActividadTreeComponent,
            PasoGanttComponent, InstanciarModalComponent, PasoNavComponent, SsomaPageHeaderComponent,
            EjecucionModalComponent],
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

  filtroEstado = '';
  agregarOpen = false;
  agregarForm: Partial<CreateActividadDto> = {};
  saving = false;
  instanciarOpen = false;
  exportOpen = false;
  actividadEjecutando: PasoActividadDto | null = null;
  actividadDetalle: PasoActividadDto | null = null;
  detallePestana: 'ejecuciones' | 'historial' = 'ejecuciones';
  auditoria: PasoAuditoriaDto[] = [];
  loadingAuditoria = false;
  eliminarOpen = false;
  eliminarActividad: PasoActividadDto | null = null;
  motivoEliminacion = '';
  reprogramarMesOpen = false;
  actividadAReprogramar: PasoResumenMesActividadDto | null = null;
  nuevaFechaReprogramacion = '';
  motivoReprogramacion = '';

  readonly anioActual = new Date().getFullYear();

  vistaActual: 'mensual' | 'anual' = 'mensual';
  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  resumenMes: PasoResumenMesDto | null = null;
  loadingMes = false;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
           'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  constructor(
    private pasoService: PasoService,
    private actividadService: PasoActividadService,
    private pasoEjecucionService: PasoEjecucionService,
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
          this.loadResumenMes(this.programas[0].id);
        }
        this.cdr.detectChanges();
      },
      error: (err) => this.errorService.handleError(err),
    });
  }

  onProyectoChange(): void {
    this.filtroEstado = '';
    if (this.selectedPasoId) {
      this.loadDetalle(this.selectedPasoId);
      if (this.vistaActual === 'mensual') this.loadResumenMes(this.selectedPasoId);
    }
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

  private normAmbito(raw: string): string {
    return raw === 'Salud Ocupacional' ? 'Salud' : raw;
  }

  get actividadesTab() {
    if (!this.paso?.actividades) return [];
    return this.paso.actividades.filter(a => this.normAmbito(a.categoriaAmbito) === this.tabActiva && a.activo);
  }

  get categoriasFiltradas() {
    return this.categorias.filter(c => c.ambito === (this.tabActiva as 'Seguridad' | 'Salud' | 'Ambiente'));
  }

  countTab(tab: Exclude<TabAmbito, 'Gantt'>): number {
    console.log('ambitos:', [...new Set(this.paso?.actividades?.map(a => a.categoriaAmbito))]);
    return this.paso?.actividades?.filter(a => this.normAmbito(a.categoriaAmbito) === tab && a.activo).length ?? 0;
  }

  setTab(tab: TabAmbito): void { this.tabActiva = tab; this.exportOpen = false; this.filtroEstado = ''; }

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

  cambiarVista(v: 'mensual' | 'anual'): void {
    this.vistaActual = v;
    if (v === 'mensual' && this.selectedPasoId)
      this.loadResumenMes(this.selectedPasoId);
  }

  cambiarMes(delta: number): void {
    this.mesSeleccionado += delta;
    if (this.mesSeleccionado > 12) { this.mesSeleccionado = 1; this.anioSeleccionado++; }
    if (this.mesSeleccionado < 1)  { this.mesSeleccionado = 12; this.anioSeleccionado--; }
    if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
  }

  private loadResumenMes(id: number): void {
    this.loadingMes = true;
    this.pasoService.getResumenMes(id, this.anioSeleccionado, this.mesSeleccionado).subscribe({
      next: (r) => { this.resumenMes = r; this.loadingMes = false; this.cdr.detectChanges(); },
      error: (err) => { this.loadingMes = false; this.errorService.handleError(err); },
    });
  }

  verDetalleActividad(actividadId: number): void {
    const a = this.paso?.actividades?.find(act => act.id === actividadId);
    if (!a) return;
    this.actividadDetalle = a;
    this.detallePestana = 'ejecuciones';
    this.auditoria = [];
    this.loadingAuditoria = true;
    this.pasoService.getAuditoria(a.id).subscribe({
      next: (data) => { this.auditoria = data; this.loadingAuditoria = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAuditoria = false; this.cdr.detectChanges(); },
    });
  }

  auditIcono(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('elimin')) return 'ti-trash';
    if (t.includes('reprog')) return 'ti-calendar-event';
    return 'ti-pencil';
  }

  auditColor(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('elimin')) return '#dc2626';
    if (t.includes('reprog')) return '#d97706';
    return '#2563eb';
  }

  registrarDesdeResumen(item: PasoResumenMesActividadDto): void {
    const a = this.paso?.actividades?.find(act => act.id === item.actividadId);
    if (a) this.actividadEjecutando = a;
  }

  eliminarDesdeResumen(actividadId: number): void {
    const a = this.paso?.actividades?.find(act => act.id === actividadId);
    if (a) this.abrirEliminar(a);
  }

  abrirReprogramarDesdeResumen(a: PasoResumenMesActividadDto): void {
    this.actividadAReprogramar = a;
    this.nuevaFechaReprogramacion = '';
    this.motivoReprogramacion = '';
    this.reprogramarMesOpen = true;
  }

  confirmarReprogramarDesdeResumen(): void {
    if (!this.actividadAReprogramar || !this.nuevaFechaReprogramacion ||
        this.motivoReprogramacion.trim().length < 10) return;

    if (this.actividadAReprogramar.ejecucionId) {
      this.pasoEjecucionService.reprogramar(
        this.actividadAReprogramar.ejecucionId,
        { nuevaFecha: this.nuevaFechaReprogramacion, motivo: this.motivoReprogramacion.trim() }
      ).subscribe({
        next: () => {
          this.reprogramarMesOpen = false;
          this.actividadAReprogramar = null;
          if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    } else {
      // SinProgramar → crear ejecución programada directamente
      this.pasoEjecucionService.create({
        actividadId: this.actividadAReprogramar.actividadId,
        fechaProgramada: this.nuevaFechaReprogramacion,
      }).subscribe({
        next: () => {
          this.reprogramarMesOpen = false;
          this.actividadAReprogramar = null;
          if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
          this.cdr.detectChanges();
        },
        error: (err) => this.errorService.handleError(err),
      });
    }
  }

  abrirEliminar(a: PasoActividadDto): void {
    this.eliminarActividad = a;
    this.motivoEliminacion = '';
    this.eliminarOpen = true;
  }

  confirmarEliminar(): void {
    if (!this.eliminarActividad || this.motivoEliminacion.trim().length < 10) return;
    this.actividadService.delete(this.eliminarActividad.id, this.motivoEliminacion.trim()).subscribe({
      next: () => {
        this.onEliminada(this.eliminarActividad!.id);
        if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
        this.eliminarOpen = false;
        this.eliminarActividad = null;
        this.motivoEliminacion = '';
        this.cdr.detectChanges();
      },
      error: () => Swal.fire('Error', 'No se pudo eliminar la actividad', 'error'),
    });
  }

  abrirEjecucion(a: PasoActividadDto): void { this.actividadEjecutando = a; }
  abrirDetalle(a: PasoActividadDto): void { this.actividadDetalle = a; }

  onEjecucionCreada(e: PasoEjecucionDto): void {
    this.actividadEjecutando = null;
    if (this.selectedPasoId) this.loadResumenMes(this.selectedPasoId);
    this.cdr.detectChanges();
  }

  ejecutadas(a: PasoActividadDto): number {
    return (a.ejecuciones ?? []).filter(e => e.estado === 'Ejecutado').length;
  }

  spiActividad(a: PasoActividadDto): number | null {
    if (!a.cantidadPlanificada) return null;
    return Math.min(1, this.ejecutadas(a) / a.cantidadPlanificada);
  }

  ejecucionMesActual(a: PasoActividadDto): { estado: string; label: string } {
    const ejeMes = (a.ejecuciones ?? []).filter(e => {
      const d = new Date(e.fechaProgramada);
      return d.getMonth() + 1 === this.mesSeleccionado;
    });
    if (!ejeMes.length) return { estado: 'sin', label: 'Sin ejecución' };
    const ej = ejeMes[ejeMes.length - 1];
    switch (ej.estado) {
      case 'Ejecutado':  return { estado: 'ejecutado',  label: 'Ejecutada' };
      case 'Vencido':    return { estado: 'vencido',    label: 'Vencida' };
      case 'Programado': return { estado: 'programado', label: 'Programada' };
      default:           return { estado: 'sin',        label: 'Sin ejecución' };
    }
  }

  frecuenciaClass(f: string): string {
    const m: Record<string, string> = {
      Mensual: 'freq-badge--mensual', Bimestral: 'freq-badge--bimestral',
      Trimestral: 'freq-badge--trimestral', Semestral: 'freq-badge--semestral',
      Anual: 'freq-badge--anual', Unica: 'freq-badge--unica',
    };
    return m[f] ?? 'freq-badge--unica';
  }
}
