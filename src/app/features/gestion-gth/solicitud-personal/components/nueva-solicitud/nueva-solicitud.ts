import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { SolicitudPersonalService } from '../../services/solicitud-personal.service';
import {
  DestinatarioSolicitud,
  ReclutamientoFormDataDto,
  SolicitudPersonalCreateDto,
  TIPO_REQUERIMIENTO_REEMPLAZO,
  VacanteCreateDto,
} from '../../dtos/solicitud-personal.dto';

/** Estado en memoria de una vacante del formulario. */
interface VacanteForm {
  puestoId: number | null;
  /**
   * Checkbox "Puesto personalizado": oculta el desplegable de puesto y en su lugar pide
   * categoría + nombre escrito a mano. El backend da de alta ese puesto en el catálogo.
   */
  personalizado: boolean;
  puestoNombre: string;
  categoriaId: number | null;
  tipoRequerimientoId: number | null;
  /**
   * Trabajador al que reemplaza la vacante. Solo se pide (y solo se envía) cuando el tipo de
   * requerimiento elegido es Reemplazo; al cambiar a otro tipo se limpia.
   */
  reemplazaWorkerId: number | null;
  projectId: number | null;
  fecha: string; // "YYYY-MM-DD"
}

@Component({
  standalone: true,
  selector: 'app-gth-nueva-solicitud',
  imports: [BaseModal, CommonModule, FormsModule, SearchSelect, DatePicker, FileSelector],
  templateUrl: './nueva-solicitud.html',
})
export class GthNuevaSolicitud implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Tope del puesto escrito a mano; el backend rechaza cualquier cosa más larga. */
  readonly maxPuestoNombre = 120;

  formData: ReclutamientoFormDataDto = {
    areaNombre: null,
    areaScopeId: null,
    maxVacantes: 10,
    puestos: [],
    categorias: [],
    tiposRequerimiento: [],
    proyectos: [],
    trabajadoresArea: [],
    destinatarios: { para: [], copias: [] },
  };

  /** El aviso de destinatarios solo se muestra cuando ya se sabe a quién le llega (o a nadie). */
  destinatariosCargados = false;

  /** Opciones del desplegable "Cantidad total de vacantes" (1..maxVacantes). */
  cantidadOptions: { id: number; nombre: string }[] = [];
  cantidad = 1;

  vacantes: VacanteForm[] = [];
  justificacion = '';
  sustento: SelectedFile | null = null;

  submitted = false;

  constructor(
    private service: SolicitudPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.vacantes = [this.nuevaVacante()];
    setTimeout(() => this.loadFormData());
  }

  loadFormData(): void {
    this.loaderService.show();
    this.service.getFormData().subscribe({
      next: (data) => {
        this.formData = {
          ...data,
          categorias: data.categorias ?? [],
          trabajadoresArea: data.trabajadoresArea ?? [],
          destinatarios: data.destinatarios ?? { para: [], copias: [] },
        };
        this.destinatariosCargados = true;
        const max = data.maxVacantes || 10;
        this.cantidadOptions = Array.from({ length: max }, (_, i) => ({
          id: i + 1,
          nombre: String(i + 1).padStart(2, '0'),
        }));
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Aviso "a quién le llega esta solicitud" ────────────────────────
  get destinatariosPara(): DestinatarioSolicitud[] {
    return this.formData.destinatarios?.para ?? [];
  }

  get destinatariosCopias(): DestinatarioSolicitud[] {
    return this.formData.destinatarios?.copias ?? [];
  }

  /** Tooltip del correo: el nombre de la persona cuando se conoce, más por qué lo recibe. */
  etiquetaDestinatario(d: DestinatarioSolicitud): string {
    return d.nombre ? `${d.nombre} — ${d.origen}` : d.origen;
  }

  private nuevaVacante(): VacanteForm {
    return {
      puestoId: null,
      personalizado: false,
      puestoNombre: '',
      categoriaId: null,
      tipoRequerimientoId: null,
      reemplazaWorkerId: null,
      projectId: null,
      fecha: '',
    };
  }

  // ── Reemplazo: a quién se reemplaza ────────────────────────────────
  /** ¿La vacante es un reemplazo? Se decide por el código del catálogo, no por su nombre. */
  esReemplazo(v: VacanteForm): boolean {
    const tipo = this.formData.tiposRequerimiento.find((t) => t.id === v.tipoRequerimientoId);
    return tipo?.codigo === TIPO_REQUERIMIENTO_REEMPLAZO;
  }

  /**
   * Al dejar de ser un reemplazo se limpia el trabajador elegido: si no, quedaría enviándose un
   * dato que el usuario ya no ve (y que el backend descartaría igual).
   */
  onTipoRequerimientoChange(v: VacanteForm, tipoId: number | null): void {
    v.tipoRequerimientoId = tipoId;
    if (!this.esReemplazo(v)) v.reemplazaWorkerId = null;
  }

  /**
   * true cuando el área del solicitante no tiene trabajadores registrados: no hay de dónde elegir,
   * así que el campo se muestra vacío con su aviso y deja de exigirse (el backend hace lo mismo).
   */
  get sinTrabajadoresArea(): boolean {
    return this.formData.trabajadoresArea.length === 0;
  }

  /**
   * Cambia de modo el puesto de la vacante. Limpia lo del modo que se abandona para no enviar
   * datos de los dos (el backend ignora el puesto del desplegable cuando es personalizado, pero
   * dejarlos vivos haría que al desmarcar reapareciera una selección que el usuario ya no ve).
   */
  togglePersonalizado(v: VacanteForm, personalizado: boolean): void {
    v.personalizado = personalizado;
    if (personalizado) {
      v.puestoId = null;
    } else {
      v.puestoNombre = '';
      v.categoriaId = null;
    }
  }

  /** Ajusta la cantidad de bloques de vacante conservando los ya completados. */
  onCantidadChange(cantidad: number): void {
    this.cantidad = cantidad;
    if (cantidad > this.vacantes.length) {
      while (this.vacantes.length < cantidad) this.vacantes.push(this.nuevaVacante());
    } else if (cantidad < this.vacantes.length) {
      this.vacantes.length = cantidad;
    }
  }

  // ── Sustento (adjunto único opcional) ──────────────────────────────
  onSustentoSelected(file: SelectedFile): void {
    this.sustento = file; // reemplaza: solo un sustento por solicitud
  }

  quitarSustento(): void {
    this.sustento = null;
  }

  // ── Validación + envío ─────────────────────────────────────────────
  private get todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  save(): void {
    this.submitted = true;

    const errors: string[] = [];
    this.vacantes.forEach((v, i) => {
      const pref = `Vacante ${i + 1}`;
      if (v.personalizado) {
        if (!v.categoriaId) errors.push(`${pref}: categoría del puesto personalizado`);
        if (!v.puestoNombre.trim()) errors.push(`${pref}: nombre del puesto personalizado`);
      } else if (!v.puestoId) {
        errors.push(`${pref}: puesto`);
      }
      if (!v.tipoRequerimientoId) errors.push(`${pref}: tipo de requerimiento`);
      if (this.esReemplazo(v) && !this.sinTrabajadoresArea && !v.reemplazaWorkerId)
        errors.push(`${pref}: trabajador al que reemplaza`);
      if (!v.projectId) errors.push(`${pref}: proyecto/obra`);
      if (!v.fecha) errors.push(`${pref}: fecha requerida de ingreso`);
    });

    if (errors.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: 'var(--color-abril-standard)',
      });
      return;
    }

    const payload: SolicitudPersonalCreateDto = {
      justificacion: this.justificacion?.trim() || null,
      vacantes: this.vacantes.map<VacanteCreateDto>((v) => ({
        puestoId: v.personalizado ? null : v.puestoId,
        puestoPersonalizado: v.personalizado,
        puestoNombre: v.personalizado ? v.puestoNombre.trim() : null,
        categoriaId: v.personalizado ? v.categoriaId : null,
        tipoRequerimientoId: v.tipoRequerimientoId,
        reemplazaWorkerId: this.esReemplazo(v) ? v.reemplazaWorkerId : null,
        projectId: v.projectId,
        fechaRequeridaIngreso: v.fecha,
      })),
    };

    this.loaderService.show();
    this.service.create(payload, this.sustento?.file ?? null).subscribe({
      next: (res) => {
        this.loaderService.hide();
        // El correo al Gerente General es el que arranca el flujo: si no salió hay que avisarlo
        // como advertencia (la solicitud sí quedó registrada y se puede reenviar desde la tabla).
        Swal.fire({
          title: res.correoGerenciaEnviado ? 'Solicitud registrada' : 'Solicitud registrada sin correo',
          text: res.message,
          icon: res.correoGerenciaEnviado ? 'success' : 'warning',
          draggable: true,
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
