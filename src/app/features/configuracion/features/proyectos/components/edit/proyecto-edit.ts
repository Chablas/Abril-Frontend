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
import { ProjectCatalogoDto } from '../../dtos/project-init.dto';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ROLES_ASIGNAN_RESIDENTE } from '../../../../../../core/constants/proyecto-roles';

interface ProjectFormModel {
  projectDescription: string;
  codigo: string;
  abbreviation: string;
  levelDescription: string;
  /** Catálogo project_tipo: proyecto de verdad, FFT, Oficina Central, área interna o prueba. */
  projectTipoId: number | null;
  /** Catálogo project_ciclo_vida. */
  projectCicloVidaId: number | null;

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
  responsablePlaneamientoBim: string;
  responsablePlaneamientoBimId: number | null;

  /** FK a workers: el correo del coordinador se resuelve al enviar, no se guarda copia. */
  workersCoordAdminId: number | null;
  /** FK a workers, igual que el coordinador. Solo lo cambia ROLES_ASIGNAN_RESIDENTE. */
  residenteWorkersId: number | null;

  emailResponsable: string;
  emailRrhh: string;
  emailCoordSsoma: string;

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
  /** Catálogos que ya trajo la carga inicial de la pantalla (no se vuelven a pedir). */
  @Input() tipos: ProjectCatalogoDto[] = [];
  @Input() ciclosVida: ProjectCatalogoDto[] = [];
  /** Quien no edita proyectos (ROLES_EDITAN_PROYECTOS) ve el mismo modal con todo deshabilitado. */
  @Input() soloLectura = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: ProjectFormModel = this.emptyForm();
  rucLookupLoading = false;
  saving = false;
  /** El residente da permisos (Cronograma de Hitos): el RESIDENTE edita el proyecto pero no esto. */
  puedeAsignarResidente = false;

  responsablesArqCom: ResponsableLookupDto[] = [];
  responsablesUdp: ResponsableLookupDto[] = [];
  responsablesPlaneamientoBim: ResponsableLookupDto[] = [];
  /** Elegibles como residente y administrador de obra (personal Casa no retirado con correo). */
  personalCasa: ResponsableLookupDto[] = [];
  loadingLookups = true;
  lookupsError = false;

  /** «Visible en el sistema» (project.active, columna de sistema): no es el ciclo de vida. */
  readonly opcionesActivo = [
    { value: true, label: 'SÍ' },
    { value: false, label: 'NO' },
  ];

