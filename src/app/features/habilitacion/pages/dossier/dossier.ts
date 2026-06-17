import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { DossierService } from '../../services/dossier.service';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DossierUploadModal } from './components/dossier-upload-modal/dossier-upload-modal';
import { DossierRevisarModal } from './components/dossier-revisar-modal/dossier-revisar-modal';
import {
  DossierEstadoSemana,
  DossierSemanaDto,
  DOSSIER_TIPOS,
} from '../../dtos/dossier.model';
import { EmpresaContratistaListDto } from '../../dtos/empresa.model';

interface ProyectoSimple { id: number; nombre: string; }

@Component({
  selector: 'app-hab-dossier',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, DossierUploadModal, DossierRevisarModal],
  templateUrl: './dossier.html',
  styleUrl: './dossier.css',
})
export class Dossier implements OnInit {
  empresas: EmpresaContratistaListDto[] = [];
  empresaId: number | null = null;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;
  loadingProyectos = false;

  semanas: DossierSemanaDto[] = [];
  loadingSemanas = false;

  uploadModalSemanaId: number | null = null;
  revisarModalSemanaId: number | null = null;

  readonly totalDocs = DOSSIER_TIPOS.length;

  constructor(
    private dossierService: DossierService,
    private empresaContratistaService: EmpresaContratistaService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.isContratista()) {
      this.empresaId = this.authService.getEmpresaId();
      this.loadProyectosContratista();
    } else {
      this.loadEmpresasAdmin();
    }
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  private loadEmpresasAdmin(): void {
    this.empresaContratistaService.getEmpresas({ soloContratistas: true, pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  onEmpresaChange(id: number | null): void {
    this.empresaId = id;
    this.proyectos = [];
    this.proyectoId = null;
    this.semanas = [];
    if (id) this.loadProyectosAdmin(id);
    this.cdr.detectChanges();
  }

  private loadProyectosAdmin(empresaId: number): void {
    this.loadingProyectos = true;
    this.empresaContratistaService.getProyectos(empresaId).subscribe({
      next: (res: any[]) => {
        this.proyectos = (res ?? []).map((p) => ({ id: p.id ?? p.proyectoId, nombre: p.nombre ?? p.projectDescription ?? '' }));
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── CONTRATISTA ───────────────────────────────────────────────────────────

  private loadProyectosContratista(): void {
    if (!this.empresaId) return;
    this.loadingProyectos = true;
    this.empresaContratistaService.getProyectos(this.empresaId).subscribe({
      next: (res: any[]) => {
        this.proyectos = (res ?? []).map((p) => ({ id: p.id ?? p.proyectoId, nombre: p.nombre ?? p.projectDescription ?? '' }));
        this.loadingProyectos = false;
        if (this.proyectos.length === 1) {
          this.proyectoId = this.proyectos[0].id;
          this.loadSemanas();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── SEMANAS ───────────────────────────────────────────────────────────────

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.semanas = [];
    if (id) this.loadSemanas();
    this.cdr.detectChanges();
  }

  loadSemanas(): void {
    if (!this.proyectoId) return;
    this.loadingSemanas = true;
    this.dossierService.getSemanas(this.proyectoId, this.empresaId).subscribe({
      next: (res) => {
        this.semanas = res ?? [];
        this.loadingSemanas = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSemanas = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── CHIPS / ESTILOS ───────────────────────────────────────────────────────

  chipSemana(estado: DossierEstadoSemana): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Enviado' || estado === 'Observado') return 'chip-orange';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  labelSemana(estado: DossierEstadoSemana): string {
    if (estado === 'NoAplica') return 'N/A';
    return estado;
  }

  // ── ACCIONES ADMIN ────────────────────────────────────────────────────────

  abrirRevisar(semana: DossierSemanaDto): void {
    this.revisarModalSemanaId = semana.id;
    this.cdr.detectChanges();
  }

  onRevisarClosed(changed: boolean): void {
    this.revisarModalSemanaId = null;
    if (changed) this.loadSemanas();
    this.cdr.detectChanges();
  }

  marcarNoAplicaAdmin(semana: DossierSemanaDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Marcar semana como No Aplica?',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.dossierService.marcarSemanaNoAplica(semana.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.loadSemanas();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // ── ACCIONES CONTRATISTA ──────────────────────────────────────────────────

  abrirUpload(semana: DossierSemanaDto): void {
    this.uploadModalSemanaId = semana.id;
    this.cdr.detectChanges();
  }

  onUploadClosed(changed: boolean): void {
    this.uploadModalSemanaId = null;
    if (changed) this.loadSemanas();
    this.cdr.detectChanges();
  }
}
