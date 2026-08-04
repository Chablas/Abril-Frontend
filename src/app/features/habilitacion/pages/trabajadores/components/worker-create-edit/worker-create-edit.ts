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
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
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
import { AreaArbolNodoDto, ObraOficinaStaffDto } from '../../../../dtos/catalogos.model';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';

/** Un nivel de la cascada de áreas: los hermanos disponibles y el nodo elegido en ese nivel. */
interface AreaLevel {
  options: AreaArbolNodoDto[];
  /** areaScopeId elegido, o null si el nivel está vacío. */
  selected: number | null;
}

interface WorkerFormModel {
  tipoDocumento: 'DNI' | 'CE';
  apellidoNombre: string;
  dni: string;
  celular: string;
  categoria: string;
  ocupacion: string;
  ocupacionId: number | null;
  puesto: string;
  /**
   * Nodo del árbol de áreas (workers.area_scope_id): el único dato de área que captura el
   * formulario. Los campos legacy area/subarea/jefatura los deriva el backend a partir de él.
   */
  areaScopeId: number | null;
  /**
   * area/subarea/jefatura legacy tal como vinieron del backend. No son editables: solo se
   * reenvían intactos cuando el formulario no gestiona el área (obreros y contratistas), para
   * no borrar lo que ya estaba guardado. Ver `gestionaArea`.
   */
  area: string;
  subarea: string;
  contrataCasa: string;
  /** FK a workers_obra_oficina_staff (lo que se guarda). */
  obraOficinaStaffId: number | null;
  /** Nombre del catálogo; solo lo usa el propio formulario para decidir qué campos mostrar. */
  obraOficina: string;
  jefatura: string;
  sctr: boolean;
  habilitadoObra: boolean;
  notas: string;
  empresaId: number | null;
  proyectoId: number | null;
  emailCorporativo: string;
  emailPersonal: string;
  fechaIngreso: string;
  condicionMedica: string;
  fechaNacimiento: string;
  sexo: string;
  aniosExperiencia: number | null;
}