  constructor(
    private proyectoService: ProyectoService,
    private router: Router,
    private loaderService: LoaderService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.puedeAsignarResidente =
      !this.soloLectura && this.authService.hasAnyRole(ROLES_ASIGNAN_RESIDENTE);
    this.loadLookups();
    this.form = {
      projectDescription: this.project.projectDescription,
      codigo:        this.project.codigo        ?? '',
      abbreviation:  this.project.abbreviation  ?? '',
      levelDescription: this.project.levelDescription ?? '',
      projectTipoId: this.project.projectTipoId ?? null,
      projectCicloVidaId: this.project.projectCicloVidaId ?? null,

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
      responsablePlaneamientoBim:   this.project.responsablePlaneamientoBim   ?? '',
      responsablePlaneamientoBimId: this.project.responsablePlaneamientoBimId ?? null,

      workersCoordAdminId: this.project.workersCoordAdminId ?? null,
      residenteWorkersId:  this.project.residenteWorkersId  ?? null,

      emailResponsable: this.project.emailResponsable ?? '',
      emailRrhh:        this.project.emailRrhh        ?? '',
      emailCoordSsoma:  this.project.emailCoordSsoma  ?? '',

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
    return this.emailDe(this.form.workersCoordAdminId);
  }

  /** Correo del residente elegido: es el que reciben los avisos de la obra. */
  get residenteEmail(): string | null {
    return this.emailDe(this.form.residenteWorkersId);
  }

  /** Qué significa el tipo elegido (lo trae el catálogo). */
  get descripcionTipo(): string | null {
    return this.tipos.find((t) => t.id === this.form.projectTipoId)?.descripcion ?? null;
  }

  private emailDe(workerId: number | null): string | null {
    if (workerId == null) return null;
    return this.personalCasa.find((c) => c.id === workerId)?.email ?? null;
  }

  loadLookups(): void {
    // En solo lectura no hace falta la lista de trabajadores: cada desplegable muestra lo que ya
    // tiene el proyecto, con el nombre que viene en el listado.
    if (this.soloLectura) {
      this.cargarOpcionesDelProyecto();
      return;
    }

    this.loadingLookups = true;
    this.lookupsError = false;
    this.proyectoService.getLookups().subscribe({
      next: ({ arqCom, udp, personalCasa, planeamientoUdp }) => {
        this.responsablesArqCom = arqCom;
        this.responsablesUdp = udp;
        this.responsablesPlaneamientoBim = planeamientoUdp ?? [];
        this.personalCasa = this.conAsignadosActuales(personalCasa);
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

  private cargarOpcionesDelProyecto(): void {
    const p = this.project;
    const una = (id: number | null | undefined, nombre: string | null | undefined, email?: string | null) =>
      id != null ? [{ id, apellidoNombre: nombre ?? '', email: email ?? null }] : [];

    this.responsablesArqCom = una(p.responsableArqComId, p.responsableArqCom);
    this.responsablesUdp = una(p.responsableUdpId, p.responsableUdp);
    this.responsablesPlaneamientoBim = una(p.responsablePlaneamientoBimId, p.responsablePlaneamientoBim);
    this.personalCasa = this.conAsignadosActuales([]);
    this.loadingLookups = false;
  }

  /**
   * El desplegable solo trae personal Casa no retirado. Si el residente o el coordinador ya
   * guardados dejaron de cumplir ese criterio (se retiraron), se agregan igual con el nombre que
   * devolvió el backend: sin esto el combo se vería vacío aunque el proyecto SÍ los tiene.
   */
  private conAsignadosActuales(opciones: ResponsableLookupDto[]): ResponsableLookupDto[] {
    const p = this.project;
    const faltantes: ResponsableLookupDto[] = [];
    const agregar = (id: number | null | undefined, nombre: string | null | undefined, email: string | null | undefined) => {
      if (id == null || opciones.some((o) => o.id === id) || faltantes.some((o) => o.id === id)) return;
      faltantes.push({ id, apellidoNombre: nombre ?? 'Trabajador retirado', email: email ?? null });
    };

    agregar(p.residenteWorkersId, p.residenteNombre, p.residenteEmail);
    agregar(p.workersCoordAdminId, p.coordAdminNombre, p.coordAdminEmail);
    return [...faltantes, ...opciones];
  }

  onResponsableArqComChange(id: number | null): void {
    this.form.responsableArqComId = id;
    this.form.responsableArqCom = this.responsablesArqCom.find((r) => r.id === id)?.apellidoNombre ?? '';
  }

  onResponsableUdpChange(id: number | null): void {
    this.form.responsableUdpId = id;
    this.form.responsableUdp = this.responsablesUdp.find((r) => r.id === id)?.apellidoNombre ?? '';
  }

  onResponsablePlaneamientoBimChange(id: number | null): void {
    this.form.responsablePlaneamientoBimId = id;
    const found = this.responsablesPlaneamientoBim.find((r) => r.id === id);
    this.form.responsablePlaneamientoBim = found ? found.apellidoNombre : '';
  }

  save(): void {
    if (this.soloLectura || !this.form.projectDescription.trim() || this.saving) return;
    this.saving = true;

    const dto: ProjectEditDto = {
      projectId: this.project.projectId,
      projectDescription: this.form.projectDescription.trim(),
      codigo:             this.form.codigo.trim()        || undefined,
      abbreviation:       this.form.abbreviation.trim()  || undefined,
      levelDescription:   this.form.levelDescription.trim() || undefined,
      projectTipoId:      this.form.projectTipoId,
      projectCicloVidaId: this.form.projectCicloVidaId,

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
      responsablePlaneamientoBim:   this.form.responsablePlaneamientoBim.trim() || undefined,
      responsablePlaneamientoBimId: this.form.responsablePlaneamientoBimId ?? undefined,

      // Null explicito, no undefined: es una FK, "sin coordinador" es un valor valido.
      workersCoordAdminId: this.form.workersCoordAdminId,
      // Igual. Si quien guarda no puede asignarlo, el backend lo ignora y queda el que estaba.
      residenteWorkersId: this.form.residenteWorkersId,

      emailResponsable: this.form.emailResponsable.trim() || null,
      emailRrhh:        this.form.emailRrhh.trim()        || null,
      emailCoordSsoma:  this.form.emailCoordSsoma.trim()  || null,

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
      projectTipoId: null,
      projectCicloVidaId: null,

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
      responsablePlaneamientoBim: '',
      responsablePlaneamientoBimId: null,

      workersCoordAdminId: null,
      residenteWorkersId: null,

      emailResponsable: '',
      emailRrhh: '',
      emailCoordSsoma: '',

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
