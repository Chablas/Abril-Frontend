import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { WorkerService } from '../../../../../ssoma/salud-ocupacional/services/worker.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';
import { TrabajadorRestringidoService } from '../../../../services/trabajador-restringido.service';
import { CatalogosHabService } from '../../../../services/catalogos-hab.service';
import { PersonService } from '../../../../../../core/services/person.service';
import { WorkerUpsertDto } from '../../../../../ssoma/salud-ocupacional/dtos/emo.model';
import { WorkerHabilitacionListDto } from '../../../../dtos/trabajador.model';
import { EmpresaContratistaListDto } from '../../../../dtos/empresa.model';
import { SubareaCatDto } from '../../../../dtos/catalogos.model';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';

interface WorkerFormModel {
  tipoDocumento: 'DNI' | 'CE';
  apellidoNombre: string;
  dni: string;
  celular: string;
  emailPersonal: string;
  categoria: string;
  ocupacion: string;
  area: string;
  subarea: string;
  contrataCasa: string;
  obraOficina: string;
  jefatura: string;
  sctr: boolean;
  habilitadoObra: boolean;
  notas: string;
  empresaId: number | null;
  proyectoId: number | null;
  emailCorporativo: string;
  fechaIngreso: string;
  condicionMedica: string;
  fechaNacimiento: string;
  sexo: string;
  aniosExperiencia: number | null;
}