@Component({
  selector: 'app-worker-create-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DatePicker],
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

  /** Verificación del correo corporativo contra el directorio de Abril (ver onEmailCorporativoBlur). */
  verificandoEmail = false;
  emailError = '';
  emailVerificadoNombre = '';
  /**
   * Correo con el que se abrió la edición. Se acepta sin verificar, igual que hace el backend:
   * hay fichas antiguas con correos que hoy no pasarían la validación y no deben bloquear la
   * corrección de otros campos.
   */
  private emailOriginal = '';
  /** Último correo verificado con éxito, para no repetir la consulta en cada blur. */
  private emailVerificado = '';
  /**
   * Si la ficha ya traía algún correo al abrirla. Solo se exige "al menos un correo" cuando lo
   * tenía: hay miles de fichas legadas sin ninguno y no deben quedar imposibles de editar, pero
   * tampoco se puede borrar el último correo de las que sí lo tienen (misma regla que el backend).
   */
  private teniaAlgunCorreo = false;

  empresas: EmpresaContratistaListDto[] = [];
  proyectos: ProjectGetDTO[] = [];
  categorias: { id: number; nombre: string }[] = [];
  ocupaciones: { id: number; nombre: string }[] = [];
  empresaContratistaNombre = '';

  /**
   * Desplegables en cascada del árbol de áreas (uno por nivel), mismo patrón que
   * Configuración → Trabajadores. Se guarda el último nodo elegido, sin obligar a llegar a una hoja.
   */
  areaLevels: AreaLevel[] = [];
  /** Nodos del árbol tal como los devuelve el backend (planos, con revisor ya resuelto). */
  private areaNodos: AreaArbolNodoDto[] = [];
  private areaPorId = new Map<number, AreaArbolNodoDto>();
  /** areaScopeParentId → hijos. La clave null son las raíces (gerencias). */
  private areaHijos = new Map<number | null, AreaArbolNodoDto[]>();
  cargandoAreas = false;

  /**
   * Acento de los componentes compartidos (app-search-select / app-date-picker) del formulario:
   * el teal estándar de la app, para que combos y fechas se lean como un solo control.
   */
  readonly accentColor = 'var(--color-abril-standard)';

  /**
   * Catálogos fijos de los desplegables. Todos van con `[sortAlpha]="false"` en el template
   * porque su orden es semántico, no alfabético.
   * En las etiquetas se evita el TODO MAYÚSCULAS: `app-search-select` lo reformatea a
   * "Nombre Propio" (así "DNI" se vería como "Dni").
   */
  /**
   * Obra / Staff / Oficina Central. Ya no es una lista hardcodeada: viene del catálogo
   * workers_obra_oficina_staff, que es también el que define la columna
   * workers.obra_oficina_staff_id (antes esto se deducía del último nodo del árbol de
   * áreas, de tipo "Área Obra_Oficina", eliminado).
   */
  obraOficinaOpciones: ObraOficinaStaffDto[] = [];

  readonly tipoDocumentoOpciones = [
    { value: 'DNI', label: 'DNI — Documento de identidad' },
    { value: 'CE', label: 'CE — Carné de Extranjería' },
  ];

  readonly sexoOpciones = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
  ];

  /** Contratistas: sin "Falta" (a ese estado solo lo pone el personal de casa). */
  readonly condicionMedicaContratistaOpciones = [
    { value: 'Apto', label: 'Apto' },
    { value: 'Apto con restricciones', label: 'Apto con restricciones' },
  ];

  readonly condicionMedicaCasaOpciones = [
    { value: 'Apto', label: 'Apto' },
    { value: 'Apto con restricciones', label: 'Apto con restricciones' },
    { value: 'Falta', label: 'Falta' },
  ];

  private destroy$ = new Subject<void>();
  private loadToken = 0;

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

  /** Todo trabajador debe quedar con al menos un correo: el corporativo o el personal. */
  get tieneAlgunCorreo(): boolean {
    return !!this.model.emailCorporativo.trim() || !!this.model.emailPersonal.trim();
  }

  /** True cuando falta el correo y en este contexto sí es exigible (ver teniaAlgunCorreo). */
  get faltaCorreo(): boolean {
    if (this.tieneAlgunCorreo) return false;
    return this.mode === 'create' || this.teniaAlgunCorreo;
  }

  get canSubmit(): boolean {
    const base =
      !this.saving &&
      !this.verificandoDni &&
      !this.dniRestringido &&
      !this.verificandoEmail &&
      !this.emailError &&
      !this.faltaCorreo &&
      !!this.model.apellidoNombre.trim() &&
      (this.mode === 'edit' || !!this.model.dni.trim());

    // En edición se permite guardar cambios parciales: muchos trabajadores
    // legados tienen campos obligatorios de alta (email, celular, años de
    // experiencia, etc.) incompletos, y no deben bloquear correcciones puntuales
    // como Área/Subárea. La validación completa de obligatorios solo aplica al crear.
    if (this.mode === 'edit') {
      return base;
    }

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

    // El corporativo ya no es obligatorio por sí solo: basta con que haya alguno de los dos
    // correos (lo cubre `faltaCorreo` dentro de `base`).
    if (this.esStaffOOficina) {
      return baseCasa && !!this.model.celular.trim() && !!this.model.areaScopeId;
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

  /**
   * True cuando el formulario muestra (y por tanto es dueño de) los desplegables de área. En Obra
   * y en contratistas no se capturan, así que ahí el área guardada se reenvía intacta en vez de
   * mandar nulls que la borrarían.
   */
  get gestionaArea(): boolean {
    return this.esStaffOOficina;
  }

  private emptyModel(): WorkerFormModel {
    return {
      tipoDocumento: 'DNI' as const,
      apellidoNombre: '',
      dni: '',
      celular: '',
      categoria: '',
      ocupacion: '',
      ocupacionId: null,
      puesto: '',
      areaScopeId: null,
      area: '',
      subarea: '',
      contrataCasa: '',
      obraOficinaStaffId: null,
      obraOficina: '',
      jefatura: '',
      sctr: true,
      habilitadoObra: false,
      notas: '',
      empresaId: null,
      proyectoId: null,
      emailCorporativo: '',
      emailPersonal: '',
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
    this.resetEstadoEmail();
    this.emailOriginal = '';
    this.teniaAlgunCorreo = false;
    this.empresaContratistaNombre = '';

    // Token de carga: si el usuario cambia de trabajador antes de que responda
    // esta petición, la respuesta llega "vieja" y no debe pisar el formulario
    // del trabajador que se está editando ahora.
    const loadToken = ++this.loadToken;

    if (this.mode === 'edit' && this.worker) {
      this.model = {
        ...this.emptyModel(),
        tipoDocumento: /^\d{8}$/.test(this.worker.dni ?? '') ? 'DNI' : 'CE',
        apellidoNombre: this.worker.apellidoNombre ?? '',
        dni: this.worker.dni ?? '',
        categoria: this.worker.categoria ?? '',
        ocupacion: this.worker.ocupacion ?? '',
        contrataCasa: this.worker.contrataCasa ?? '',
        obraOficinaStaffId: this.worker.obraOficinaStaffId ?? null,
        obraOficina: this.worker.obraOficina ?? '',
        empresaId: this.worker.empresaId ?? null,
        proyectoId: this.worker.proyectoActualId ?? null,
      };
      this.loadingDetalle = true;
      this.trabajadorHabService.getWorker(this.worker.workerId).subscribe({
        next: (det) => {
          if (loadToken !== this.loadToken) return;
          this.model.celular = det.celular ?? '';
          this.model.sctr = det.sctr ?? true;
          this.model.areaScopeId = det.areaScopeId ?? null;
          this.model.area = det.area ?? '';
          this.model.subarea = det.subarea ?? '';
          this.model.jefatura = det.jefatura ?? '';
          this.model.emailCorporativo = det.emailCorporativo ?? '';
          this.model.emailPersonal = det.emailPersonal ?? '';
          this.emailOriginal = this.model.emailCorporativo.trim().toLowerCase();
          this.teniaAlgunCorreo = this.tieneAlgunCorreo;
          this.model.fechaIngreso = det.fechaIngreso ?? '';
          this.model.condicionMedica = det.condicionMedica ?? '';
          this.model.fechaNacimiento = det.fechaNacimiento ? det.fechaNacimiento.substring(0, 10) : '';
          this.model.sexo = det.sexo ?? '';
          this.model.ocupacionId = det.ocupacionId ?? null;
          this.model.puesto = det.puesto ?? '';
          this.model.aniosExperiencia = det.aniosExperiencia ?? null;
          this.loadingDetalle = false;
          // El árbol puede haber llegado antes que el detalle: en ese caso hay que rearmar la
          // cascada ahora que ya se sabe en qué nodo está el trabajador.
          this.initAreaLevels();
          this.cdr.detectChanges();
        },
        error: () => {
          if (loadToken !== this.loadToken) return;
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

    // Cascada de áreas para el modelo ya reseteado. Si el árbol todavía no llegó queda solo el
    // nivel raíz vacío (mostrando "Cargando…") y se vuelve a armar cuando llega, igual que cuando
    // llega el detalle del trabajador con su nodo asignado.
    this.initAreaLevels();

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

    this.catalogosHabService.getObraOficinaStaff().subscribe({
      next: (data) => {
        this.obraOficinaOpciones = data;
        // Si el detalle llegó antes que el catálogo, se resincroniza el id a partir del nombre.
        if (!this.model.obraOficinaStaffId && this.model.obraOficina) {
          this.model.obraOficinaStaffId =
            data.find((o) => o.name === this.model.obraOficina)?.obraOficinaStaffId ?? null;
        }
        this.cdr.detectChanges();
      },
      error: () => {},
    });
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

    this.cargandoAreas = true;
    this.catalogosHabService
      .getAreaArbol()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.setAreaArbol(data);
          this.cargandoAreas = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoAreas = false;
        },
      });
  }

  // ── Árbol de áreas ───────────────────────────────────────────────────

  /** Indexa el árbol plano que devuelve el backend y arma la cascada inicial. */
  private setAreaArbol(nodos: AreaArbolNodoDto[]): void {
    this.areaNodos = nodos ?? [];
    this.areaPorId = new Map(this.areaNodos.map((n) => [n.areaScopeId, n]));
    this.areaHijos = new Map();
    for (const nodo of this.areaNodos) {
      const key = nodo.areaScopeParentId ?? null;
      const hermanos = this.areaHijos.get(key);
      if (hermanos) hermanos.push(nodo);
      else this.areaHijos.set(key, [nodo]);
    }
    this.initAreaLevels();
  }

  private hijosDe(areaScopeId: number | null): AreaArbolNodoDto[] {
    return this.areaHijos.get(areaScopeId) ?? [];
  }

  /** Camino raíz → nodo, o null si el nodo no existe en el árbol vivo. */
  private caminoHasta(areaScopeId: number): AreaArbolNodoDto[] | null {
    const camino: AreaArbolNodoDto[] = [];
    const visitados = new Set<number>();
    let actual = this.areaPorId.get(areaScopeId);
    while (actual && !visitados.has(actual.areaScopeId)) {
      visitados.add(actual.areaScopeId);
      camino.unshift(actual);
      actual = actual.areaScopeParentId != null
        ? this.areaPorId.get(actual.areaScopeParentId)
        : undefined;
    }
    return camino.length ? camino : null;
  }

  /**
   * Un desplegable por cada nivel del camino hasta el nodo asignado, más uno vacío con los hijos
   * del último nodo (si tiene) para poder profundizar. No obliga a llegar a una hoja: se guarda
   * el nodo más profundo que se haya elegido.
   */
  private initAreaLevels(): void {
    // Siempre queda al menos el nivel raíz, aunque el árbol no haya llegado todavía: así el campo
    // de Área no aparece de golpe a mitad de la carga (muestra "Cargando…" y se llena solo).
    const camino = this.model.areaScopeId ? this.caminoHasta(this.model.areaScopeId) : null;
    this.areaLevels = [
      { options: this.hijosDe(null), selected: camino?.[0]?.areaScopeId ?? null },
    ];
    if (!camino) return;

    for (let i = 0; i < camino.length; i++) {
      const hijos = this.hijosDe(camino[i].areaScopeId);
      if (!hijos.length) continue;
      const siguiente = camino[i + 1] ?? null;
      this.areaLevels.push({ options: hijos, selected: siguiente?.areaScopeId ?? null });
    }
  }

  /**
   * Al elegir un nodo se descartan los niveles más profundos y, si el nodo tiene hijos, se agrega
   * un desplegable vacío para el siguiente nivel (opcional).
   */
  onAreaLevelChange(index: number, value: number | null): void {
    const level = this.areaLevels[index];
    level.selected = value ?? null;
    this.areaLevels = this.areaLevels.slice(0, index + 1);
    if (value != null) {
      const hijos = this.hijosDe(value);
      if (hijos.length) this.areaLevels.push({ options: hijos, selected: null });
    }
    this.model.areaScopeId = this.areaScopeIdElegido;
  }

  /** Nodo más profundo elegido en la cascada (lo que se guarda en workers.area_scope_id). */
  get areaScopeIdElegido(): number | null {
    for (let i = this.areaLevels.length - 1; i >= 0; i--) {
      if (this.areaLevels[i].selected != null) return this.areaLevels[i].selected;
    }
    return null;
  }

  /** Nodo elegido, para leer su equivalencia legacy y su revisor. */
  private get areaNodoElegido(): AreaArbolNodoDto | null {
    const id = this.areaScopeIdElegido;
    return id != null ? this.areaPorId.get(id) ?? null : null;
  }

  /** Ruta legible de la selección (ej. "Gerencia de Proyectos › Unidad de Proyectos"). */
  get areaPathLabel(): string {
    const nombres: string[] = [];
    for (const level of this.areaLevels) {
      if (level.selected == null) break;
      const nodo = level.options.find((o) => o.areaScopeId === level.selected);
      if (!nodo) break;
      nombres.push(nodo.areaItemName);
    }
    return nombres.join(' › ');
  }

  /** Área/subárea legacy a las que va a caer el nodo elegido (las deriva el backend al guardar). */
  get areaLegacyLabel(): string {
    const nodo = this.areaNodoElegido;
    if (!nodo?.subarea) return '';
    return nodo.area ? `${nodo.area} / ${nodo.subarea}` : nodo.subarea;
  }

  /**
   * Revisor que le tocaría al trabajador por su área, según Configuración → Revisores de Áreas.
   * Si el área está configurada para filtrar por proyecto, manda el revisor del proyecto elegido
   * en el formulario. Ambas cosas las resuelve el backend; acá solo se elige entre las dos.
   */
  get revisorNombre(): string {
    const r = this.revisorDelArea;
    return r?.revisorNombre ?? '';
  }

  get revisorEmail(): string {
    const r = this.revisorDelArea;
    return r?.revisorEmail ?? '';
  }

  private get revisorDelArea(): { revisorNombre?: string | null; revisorEmail?: string | null } | null {
    const nodo = this.areaNodoElegido;
    if (!nodo) return null;
    const porProyecto = this.model.proyectoId != null
      ? nodo.revisoresPorProyecto?.find((r) => r.proyectoId === this.model.proyectoId)
      : undefined;
    return porProyecto ?? nodo;
  }

  // Los desplegables emiten `null` al limpiarse; los campos del modelo son strings, así que
  // todos los handlers normalizan a '' antes de asignar (varios getters hacen .trim() encima).

  onCategoriaChange(nombre: string | null): void {
    this.model.categoria = nombre ?? '';
    this.syncPuesto();
  }

  onOcupacionChange(nombre: string | null): void {
    this.model.ocupacion = nombre ?? '';
    this.model.ocupacionId = this.ocupaciones.find((o) => o.nombre === nombre)?.id ?? null;
    this.syncPuesto();
  }

  onObraOficinaSelect(valor: number | null): void {
    this.model.obraOficinaStaffId = valor;
    // El nombre se conserva en el modelo porque el resto del formulario decide qué campos
    // mostrar a partir de él (esObrero / esStaffOOficina / esOficinaCentral).
    this.model.obraOficina =
      this.obraOficinaOpciones.find((o) => o.obraOficinaStaffId === valor)?.name ?? '';
    this.onObraOficinaChange();
  }

  onTipoDocumentoSelect(valor: string | null): void {
    this.model.tipoDocumento = valor === 'CE' ? 'CE' : 'DNI';
    this.onTipoDocumentoChange();
  }

  /**
   * Autocompleta el puesto final concatenando categoría y ocupación
   * (ej. "Operario" + "Abogado" → "Operario Abogado"). El campo sigue siendo
   * editable: cualquier cambio posterior en un desplegable lo vuelve a calcular.
   */
  private syncPuesto(): void {
    this.model.puesto = [this.model.categoria, this.model.ocupacion]
      .map((v) => (v ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }

  onObraOficinaChange(): void {
    if (this.model.obraOficina !== 'Oficina Central') {
      this.model.sctr = true;
    }
    // Cambiar de Obra/Staff/Oficina cambia si el formulario gestiona el área o no, así que la
    // selección anterior se descarta y la cascada vuelve a empezar.
    this.model.areaScopeId = null;
    this.initAreaLevels();
    // El mismo campo pasa de correo personal (Obra) a corporativo (Staff/Oficina Central),
    // así que la verificación anterior deja de ser válida.
    this.resetEstadoEmail();
    if (this.esStaffOOficina) this.onEmailCorporativoBlur();
  }

  private resetEstadoEmail(): void {
    this.verificandoEmail = false;
    this.emailError = '';
    this.emailVerificadoNombre = '';
    this.emailVerificado = '';
  }

  /**
   * Verifica el correo corporativo contra el directorio de Abril (tenant de Microsoft) y contra
   * los correos ya asignados a otros trabajadores. Solo aplica a Staff/Oficina Central: en Obra
   * y en contratistas el mismo campo guarda el correo personal, que no vive en el tenant y sí
   * puede repetirse (varias fichas comparten el correo de RR.HH. de su empresa).
   */
  onEmailCorporativoBlur(): void {
    if (!this.esStaffOOficina) {
      this.resetEstadoEmail();
      return;
    }

    const email = this.model.emailCorporativo.trim().toLowerCase();
    if (!email || email === this.emailVerificado || email === this.emailOriginal) return;

    this.emailError = '';
    this.emailVerificadoNombre = '';
    this.verificandoEmail = true;

    this.workerService
      .validarEmailCorporativo(email, this.mode === 'edit' ? this.worker?.workerId : null, true)
      .subscribe({
        next: (res) => {
          this.verificandoEmail = false;
          if (res.valido) {
            // Se guarda el correo canónico del directorio (así coincide con el del login SSO).
            if (res.email) this.model.emailCorporativo = res.email;
            this.emailVerificado = this.model.emailCorporativo.trim().toLowerCase();
            this.emailVerificadoNombre = res.nombreEnTenant ?? '';
          } else {
            this.emailError = res.mensaje ?? 'El correo corporativo no es válido.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          // Sin verificación no se bloquea el formulario: el backend vuelve a validar al guardar.
          this.verificandoEmail = false;
          this.cdr.detectChanges();
        },
      });
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
      .getTrabajadores({ search: dni, pageSize: 50, page: 1, soloVerificacion: true })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];

          if (!data || data.length === 0) {
            this.verificandoDni = false;
            this.cdr.detectChanges();
            return;
          }

          // El DNI puede tener una ficha por cada empresa donde estuvo/está vinculado.
          // Solo se bloquea el alta si ese DNI está ACTIVO en alguna de ellas; si todas
          // están retiradas, se permite registrarlo como trabajador nuevo (otra empresa).
          const empresaActual = this.esContratista
            ? this.authService.getEmpresaId()
            : this.model.empresaId;

          const activos = data.filter((w) => w.estadoWorker === 'ACTIVO');
          const activoMismaEmpresa = activos.find(
            (w) => empresaActual != null && w.empresaId === empresaActual,
          );
          const retiradoMismaEmpresa = data.find(
            (w) => w.estadoWorker !== 'ACTIVO' && empresaActual != null && w.empresaId === empresaActual,
          );

          let debeBloquear = false;
          let puedeIrABuscar = false;
          let mensajeHtml = '';
          let worker = activos[0] ?? data[0];

          if (activoMismaEmpresa) {
            debeBloquear = true;
            puedeIrABuscar = true;
            worker = activoMismaEmpresa;
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en el sistema.<br><br>Búscalo en la lista para gestionarlo.`;
          } else if (activos.length > 0) {
            debeBloquear = true;
            worker = activos[0];
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya está activo en otra empresa y no puede ser registrado.<br><br>Esa empresa debe darlo de baja primero.`;
          } else if (retiradoMismaEmpresa) {
            debeBloquear = true;
            puedeIrABuscar = true;
            worker = retiradoMismaEmpresa;
            mensajeHtml = `<b>${worker.apellidoNombre}</b> ya estuvo registrado en tu empresa.<br><br>Búscalo en la lista para reingresarlo.`;
          }
          // Si solo hay fichas retiradas en otras empresas (ninguna activa), no se bloquea:
          // se permite registrarlo como trabajador nuevo.

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

  /** Al reescribir el correo se limpia el resultado de la verificación anterior. */
  onEmailCorporativoInput(): void {
    this.emailError = '';
    this.emailVerificadoNombre = '';
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

    if (this.emailError) {
      Swal.fire({
        icon: 'error',
        title: 'Correo corporativo no válido',
        text: this.emailError,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (this.faltaCorreo) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el correo',
        text: this.esStaffOOficina
          ? 'Registra al menos un correo: el corporativo o el personal.'
          : 'El correo personal es obligatorio.',
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
      emailCorporativo: n(this.model.emailCorporativo),
      emailPersonal: n(this.model.emailPersonal),
      fechaIngreso: n(this.model.fechaIngreso) || undefined,
      condicionMedica: n(this.model.condicionMedica),
      categoria: n(this.model.categoria),
      ocupacion: n(this.model.ocupacion),
      ocupacionId: this.model.ocupacionId ?? undefined,
      puesto: n(this.model.puesto),
      // El área se manda como nodo del árbol y el backend deriva de ahí area/subarea/jefatura.
      // Cuando el formulario sí gestiona el área se mandan los tres en null para que manden los
      // derivados (y para que limpiar el desplegable realmente limpie el área); cuando no la
      // gestiona se reenvían intactos para no borrar lo que ya estaba guardado.
      areaScopeId: this.model.areaScopeId,
      area: this.gestionaArea ? null : n(this.model.area),
      subarea: this.gestionaArea ? null : n(this.model.subarea),
      contrataCasa: this.esContratista ? 'Contratista' : n(this.model.contrataCasa),
      obraOficinaStaffId: this.model.obraOficinaStaffId,
      jefatura: this.gestionaArea ? null : n(this.model.jefatura),
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
