import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import {
  CatalogoDTO,
  ProyectoFiltroDTO,
  ReunionParticipanteInput,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';
import { ParticipanteAdd, ParticipanteSeleccionado } from '../participante-add/participante-add';
import { ConvocatoriaMasiva } from '../convocatoria-masiva/convocatoria-masiva';
import { AreaScopeService } from '../../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';

interface ParticipanteRow {
  workerId: number | null;
  nombre: string;
  cargo: string;
  iniciales: string;
  inicialesEditadas: boolean;
}

@Component({
  selector: 'app-reunion-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect, ParticipanteAdd, ConvocatoriaMasiva],
  templateUrl: './reunion-add.html',
})
export class ReunionAdd implements OnInit {
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  /** Trabajadores de Abril para los desplegables de "Convocado por" y participantes. */
  @Input() trabajadores: TrabajadorAbrilDTO[] = [];
  /** Temas predefinidos (catálogo reunion_tema) para el desplegable de "Tema de la reunión". */
  @Input() temas: CatalogoDTO[] = [];
  /** Preselecciona el proyecto (al agendar desde el detalle de otra reunión). */
  @Input() projectIdFijo: number | null = null;
  /** Reunión desde la que se promueve el tema de esta nueva reunión. */
  @Input() reunionAnteriorId: number | null = null;
  @Input() reunionAnteriorLabel = '';
  /** Participantes sugeridos (se copian de la reunión anterior). */
  @Input() set participantesSugeridos(value: ReunionParticipanteInput[] | null) {
    if (value?.length) {
      this.participantes = value.map((p) => ({
        workerId: p.workerId ?? null,
        nombre: p.nombre,
        cargo: p.cargo ?? '',
        iniciales: p.iniciales ?? '',
        inicialesEditadas: !!p.iniciales,
      }));
    }
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<number>();

  /** Alcance de la reunión: un proyecto puntual, un nodo del árbol de áreas/gerencias, o toda la organización. */
  tipoAmbito: 'PROYECTO' | 'AREA' | 'ORGANIZACION' = 'PROYECTO';

  projectId: number | null = null;

  /** Árbol completo (gerencias en la raíz, cada una con sus áreas/subáreas anidadas). */
  arbolAreaScope: AreaScopeTreeDto[] = [];
  /** Nodo elegido en cada nivel de la cascada (gerencia, luego área, luego subárea si existe). */
  areaScopePath: AreaScopeTreeDto[] = [];

  tema = '';
  /**
   * Con el checkbox activo el desplegable de temas se convierte en un campo de texto libre.
   * El tema escrito a mano solo se guarda en la reunión, no en el catálogo de temas.
   */
  temaPersonalizado = false;
  /** Si está activo, al agendar se agrega el tema personalizado al catálogo como tema recurrente. */
  guardarTemaComoRecurrente = false;
  convocadoPor = '';
  lugar = '';
  /** Con el checkbox activo, "Lugar" se convierte en texto libre en vez de elegir un proyecto. */
  lugarPersonalizado = false;
  fecha: string | null = null;
  horaInicio = '';
  horaFin = '';

  participantes: ParticipanteRow[] = [];
  showParticipanteModal = false;
  showConvocatoriaMasivaModal = false;

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.projectIdFijo != null) this.projectId = this.projectIdFijo;
    this.areaScopeService.getTree().subscribe({
      next: (data) => (this.arbolAreaScope = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onTipoAmbitoChange(): void {
    this.projectId = null;
    this.areaScopePath = [];
  }

  /** Un select por nivel: raíz (gerencias) y luego los hijos del nodo elegido en el nivel anterior. */
  get nivelesAreaScope(): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbolAreaScope];
    let actual = this.areaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = this.areaScopePath[i];
    }
    return niveles;
  }

  onNivelAreaScopeChange(nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesAreaScope[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    this.areaScopePath = this.areaScopePath.slice(0, nivel);
    if (nodo) this.areaScopePath.push(nodo);
  }

  get areaScopeIdSeleccionado(): number | null {
    return this.areaScopePath.length > 0
      ? this.areaScopePath[this.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /**
   * Opciones del desplegable "Convocado por": los trabajadores de Abril más, si hace
   * falta, el valor actual (por si viene precargado y no está en la lista).
   */
  get opcionesConvocadoPor(): TrabajadorAbrilDTO[] {
    const actual = this.convocadoPor.trim();
    if (!actual || this.trabajadores.some((t) => t.fullName === actual)) return this.trabajadores;
    return [{ workerId: 0, fullName: actual, cargo: null }, ...this.trabajadores];
  }

  get inicialesActuales(): string[] {
    return this.participantes.map((p) => p.iniciales).filter(Boolean);
  }

  /** Al alternar entre desplegable y texto libre se limpia el tema para no mezclar valores. */
  onTemaPersonalizadoChange(): void {
    this.tema = '';
    this.guardarTemaComoRecurrente = false;
  }

  /**
   * Al elegir un tema del catálogo, si tiene una convocatoria recurrente configurada
   * (área/puestos habituales), se agregan automáticamente esos trabajadores como
   * participantes sugeridos — sin pisar a los que ya se hayan agregado a mano.
   */
  onTemaSeleccionado(valor: string | null): void {
    this.tema = valor ?? '';
    const temaElegido = this.temas.find((t) => t.descripcion === this.tema);
    if (!temaElegido) return;

    this.service.getConvocatoriaTema(temaElegido.id).subscribe({
      next: (convocatoria) => {
        if (convocatoria.areaScopeId == null && convocatoria.puestoIds.length === 0) return;
        this.service.buscarTrabajadoresPorFiltro(convocatoria.areaScopeId, convocatoria.puestoIds).subscribe({
          next: (trabajadores) => this.onTrabajadoresAgregadosMasivamente(trabajadores),
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  onLugarPersonalizadoChange(): void {
    this.lugar = '';
  }

  addParticipante(): void {
    this.showParticipanteModal = true;
  }

  onParticipanteAgregado(p: ParticipanteSeleccionado): void {
    this.participantes.push({
      workerId: p.workerId,
      nombre: p.nombre,
      cargo: p.cargo,
      iniciales: p.iniciales,
      inicialesEditadas: !!p.iniciales,
    });
    this.showParticipanteModal = false;
  }

  removeParticipante(index: number): void {
    this.participantes.splice(index, 1);
  }

  abrirConvocatoriaMasiva(): void {
    this.showConvocatoriaMasivaModal = true;
  }

  onTrabajadoresAgregadosMasivamente(trabajadores: TrabajadorAbrilDTO[]): void {
    const yaAgregados = new Set(
      this.participantes.filter((p) => p.workerId != null).map((p) => p.workerId),
    );
    for (const t of trabajadores) {
      if (yaAgregados.has(t.workerId)) continue;
      this.participantes.push({
        workerId: t.workerId,
        nombre: t.fullName,
        cargo: t.cargo ?? '',
        iniciales: this.generarIniciales(t.fullName),
        inicialesEditadas: false,
      });
      yaAgregados.add(t.workerId);
    }
    this.showConvocatoriaMasivaModal = false;
  }

  /** Autogenera iniciales a partir del nombre mientras el usuario no las haya editado. */
  onNombreChange(row: ParticipanteRow): void {
    if (row.inicialesEditadas) return;
    row.iniciales = this.generarIniciales(row.nombre);
  }

  onInicialesChange(row: ParticipanteRow): void {
    row.inicialesEditadas = true;
  }

  private generarIniciales(nombre: string): string {
    const base = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
    if (!base) return '';
    // Evita iniciales duplicadas dentro de la misma reunión (ej. "MC", "MC 2")
    const repetidas = this.participantes.filter(
      (p) => p.iniciales === base || p.iniciales.startsWith(base + ' '),
    ).length;
    return repetidas > 0 ? `${base} ${repetidas + 1}` : base;
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.tipoAmbito === 'PROYECTO' && this.projectId == null) errors.push('Proyecto');
    if (this.tipoAmbito === 'AREA' && this.areaScopeIdSeleccionado == null) errors.push('Área/gerencia');
    if (!this.tema.trim()) errors.push('Tema de la reunión');
    if (!this.fecha) errors.push('Fecha de la reunión');
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio)
      errors.push('La hora de término debe ser mayor a la hora de inicio');
    return errors;
  }

  submit(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        html: `<ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const participantes: ReunionParticipanteInput[] = this.participantes
      .filter((p) => p.nombre.trim())
      .map((p) => ({
        reunionParticipanteId: null,
        workerId: p.workerId,
        nombre: p.nombre.trim(),
        cargo: p.cargo.trim() || null,
        iniciales: p.iniciales.trim() || null,
        asistio: false,
      }));

    if (this.temaPersonalizado && this.guardarTemaComoRecurrente) {
      this.service.agregarTema(this.tema.trim()).subscribe({ error: () => {} });
    }

    this.loaderService.show();
    this.service
      .create({
        projectId: this.tipoAmbito === 'PROYECTO' ? this.projectId! : null,
        areaScopeId: this.tipoAmbito === 'AREA' ? this.areaScopeIdSeleccionado : null,
        tema: this.tema.trim(),
        convocadoPor: this.convocadoPor.trim() || null,
        lugar: this.lugar.trim() || null,
        fecha: this.fecha!,
        horaInicio: this.horaInicio ? `${this.horaInicio}:00` : null,
        horaFin: this.horaFin ? `${this.horaFin}:00` : null,
        reunionAnteriorId: this.reunionAnteriorId,
        participantes,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: '¡Reunión agendada!',
            text: 'La reunión fue agendada correctamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          this.created.emit(res.reunionId);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
