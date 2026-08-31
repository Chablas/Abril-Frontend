import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ProyectoService } from '../../services/proyecto.service';
import { ProjectDto } from '../../dtos/project.dto';
import { ProjectEditDto } from '../../dtos/project-edit.dto';
import { ContributorLookupDto } from '../../dtos/company-lookup.dto';
import { ResponsableLookupDto } from '../../dtos/responsable-lookup.dto';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';

interface ProjectFormModel {
  projectDescription: string;
  codigo: string;
  abbreviation: string;
  levelDescription: string;
  estado: string;
  cicloVida: string;

  rucInput: string;
  contributor: ContributorLookupDto | null;
  legalEntityRegistryNumber: string;

  projectDistrict: string;
  projectProvince: string;
  projectDepartment: string;
  projectLocation: string;

  responsableArqCom: string;
  responsableArqComId: number | null;
  responsableUdp: string;
  responsableUdpId: number | null;

  /** FK a workers: el correo del coordinador se resuelve al enviar, no se guarda copia. */
  workersCoordAdminId: number | null;

  fechaInicio: string | null;
  fechaFin: string | null;
  inicioObra: string | null;
  finObra: string | null;

  numNiveles: string;
  numSotanos: string;
  pisos: string;
  tiempoConstruccion: number | null;
  areaM2: number | null;
  areaTechadaM2: number | null;
  hhTotalCasa: number | null;
  cantTrabajadoresCasa: string;

  tieneArquitecturaComercial: boolean;

  lat: number | null;
  lng: number | null;
  radioGeofenceMetros: number | null;

  active: boolean;
}

@Component({
  selector: 'app-proyecto-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect],
  templateUrl: './proyecto-edit.html',
})
export class ProyectoEdit implements OnInit {
  @Input() project!: ProjectDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: ProjectFormModel = this.emptyForm();
  rucLookupLoading = false;
  saving = false;

  responsablesArqCom: ResponsableLookupDto[] = [];
  responsablesUdp: ResponsableLookupDto[] = [];
  coordAdmins: ResponsableLookupDto[] = [];
  loadingLookups = true;
  lookupsError = false;

