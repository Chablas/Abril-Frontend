import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ControlLicenciasService } from '../services/control-licencias.service';
import {
  ProjectOptionDTO,
  VecinoLicenciaItemDTO,
  VecinoLicenciaTipoDTO,
  VecinoLicenciaDestinatarioDTO,
} from '../dtos/control-licencias.dto';
import { LicenciaUpload } from './licencia-upload/licencia-upload';
import { LicenciaHistorial } from './licencia-historial/licencia-historial';
import { TipoUpsert, TipoUpsertResult } from './tipo-upsert/tipo-upsert';

import { VECINOS_TABS } from '../../shared/vecinos-tabs';

/** Roles a los que se puede recordar el vencimiento, igual criterio que en EMOs — GTH nunca recibe estos avisos. */
export const ROLES_DESTINATARIO = ['Coordinador SSOMA', 'Jefe SSOMA', 'Administración', 'Residente'];

@Component({
  selector: 'app-control-licencias',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AbrilPageHeaderComponent, SectionTabs, SearchSelect,
    LicenciaUpload, LicenciaHistorial, TipoUpsert,
  ],
  templateUrl: './control-licencias.html',
})
export class ControlLicencias implements OnInit {
  readonly tabs = VECINOS_TABS;
  readonly rolesDestinatario = ROLES_DESTINATARIO;

  proyectos: ProjectOptionDTO[] = [];
  selectedProjectId: number | null = null;

  activeSubTab = 'plantilla';
  readonly subTabs: SectionTab[] = [
    { id: 'plantilla', label: 'Plantilla' },
    { id: 'destinatarios', label: 'Destinatarios' },
    { id: 'catalogo', label: 'Catálogo base' },
  ];

  items: VecinoLicenciaItemDTO[] = [];
  plantillaLoaded = false;

  destinatarios: VecinoLicenciaDestinatarioDTO[] = [];
  destinatariosLoaded = false;
  nuevoRol = ROLES_DESTINATARIO[0];
  nuevoEmail = '';

  catalogo: VecinoLicenciaTipoDTO[] = [];
  catalogoLoaded = false;

  // Modal de subida/reemplazo
  uploadItem: VecinoLicenciaItemDTO | null = null;

  // Modal de historial
  historialItem: VecinoLicenciaItemDTO | null = null;

