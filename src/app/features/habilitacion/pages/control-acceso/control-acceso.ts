import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import {
  ControlAccesoService,
  ConsultaResultDto,
  EntregableResumenDto,
  InduccionHoyDto,
  NoAutorizadoDto,
} from '../../services/control-acceso.service';
import { Tareo } from './components/tareo/tareo';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';

type Tab = 'consulta' | 'induccion' | 'no-autorizados' | 'tareo';

@Component({
  selector: 'app-control-acceso',
  standalone: true,
  imports: [CommonModule, FormsModule, Tareo, SearchSelect],
  templateUrl: './control-acceso.html',
  styleUrl: './control-acceso.css',
})
export class ControlAcceso implements OnInit {
  proyectos: ProjectGetDTO[] = [];
  selectedProyectoId: number | null = null;
  readonly oficinaId = 36;

  activeTab: Tab = 'consulta';

  // Consulta
  searchQuery = '';
  searching = false;
  searched = false;
  searchResults: ConsultaResultDto[] = [];
  selectedResult: ConsultaResultDto | null = null;
  searchError = '';

  get activeResult(): ConsultaResultDto | null {
    if (this.selectedResult) return this.selectedResult;
    if (this.searchResults.length === 1) return this.searchResults[0];
    return null;
  }

  // Inducción
  inducciones: InduccionHoyDto[] = [];
  loadingInducciones = false;
  readonly fechaHoy = new Date().toISOString().slice(0, 10);

  // No autorizados
  noAutorizados: NoAutorizadoDto[] = [];
  loadingNoAutorizados = false;

  constructor(
    private projectService: ProjectService,
    private controlAccesoService: ControlAccesoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: res => {
        this.proyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
    });
  }

  onProyectoChange(value: number | null): void {
    this.selectedProyectoId = value;
    this.searchResults = [];
    this.selectedResult = null;
    this.searched = false;
    this.searchError = '';
    this.searchQuery = '';
    this.inducciones = [];
    this.noAutorizados = [];
    if (this.activeTab !== 'consulta' && this.activeTab !== 'tareo') {
      this.loadTab(this.activeTab);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    if (tab !== 'consulta' && tab !== 'tareo') {
      this.loadTab(tab);
    }
  }

  private loadTab(tab: Tab): void {
    if (!this.selectedProyectoId) return;
    if (tab === 'induccion') this.loadInducciones();
    else if (tab === 'no-autorizados') this.loadNoAutorizados();
  }

  // ── Consulta ─────────────────────────────────────────────────────────────

  buscar(): void {
    if (!this.searchQuery.trim() || !this.selectedProyectoId) return;
    this.searching = true;
    this.searchResults = [];
    this.selectedResult = null;
    this.searched = false;
    this.searchError = '';
    this.controlAccesoService
      .consultar(this.selectedProyectoId, this.searchQuery.trim())
      .subscribe({
        next: res => {
          this.searchResults = res ?? [];
          this.searched = true;
          this.searching = false;
          this.cdr.detectChanges();
        },
        error: err => {
          this.searching = false;
          this.searchError = err?.error?.message ?? 'No se encontró el trabajador.';
          this.cdr.detectChanges();
        },
      });
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.buscar();
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'AUTORIZADO': return 'HABILITADO';
      case 'NO_AUTORIZADO': return 'NO AUTORIZADO';
      case 'POR_VENCER': return 'POR VENCER';
      default: return estado;
    }
  }

  // ── Inducción ─────────────────────────────────────────────────────────────

  loadInducciones(): void {
    if (!this.selectedProyectoId) return;
    this.loadingInducciones = true;
    this.controlAccesoService
      .getInducciones(this.selectedProyectoId, this.fechaHoy)
      .subscribe({
        next: res => {
          this.inducciones = res;
          this.loadingInducciones = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingInducciones = false;
          this.cdr.detectChanges();
        },
      });
  }

  get confirmadosCount(): number {
    return this.inducciones.filter(i => i.confirmado).length;
  }

  confirmarIngreso(ind: InduccionHoyDto): void {
    if (ind.confirmado) return;
    this.controlAccesoService.confirmarIngreso(ind.id).subscribe({
      next: updated => {
        const idx = this.inducciones.findIndex(i => i.id === ind.id);
        if (idx >= 0) this.inducciones[idx] = updated;
        this.cdr.detectChanges();
      },
      error: err => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message ?? 'No se pudo confirmar el ingreso.',
        });
      },
    });
  }

  getEntregableClass(e: EntregableResumenDto): string {
    if (e.estado === 'No Aplica') return 'chip-gray';
    if (e.estado === 'Enviado') return 'chip-orange';
    if (e.estado === 'Rechazado' || e.estado === 'Falta') return 'chip-red';
    if (e.estado === 'Aprobado') {
      if (e.vigencia) {
        const dias = Math.floor((new Date(e.vigencia).getTime() - Date.now()) / 86400000);
        if (dias <= 14) return 'chip-yellow';
      }
      return 'chip-green';
    }
    return '';
  }

  // ── No autorizados ────────────────────────────────────────────────────────

  loadNoAutorizados(): void {
    if (!this.selectedProyectoId) return;
    this.loadingNoAutorizados = true;
    this.controlAccesoService.getNoAutorizados(this.selectedProyectoId).subscribe({
      next: res => {
        this.noAutorizados = res;
        this.loadingNoAutorizados = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingNoAutorizados = false;
        this.cdr.detectChanges();
      },
    });
  }
}