  /** Opciones del desplegable "Visible en filtros" (antes un <select> de true/false). */
  readonly opcionesActivo = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];

  /** Ciclo de vida real para los ratios SSOMA (project.activo). */
  readonly opcionesCicloVida = [
    { value: 'Activo', label: 'ACTIVO' },
    { value: 'Finalizado', label: 'FINALIZADO' },
    { value: 'Inactivo', label: 'INACTIVO' },
  ];

  constructor(
    private proyectoService: ProyectoService,
    private router: Router,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.form = {
      projectDescription: this.project.projectDescription,
      codigo:        this.project.codigo        ?? '',
      abbreviation:  this.project.abbreviation  ?? '',
      levelDescription: this.project.levelDescription ?? '',
      estado: this.project.estado ?? '',
      cicloVida: this.project.cicloVida ?? 'Activo',

      rucInput: this.project.contributorRuc ?? '',
      contributor:
        this.project.contributorId != null && this.project.contributorRuc
          ? {
              contributorId: this.project.contributorId,
              contributorRuc: this.project.contributorRuc,
              contributorName: this.project.contributorName ?? '',
              contributorAddress: this.project.contributorAddress ?? '',
              contributorDistrict: this.project.contributorDistrict ?? null,
              contributorProvince: this.project.contributorProvince ?? null,
              contributorDepartment: this.project.contributorDepartment ?? null,
              legalEntityRegistryNumber: this.project.contributorLegalEntityRegistryNumber ?? null,
            }
          : null,
      legalEntityRegistryNumber: this.project.contributorLegalEntityRegistryNumber ?? '',

      projectDistrict:   this.project.projectDistrict   ?? '',
      projectProvince:   this.project.projectProvince   ?? '',
      projectDepartment: this.project.projectDepartment ?? '',
      projectLocation:   this.project.projectLocation   ?? '',

      responsableArqCom:   this.project.responsableArqCom   ?? '',
      responsableArqComId: this.project.responsableArqComId ?? null,
      responsableUdp:      this.project.responsableUdp      ?? '',
      responsableUdpId:    this.project.responsableUdpId    ?? null,

      workersCoordAdminId: this.project.workersCoordAdminId ?? null,

      fechaInicio: this.project.fechaInicio ? this.project.fechaInicio.substring(0, 10) : '',
      fechaFin:    this.project.fechaFin    ? this.project.fechaFin.substring(0, 10)    : '',
      inicioObra:  this.project.inicioObra  ? this.project.inicioObra.substring(0, 10)  : '',
      finObra:     this.project.finObra     ? this.project.finObra.substring(0, 10)     : '',

      numNiveles:           this.project.numNiveles           ?? '',
      numSotanos:           this.project.numSotanos           ?? '',
      pisos:                this.project.pisos                ?? '',
      tiempoConstruccion:   this.project.tiempoConstruccion   ?? null,
      areaM2:               this.project.areaM2               ?? null,
      areaTechadaM2:        this.project.areaTechadaM2        ?? null,
      hhTotalCasa:          this.project.hhTotalCasa          ?? null,
      cantTrabajadoresCasa: this.project.cantTrabajadoresCasa ?? '',

      tieneArquitecturaComercial: this.project.tieneArquitecturaComercial ?? false,

      lat: this.project.lat ?? null,
      lng: this.project.lng ?? null,
      radioGeofenceMetros: this.project.radioGeofenceMetros ?? null,

      active: this.project.active,
    };
  }

  lookupRuc(): void {
    const ruc = this.form.rucInput.trim();
    if (!/^\d{11}$/.test(ruc)) {
      Swal.fire({ icon: 'warning', title: 'RUC inválido', text: 'El RUC debe tener 11 dígitos.' });
      return;
    }
    this.rucLookupLoading = true;
    this.loaderService.show();
    this.proyectoService.getCompanyByRuc(ruc).subscribe({
      next: (contributor) => {
        this.form.contributor = contributor;
        this.form.rucInput = contributor.contributorRuc;
        this.rucLookupLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.rucLookupLoading = false;
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.' });
          return;
        }
        this.handleError(err);
      },
    });
  }

  clearContributor(): void {
    this.form.contributor = null;
    this.form.rucInput = '';
    this.form.legalEntityRegistryNumber = '';
  }

  /** Correo del coordinador elegido, solo informativo: lo que se guarda es el workerId. */
  get coordAdminEmail(): string | null {
    if (this.form.workersCoordAdminId == null) return null;
    return this.coordAdmins.find((c) => c.id === this.form.workersCoordAdminId)?.email ?? null;
  }

  loadLookups(): void {
    this.loadingLookups = true;
    this.lookupsError = false;
    this.proyectoService.getLookups().subscribe({
      next: ({ arqCom, udp, coordAdmins }) => {
        this.responsablesArqCom = arqCom;
        this.responsablesUdp = udp;
        this.coordAdmins = this.conCoordAdminActual(coordAdmins);
        this.loadingLookups = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingLookups = false;
        this.lookupsError = true;
        this.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * El desplegable solo trae personal Casa no retirado. Si el coordinador ya guardado dejó de
   * cumplir ese criterio (se retiró), se agrega igual a la lista con el nombre que devolvió el
   * backend: sin esto el combo se vería vacío aunque el proyecto SÍ tiene coordinador asignado,
   * que es justo el tipo de dato "invisible" que esta migración vino a eliminar.
   */
  private conCoordAdminActual(opciones: ResponsableLookupDto[]): ResponsableLookupDto[] {
    const actual = this.project.workersCoordAdminId;
    if (actual == null || opciones.some((o) => o.id === actual)) return opciones;

    return [
      { id: actual, apellidoNombre: this.project.coordAdminNombre ?? 'Trabajador retirado', email: null },
      ...opciones,
    ];
  }

  onResponsableArqComChange(id: number | null): void {
    this.form.responsableArqComId = id;
    this.form.responsableArqCom = this.responsablesArqCom.find((r) => r.id === id)?.apellidoNombre ?? '';
  }

  onResponsableUdpChange(id: number | null): void {
    this.form.responsableUdpId = id;
    this.form.responsableUdp = this.responsablesUdp.find((r) => r.id === id)?.apellidoNombre ?? '';
  }

  save(): void {
    if (!this.form.projectDescription.trim() || this.saving) return;
    this.saving = true;

    const dto: ProjectEditDto = {
      projectId: this.project.projectId,
      projectDescription: this.form.projectDescription.trim(),
      codigo:             this.form.codigo.trim()        || undefined,
      abbreviation:       this.form.abbreviation.trim()  || undefined,
      levelDescription:   this.form.levelDescription.trim() || undefined,
      estado:             this.form.estado.trim() || undefined,
      cicloVida:          this.form.cicloVida || undefined,

      contributorId: this.form.contributor?.contributorId,
      legalEntityRegistryNumber: this.form.contributor
        ? this.form.legalEntityRegistryNumber.trim() || undefined
        : undefined,

      projectDistrict:   this.form.projectDistrict.trim()   || undefined,
      projectProvince:   this.form.projectProvince.trim()   || undefined,
      projectDepartment: this.form.projectDepartment.trim() || undefined,
      projectLocation:   this.form.projectLocation.trim()   || undefined,

      responsableArqCom:   this.form.responsableArqCom.trim() || undefined,
      responsableArqComId: this.form.responsableArqComId ?? undefined,
      responsableUdp:      this.form.responsableUdp.trim() || undefined,
      responsableUdpId:    this.form.responsableUdpId ?? undefined,

      // Null explicito, no undefined: es una FK, "sin coordinador" es un valor valido.
      workersCoordAdminId: this.form.workersCoordAdminId,

      fechaInicio: this.form.fechaInicio || undefined,
      fechaFin:    this.form.fechaFin    || undefined,
      inicioObra:  this.form.inicioObra  || undefined,
      finObra:     this.form.finObra     || undefined,

      numNiveles:           this.form.numNiveles.trim()           || undefined,
      numSotanos:           this.form.numSotanos.trim()           || undefined,
      pisos:                this.form.pisos.trim()                || undefined,
      tiempoConstruccion:   this.form.tiempoConstruccion ?? undefined,
      areaM2:               this.form.areaM2              ?? undefined,
      areaTechadaM2:        this.form.areaTechadaM2       ?? undefined,
      hhTotalCasa:          this.form.hhTotalCasa         ?? undefined,
      cantTrabajadoresCasa: this.form.cantTrabajadoresCasa.trim() || undefined,

      tieneArquitecturaComercial: this.form.tieneArquitecturaComercial,

      lat: this.form.lat ?? undefined,
      lng: this.form.lng ?? undefined,
      radioGeofenceMetros: this.form.radioGeofenceMetros ?? undefined,

      active: this.form.active,
    };

    this.proyectoService.edit(dto).subscribe({
      next: (response) => {
        this.saving = false;
        Swal.fire({ title: response.message ?? 'Proyecto actualizado exitosamente', icon: 'success', draggable: true });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.handleError(err);
      },
    });
  }

  private emptyForm(): ProjectFormModel {
    return {
      projectDescription: '',
      codigo: '',
      abbreviation: '',
      levelDescription: '',
      estado: '',
      cicloVida: 'Activo',

      rucInput: '',
      contributor: null,
      legalEntityRegistryNumber: '',

      projectDistrict: '',
      projectProvince: '',
      projectDepartment: '',
      projectLocation: '',

      responsableArqCom: '',
      responsableArqComId: null,
      responsableUdp: '',
      responsableUdpId: null,

      workersCoordAdminId: null,

      fechaInicio: '',
      fechaFin: '',
      inicioObra: '',
      finObra: '',

      numNiveles: '',
      numSotanos: '',
      pisos: '',
      tiempoConstruccion: null,
      areaM2: null,
      areaTechadaM2: null,
      hhTotalCasa: null,
      cantTrabajadoresCasa: '',

      tieneArquitecturaComercial: false,

      lat: null,
      lng: null,
      radioGeofenceMetros: null,

      active: true,
    };
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 401) {
      Swal.fire({ icon: 'error', title: 'Sesión expirada', text: err.error?.message ?? '' });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }
    if (err.status >= 400 && err.status < 500) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message ?? 'Ocurrió un error.' });
      return;
    }
    Swal.fire({ icon: 'error', title: 'Error del servidor', text: err.error?.message ?? 'Ocurrió un error.' });
  }
}