@Component({
  selector: 'app-worker-create-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './worker-create-edit.html',
  styleUrl: './worker-create-edit.css',
})
export class WorkerCreateEdit implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() worker: WorkerHabilitacionListDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() buscarWorker = new EventEmitter<string>();

  model: WorkerFormModel = this.emptyModel();
  saving = false;
  loadingDetalle = false;
  verificandoDni = false;
  dniRestringido = false;
  dniVerificado = false;

  empresas: EmpresaContratistaListDto[] = [];
  proyectos: ProjectGetDTO[] = [];
  areas: string[] = [];
  subareas: SubareaCatDto[] = [];
  cargandoSubareas = false;
  categorias: { id: number; nombre: string }[] = [];
  ocupaciones: { id: number; nombre: string }[] = [];
  empresaContratistaNombre = '';

  private destroy$ = new Subject<void>();

  constructor(
    private workerService: WorkerService,
    private trabajadorHabService: TrabajadorHabService,
    private restringidoService: TrabajadorRestringidoService,
    private personService: PersonService,
    private catalogosHabService: CatalogosHabService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetAndLoad();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  get title(): string {
    return this.mode === 'create' ? 'Nuevo trabajador' : 'Editar trabajador';
  }

  get dniReadonly(): boolean {
    return this.mode === 'edit';
  }

  get canSubmit(): boolean {
    const base =
      !this.saving &&
      !this.verificandoDni &&
      !this.dniRestringido &&
      !!this.model.apellidoNombre.trim() &&
      (this.mode === 'edit' || !!this.model.dni.trim());

    if (this.esContratista) {
      return (
        base &&
        !!this.model.proyectoId &&
        !!this.model.categoria.trim() &&
        !!this.model.ocupacion.trim() &&
        !!this.model.condicionMedica.trim() &&
        !!this.model.fechaIngreso.trim() &&
        this.model.aniosExperiencia !== null &&
        this.model.aniosExperiencia !== undefined
      );
    }

    const baseCasa =
      base &&
      !!this.model.obraOficina &&
      !!this.model.fechaNacimiento.trim() &&
      !!this.model.condicionMedica.trim() &&
      !!this.model.empresaId &&
      this.model.aniosExperiencia !== null &&
      this.model.aniosExperiencia !== undefined;

    if (this.esStaffOOficina) {
      return baseCasa && !!this.model.emailCorporativo.trim() && !!this.model.celular.trim() && !!this.model.subarea.trim();
    }

    return baseCasa;
  }

  get mostrarProyecto(): boolean {
    return !this.esContratista && this.model.contrataCasa === 'Casa';
  }

  get sctrEditable(): boolean {
    return this.model.obraOficina === 'Oficina Central';
  }

  get esCasa(): boolean {
    return this.model.contrataCasa === 'Casa';
  }

  get esObrero(): boolean {
    return this.esCasa && this.model.obraOficina === 'Obra';
  }

  get esStaffOOficina(): boolean {
    return this.esCasa && (this.model.obraOficina === 'Staff' || this.model.obraOficina === 'Oficina Central');
  }

  get esOficinaCentral(): boolean {
    return this.model.obraOficina === 'Oficina Central';
  }

  private emptyModel(): WorkerFormModel {
    return {
      tipoDocumento: 'DNI' as const,
      apellidoNombre: '',
      dni: '',
      celular: '',
      emailPersonal: '',
      categoria: '',
      ocupacion: '',
      area: '',
      subarea: '',
      contrataCasa: '',
      obraOficina: '',
      jefatura: '',
      sctr: true,
      habilitadoObra: false,
      notas: '',
      empresaId: null,
      proyectoId: null,
      emailCorporativo: '',
      fechaIngreso: '',
      condicionMedica: '',
      fechaNacimiento: '',
      sexo: '',
      aniosExperiencia: null,
    };
  }

  private resetAndLoad(): void {
    this.saving = false;
    this.loadingDetalle = false;
    this.verificandoDni = false;
    this.dniRestringido = false;
    this.dniVerificado = false;
    this.empresaContratistaNombre = '';
    this.areas = [];
    this.subareas = [];
    this.cargandoSubareas = false;

    if (this.mode === 'edit' && this.worker) {
      this.model = {
        ...this.emptyModel(),
        tipoDocumento: /^\d{8}$/.test(this.worker.dni ?? '') ? 'DNI' : 'CE',
        apellidoNombre: this.worker.apellidoNombre ?? '',
        dni: this.worker.dni ?? '',
        categoria: this.worker.categoria ?? '',
        ocupacion: this.worker.ocupacion ?? '',
        contrataCasa: this.worker.contrataCasa ?? '',
        obraOficina: this.worker.obraOficina ?? '',
        empresaId: this.worker.empresaId ?? null,
        proyectoId: this.worker.proyectoActualId ?? null,
      };
      this.loadingDetalle = true;
      this.trabajadorHabService.getWorker(this.worker.workerId).subscribe({
        next: (det) => {
          this.model.celular = det.celular ?? '';
          this.model.sctr = det.sctr ?? true;
          this.model.area = det.area ?? '';
          this.model.subarea = det.subarea ?? '';
          this.model.jefatura = det.jefatura ?? '';
          this.model.emailCorporativo = det.emailCorporativo ?? '';
          this.model.fechaIngreso = det.fechaIngreso ?? '';
          this.model.condicionMedica = det.condicionMedica ?? '';
          this.model.fechaNacimiento = det.fechaNacimiento ? det.fechaNacimiento.substring(0, 10) : '';
          this.model.sexo = det.sexo ?? '';
          this.model.aniosExperiencia = det.aniosExperiencia ?? null;
          this.loadingDetalle = false;
          if (this.model.area) {
            this.catalogosHabService.getSubareas(this.model.area).subscribe({
              next: (data) => { this.subareas = data; this.cdr.detectChanges(); },
              error: () => {},
            });
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingDetalle = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.model = this.emptyModel();
      if (!this.esContratista) {
        this.model.contrataCasa = 'Casa';
      }
    }

    if (this.esContratista) {
      const empresaId = this.authService.getEmpresaId();
      console.log('[worker-create-edit] esContratista=true, empresaId=', empresaId);
      if (empresaId) {
        this.empresaContratistaService.getEmpresa(empresaId).subscribe({
          next: (emp) => {
            console.log('[worker-create-edit] getEmpresa OK:', emp);
            this.empresaContratistaNombre = emp?.razonSocial ?? '';
            this.cdr.detectChanges();
          },
          error: (err) => { console.error('[worker-create-edit] getEmpresa ERROR:', err); },
        });
        this.empresaContratistaService.getProyectos(empresaId).subscribe({
          next: (data) => {
            this.proyectos = data;
            if (!data.length) {
              Swal.fire({
                icon: 'warning',
                title: 'Sin proyectos afiliados',
                text: 'Tu empresa no tiene proyectos afiliados. Debes tener al menos un proyecto activo para poder registrar trabajadores.',
                confirmButtonColor: '#64BC04',
              }).then(() => this.close());
            }
            this.cdr.detectChanges();
          },
          error: () => {},
        });
      }
    } else {
      this.loadCatalogos();
    }

    this.catalogosHabService.getCategorias().subscribe({
      next: (data) => { this.categorias = data; this.cdr.detectChanges(); },
      error: () => {},
    });
    this.catalogosHabService.getOcupaciones().subscribe({
      next: (data) => { this.ocupaciones = data; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  private loadCatalogos(): void {
    this.empresaContratistaService
      .getEmpresas({ soloContratistas: false, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.empresas = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.empresas = [];
        },
      });

    this.projectService
      .getProjectsPaged({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.proyectos = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.proyectos = [];
        },
      });

    this.catalogosHabService
      .getAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.areas = data.map((a) => a.area);
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  onAreaChange(): void {
    this.model.subarea = '';
    this.model.jefatura = '';
    this.subareas = [];
    if (!this.model.area) return;
    this.cargandoSubareas = true;
    this.catalogosHabService.getSubareas(this.model.area).subscribe({
      next: (data) => {
        this.subareas = data;
        this.cargandoSubareas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoSubareas = false;
      },
    });
  }

  onSubareaChange(): void {
    const selected = this.subareas.find((s) => s.subarea === this.model.subarea);
    this.model.jefatura = selected?.jefatura ?? '';
  }

  onObraOficinaChange(): void {
    if (this.model.obraOficina !== 'Oficina Central') {
      this.model.sctr = true;
    }
    this.model.area = '';
    this.model.subarea = '';
    this.model.jefatura = '';
    this.subareas = [];
  }

  onTipoDocumentoChange(): void {
    this.model.dni = '';
    this.model.apellidoNombre = '';
    this.dniVerificado = false;
    this.dniRestringido = false;
  }

  onDniBlur(): void {
    if (this.mode !== 'create') return;

    const dni = this.model.dni.trim();
    this.dniRestringido = false;
    this.dniVerificado = false;

    const esDni = this.model.tipoDocumento === 'DNI';
    const formatoValido = esDni ? /^\d{8}$/.test(dni) : /^[A-Za-z0-9]{6,12}$/.test(dni);

    if (!formatoValido) {
      if (dni.length > 0) {
        const msg = esDni
          ? 'El DNI debe tener exactamente 8 dígitos numéricos.'
          : 'El CE debe tener entre 6 y 12 caracteres alfanuméricos sin espacios.';
        Swal.fire({
          icon: 'warning',
          title: 'Documento inválido',
          text: msg,
          confirmButtonColor: '#64BC04',
        });
        this.model.dni = '';
        this.cdr.detectChanges();
      }
      return;
    }

    this.verificandoDni = true;
    if (esDni) {
      this.personService.getPersonRENIEC(dni).subscribe({
        next: (persona) => {
          if (persona?.full_name) {
            this.model.apellidoNombre = persona.full_name;
            this.dniVerificado = true;
            this.cdr.detectChanges();
          }
          this.verificarRestringido(dni);
        },
        error: () => {
          this.verificarRestringido(dni);
        },
      });
    } else {
      this.verificarRestringido(dni);
    }
  }

  private verificarRestringido(dni: string): void {
    this.restringidoService.verificarDni(dni).subscribe({
      next: (restringido) => {
        if (restringido) {
          this.verificandoDni = false;
          this.dniRestringido = true;
          this.model.dni = '';
          this.model.apellidoNombre = '';
          this.dniVerificado = false;
          Swal.fire({
            icon: 'error',
            title: 'Acceso restringido',
            text: 'No se puede ingresar o reingresar al trabajador. Comuníquese con el área de Administración o SSOMA.',
            confirmButtonColor: '#64BC04',
          });
          this.cdr.detectChanges();
        } else {
          this.verificarExistenciaEnBd(dni);
        }
      },
      error: () => {
        this.verificandoDni = false;
        this.cdr.detectChanges();
      },
    });
  }

  private verificarExistenciaEnBd(dni: string): void {
    this.trabajadorHabService
      .getTrabajadores({ search: dni, pageSize: 1, page: 1, soloVerificacion: true })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];

          if (!data || data.length === 0) {
            this.verificandoDni = false;
            this.cdr.detectChanges();
            return;
          }

          const worker = data[0];
          const estaActivo = worker.estadoWorker === 'ACTIVO';
          const mismaEmpresa =
            worker.empresaId != null && worker.empresaId === this.authService.getEmpresaId();

          let debeBloquear = false;
          let puedeIrABuscar = false;
          let mensajeHtml = '';

          if (this.esContratista) {
            if (estaActivo) {
              debeBloquear = true;
              if (mismaEmpresa) {
                puedeIrABuscar = true;
                mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en el sistema.<br><br>Búscalo en la lista para gestionarlo.`;
              } else {
                mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en otra empresa y no puede ser registrado.`;
              }
            } else if (mismaEmpresa) {
              debeBloquear = true;
              puedeIrABuscar = true;
              mensajeHtml = `<b>${worker.apellidoNombre}</b> ya estuvo registrado en tu empresa.<br><br>Búscalo en la lista para reingresarlo.`;
            } else {
              // RETIRADO + otra empresa: solo bloquear si es admin (worker Casa)
              if (!this.esContratista) {
                debeBloquear = true;
                mensajeHtml = `<b>${worker.apellidoNombre}</b> ya existe como trabajador retirado.<br><br>Usa la opción Reingreso para reactivarlo.`;
              }
              // Contratista: no bloquear, puede registrarlo libremente en su empresa
            }
          } else {
            debeBloquear = true;
            puedeIrABuscar = true;
            mensajeHtml = estaActivo
              ? `<b>${worker.apellidoNombre}</b> ya está registrado y activo.<br><br>Búscalo en la lista para gestionarlo.`
              : `<b>${worker.apellidoNombre}</b> ya existe en el sistema como trabajador retirado.<br><br>Búscalo en la lista para reingresarlo.`;
          }

          if (debeBloquear) {
            this.model.dni = '';
            this.model.apellidoNombre = '';
            this.dniVerificado = false;
          }

          this.verificandoDni = false;
          this.cdr.detectChanges();

          if (debeBloquear) {
            Swal.fire({
              icon: 'info',
              title: 'Trabajador ya registrado',
              html: mensajeHtml,
              showCancelButton: puedeIrABuscar,
              confirmButtonText: puedeIrABuscar ? 'Ir a buscarlo' : 'Entendido',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#64BC04',
              cancelButtonColor: '#6b7280',
            }).then((result) => {
              if (result.isConfirmed && puedeIrABuscar) {
                this.buscarWorker.emit(dni);
              }
            });
          }
        },
        error: () => {
          this.verificandoDni = false;
          this.cdr.detectChanges();
        },
      });
  }

  submit(): void {
    if (!this.model.apellidoNombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo obligatorio',
        text: 'El nombre es obligatorio.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa todos los campos obligatorios antes de guardar.',
      });
      return;
    }

    const n = (v: string | null | undefined): string | null => (v ?? '').trim() || null;

    const payload: WorkerUpsertDto = {
      apellidoNombre: this.model.apellidoNombre.trim(),
      dni: this.model.dni?.trim() || undefined,
      tipoDocumento: this.model.tipoDocumento,
      celular: n(this.model.celular),
      emailPersonal: n(this.model.emailPersonal),
      emailCorporativo: n(this.model.emailCorporativo),
      fechaIngreso: n(this.model.fechaIngreso) || undefined,
      condicionMedica: n(this.model.condicionMedica),
      categoria: n(this.model.categoria),
      ocupacion: n(this.model.ocupacion),
      area: n(this.model.area),
      subarea: n(this.model.subarea),
      contrataCasa: this.esContratista ? 'Contratista' : n(this.model.contrataCasa),
      obraOficina: n(this.model.obraOficina),
      jefatura: n(this.model.jefatura),
      sctr: !!this.model.sctr,
      habilitadoObra: false,
      notas: n(this.model.notas),
      empresaId: this.esContratista ? this.authService.getEmpresaId() : (this.model.empresaId ?? null),
      proyectoId: this.model.proyectoId ?? null,
      fechaNacimiento: this.esContratista ? undefined : (n(this.model.fechaNacimiento) || undefined),
      sexo: n(this.model.sexo),
      aniosExperiencia: this.model.aniosExperiencia ?? undefined,
    };

    this.saving = true;
    this.loaderService.show();

    const req$ =
      this.mode === 'edit' && this.worker
        ? this.workerService.updateWorker(this.worker.workerId, payload)
        : this.workerService.createWorker(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'create' ? 'Trabajador creado' : 'Trabajador actualizado',
          timer: 1500,
          showConfirmButton: false,
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