  // Modal de alta/edición de tipo (catálogo base o propio de proyecto)
  showTipoUpsert = false;
  tipoUpsertEditing: VecinoLicenciaTipoDTO | null = null;
  tipoUpsertTitulo = '';
  private tipoUpsertMode: 'catalogo' | 'proyecto' = 'catalogo';

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getProyectos().subscribe({
      next: (proyectos) => {
        this.proyectos = proyectos;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get botonPrimario(): SsomaHeaderBtn | undefined {
    if (this.activeSubTab === 'catalogo') return { label: 'Agregar tipo', icono: 'ti-plus' };
    if (this.activeSubTab === 'plantilla' && this.selectedProjectId) return { label: 'Agregar tipo', icono: 'ti-plus' };
    return undefined;
  }

  onProjectChange(): void {
    this.plantillaLoaded = false;
    this.destinatariosLoaded = false;
    if (!this.selectedProjectId) return;
    if (this.activeSubTab === 'plantilla') this.loadPlantilla();
    else if (this.activeSubTab === 'destinatarios') this.loadDestinatarios();
  }

  onSubTabChange(id: string): void {
    this.activeSubTab = id;
    if (id === 'catalogo' && !this.catalogoLoaded) this.loadCatalogo();
    if (!this.selectedProjectId) return;
    if (id === 'plantilla' && !this.plantillaLoaded) this.loadPlantilla();
    if (id === 'destinatarios' && !this.destinatariosLoaded) this.loadDestinatarios();
  }

  private loadPlantilla(): void {
    if (!this.selectedProjectId) return;
    this.loaderService.show();
    this.service.getPlantilla(this.selectedProjectId).subscribe({
      next: (res) => {
        this.items = res.items;
        this.plantillaLoaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private loadDestinatarios(): void {
    if (!this.selectedProjectId) return;
    this.loaderService.show();
    this.service.getDestinatarios(this.selectedProjectId).subscribe({
      next: (res) => {
        this.destinatarios = res;
        this.destinatariosLoaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private loadCatalogo(): void {
    this.loaderService.show();
    this.service.getCatalogoBase().subscribe({
      next: (res) => {
        this.catalogo = res;
        this.catalogoLoaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onPrimaryClick(): void {
    if (this.activeSubTab === 'catalogo') this.openAddTipoBase();
    else if (this.activeSubTab === 'plantilla') this.openAddTipoProyecto();
  }

  // ── Plantilla ────────────────────────────────────────────────────────────
  fileUrl(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  esNoAplica(item: VecinoLicenciaItemDTO): boolean {
    return item.estadoDescripcion === 'No aplica';
  }

  estadoClass(item: VecinoLicenciaItemDTO): string {
    switch (item.estadoDescripcion) {
      case 'Cargado': return 'bg-[var(--color-abril-standard-light)] text-[var(--color-abril-standard)] border-[var(--color-abril-standard-border)]';
      case 'Vencido': return 'bg-red-50 text-red-700 border-red-200';
      case 'Por vencer': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'No aplica': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  }

  openUpload(item: VecinoLicenciaItemDTO): void {
    this.uploadItem = item;
  }

  closeUpload(): void {
    this.uploadItem = null;
  }

  onUploaded(): void {
    this.uploadItem = null;
    this.loadPlantilla();
  }

  toggleNoAplica(item: VecinoLicenciaItemDTO): void {
    if (!this.selectedProjectId) return;
    const noAplica = !this.esNoAplica(item);
    this.loaderService.show();
    this.service.setNoAplica(this.selectedProjectId, item.vecinoLicenciaControlTipoId, noAplica).subscribe({
      next: () => this.loadPlantilla(),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openHistorial(item: VecinoLicenciaItemDTO): void {
    this.historialItem = item;
  }

  closeHistorial(): void {
    this.historialItem = null;
  }

  openAddTipoProyecto(): void {
    if (!this.selectedProjectId) return;
    this.tipoUpsertMode = 'proyecto';
    this.tipoUpsertEditing = null;
    this.tipoUpsertTitulo = 'Nuevo tipo de licencia (solo para este proyecto)';
    this.showTipoUpsert = true;
  }

  // ── Catálogo base ────────────────────────────────────────────────────────
  openAddTipoBase(): void {
    this.tipoUpsertMode = 'catalogo';
    this.tipoUpsertEditing = null;
    this.tipoUpsertTitulo = 'Nuevo tipo en la plantilla base';
    this.showTipoUpsert = true;
  }

  editarTipoBase(tipo: VecinoLicenciaTipoDTO): void {
    this.tipoUpsertMode = 'catalogo';
    this.tipoUpsertEditing = tipo;
    this.tipoUpsertTitulo = 'Editar tipo de la plantilla base';
    this.showTipoUpsert = true;
  }

  closeTipoUpsert(): void {
    this.showTipoUpsert = false;
    this.tipoUpsertEditing = null;
  }

  onTipoUpsertSave(result: TipoUpsertResult): void {
    this.loaderService.show();

    if (this.tipoUpsertEditing) {
      this.service.updateTipo(this.tipoUpsertEditing.vecinoLicenciaControlTipoId, result).subscribe({
        next: () => {
          this.showTipoUpsert = false;
          this.tipoUpsertEditing = null;
          this.loadCatalogo();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
      return;
    }

    if (this.tipoUpsertMode === 'catalogo') {
      this.service.addTipoBase(result).subscribe({
        next: () => {
          this.showTipoUpsert = false;
          this.loadCatalogo();
          // La plantilla base afecta a todos los proyectos: si hay uno abierto, se refresca también.
          if (this.selectedProjectId) { this.plantillaLoaded = false; this.loadPlantilla(); }
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    } else if (this.selectedProjectId) {
      this.service.addTipo(this.selectedProjectId, result).subscribe({
        next: () => {
          this.showTipoUpsert = false;
          this.loadPlantilla();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    }
  }

  async eliminarTipoBase(tipo: VecinoLicenciaTipoDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Quitar este tipo de la plantilla base?',
      text: `"${tipo.descripcion}" dejará de aparecer en todos los proyectos.`,
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteTipo(tipo.vecinoLicenciaControlTipoId).subscribe({
      next: () => this.loadCatalogo(),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Destinatarios ────────────────────────────────────────────────────────
  addDestinatario(): void {
    if (!this.selectedProjectId) return;
    if (!this.nuevoRol.trim() || !this.nuevoEmail.trim()) {
      Swal.fire({ icon: 'warning', title: 'Completa rol y correo', confirmButtonColor: '#0F6E56' });
      return;
    }

    this.loaderService.show();
    this.service.addDestinatario(this.selectedProjectId, this.nuevoRol.trim(), this.nuevoEmail.trim()).subscribe({
      next: (res) => {
        this.destinatarios = [...this.destinatarios, res.destinatario];
        this.nuevoEmail = '';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async eliminarDestinatario(d: VecinoLicenciaDestinatarioDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar este destinatario?',
      text: `${d.rol} · ${d.email}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteDestinatario(d.vecinoLicenciaControlDestinatarioId).subscribe({
      next: () => {
        this.destinatarios = this.destinatarios.filter((x) => x.vecinoLicenciaControlDestinatarioId !== d.vecinoLicenciaControlDestinatarioId);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
