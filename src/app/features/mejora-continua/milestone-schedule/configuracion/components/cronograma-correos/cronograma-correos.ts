import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CronogramaConfiguracionService } from '../../services/cronograma-configuracion.service';
import {
  CronogramaCorreo,
  CronogramaDestinatario,
  CronogramaOpcion,
  CronogramaRolOpcion,
  CronogramaTrabajadorOpcion,
  Recepcion,
  TipoDestinatario,
} from '../../dtos/cronograma-configuracion.dto';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SectionTab, SectionTabs } from '../../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

/**
 * Los correos de una sección de la configuración del cronograma (Correos o Recordatorios): una
 * subsección por correo, con su interruptor (apagado = no se envía a nadie) y su lista de
 * destinatarios, cada uno con su propio interruptor — incluido el que pone el sistema (el
 * residente), que no es una fila de la lista sino una propiedad del correo.
 *
 * Mismo aspecto que la configuración de correos de Solicitud de Salidas: usa su hoja de estilos
 * compartida (`shared/styles/correos-config.css`). Lo que suma acá es «Recibe como» por fila
 * (Para, CC o CCO), porque los correos del cronograma ya salían repartidos así.
 *
 * Todo guarda al tocarlo: los interruptores son optimistas y se revierten si falla; el alta, la
 * edición y la baja repintan el correo con lo que devuelve el backend.
 */
@Component({
  selector: 'app-cronograma-correos',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SectionTabs, SearchSelect],
  templateUrl: './cronograma-correos.html',
  styleUrl: '../../../../../../shared/styles/correos-config.css',
  // Lo propio de esta pantalla: la copia oculta. El resto sale de la hoja compartida.
  styles: [`
    .pill--cco {
      color: #475569;
      background: #e2e8f0;
    }
  `],
})
export class CronogramaCorreos implements OnChanges {
  @Input({ required: true }) correos: CronogramaCorreo[] = [];
  /** Sección Recordatorios: cambia cómo se nombra el interruptor, nada más. */
  @Input() recordatorios = false;
  @Input() trabajadores: CronogramaTrabajadorOpcion[] = [];
  @Input() roles: CronogramaRolOpcion[] = [];
  @Input() tipos: CronogramaOpcion[] = [];
  @Input() recepciones: CronogramaOpcion[] = [];

  /** Código del correo cuya subsección se está viendo. */
  correoActivoCodigo: string | null = null;

  /** Código del correo cuyo interruptor se está guardando. */
  savingCorreoCodigo: string | null = null;
  /** id del destinatario que se está guardando. 0 = el del sistema. */
  savingDestinatarioId: number | null = null;

  // ── Modal de alta/edición ──
  formOpen = false;
  /** null = alta. */
  formId: number | null = null;
  formTipo: TipoDestinatario = 'TRABAJADOR';
  formRecepcion: Recepcion = 'CC';
  formWorkerId: number | null = null;
  formRoleId: number | null = null;
  formCorreo = '';
  formError: string | null = null;
  saving = false;

  private static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  constructor(
    private service: CronogramaConfiguracionService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Al cambiar de sección llegan otros correos: si el abierto no está entre ellos, va el primero. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['correos'] && !this.correos.some((c) => c.codigo === this.correoActivoCodigo)) {
      this.correoActivoCodigo = this.correos[0]?.codigo ?? null;
    }
  }

  // ── Subsecciones ─────────────────────────────────────────────────────────

  /** Una por correo, siempre (aunque la sección tenga uno solo), con cuántos lo reciben hoy. */
  get tabs(): SectionTab[] {
    return this.correos.map((c) => ({
      id: c.codigo,
      label: c.nombre,
      badge: c.active ? this.destinatariosActivos(c) : 'Off',
    }));
  }

  get correoActivo(): CronogramaCorreo | null {
    return this.correos.find((c) => c.codigo === this.correoActivoCodigo) ?? null;
  }

  onTabChange(codigo: string): void {
    this.correoActivoCodigo = codigo;
    this.cdr.detectChanges();
  }

  private destinatariosActivos(correo: CronogramaCorreo): number {
    const principal = correo.principalNombre && correo.principalActive ? 1 : 0;
    return principal + correo.destinatarios.filter((d) => d.active).length;
  }

  /** Prendido pero sin nadie a quien mandárselo. */
  get sinDestinatarios(): boolean {
    const c = this.correoActivo;
    return !!c && c.active && this.destinatariosActivos(c) === 0;
  }

  // ── Vocabulario de la sección ────────────────────────────────────────────

  get icono(): string {
    return this.recordatorios ? 'ti-bell' : 'ti-mail';
  }

  get iconoApagado(): string {
    return this.recordatorios ? 'ti-bell-off' : 'ti-mail-off';
  }

  get labelInterruptor(): string {
    const sustantivo = this.recordatorios ? 'Recordatorio' : 'Correo';
    return `${sustantivo} ${this.correoActivo?.active ? 'activo' : 'desactivado'}`;
  }

  get textoApagado(): string {
    return this.recordatorios
      ? 'Desactivado: este recordatorio no se envía a nadie.'
      : 'Desactivado: este correo no se envía a nadie.';
  }

  recepcionLabel(codigo: Recepcion): string {
    return this.recepciones.find((r) => r.codigo === codigo)?.nombre ?? codigo;
  }

  recepcionClase(codigo: Recepcion): string {
    return codigo === 'PARA' ? 'pill' : codigo === 'CC' ? 'pill pill--cc' : 'pill pill--cco';
  }

  tipoLabel(codigo: TipoDestinatario): string {
    return codigo === 'TRABAJADOR' ? 'Trabajador' : codigo === 'ROL' ? 'Rol' : 'Correo';
  }

  // ── Interruptores ────────────────────────────────────────────────────────

  toggleCorreo(correo: CronogramaCorreo): void {
    if (this.savingCorreoCodigo !== null) return;
    const nuevo = !correo.active;
    this.savingCorreoCodigo = correo.codigo;
    correo.active = nuevo;

    this.service.setCorreoActive(correo.codigo, nuevo).subscribe({
      next: () => {
        this.savingCorreoCodigo = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        correo.active = !nuevo;
        this.savingCorreoCodigo = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  togglePrincipal(correo: CronogramaCorreo): void {
    if (this.savingDestinatarioId !== null) return;
    const nuevo = !correo.principalActive;
    this.savingDestinatarioId = 0;
    correo.principalActive = nuevo;

    this.service.setPrincipalActive(correo.codigo, nuevo).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        correo.principalActive = !nuevo;
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  toggleDestinatario(fila: CronogramaDestinatario): void {
    if (this.savingDestinatarioId !== null) return;
    const nuevo = !fila.active;
    this.savingDestinatarioId = fila.id;
    fila.active = nuevo;

    this.service.setDestinatarioActive(fila.id, nuevo).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        fila.active = !nuevo;
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Alta / edición ───────────────────────────────────────────────────────

  abrirAlta(): void {
    this.formId = null;
    this.formTipo = 'TRABAJADOR';
    this.formRecepcion = 'CC';
    this.formWorkerId = null;
    this.formRoleId = null;
    this.formCorreo = '';
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  abrirEdicion(fila: CronogramaDestinatario): void {
    this.formId = fila.id;
    this.formTipo = fila.tipoCodigo;
    this.formRecepcion = fila.recepcionCodigo;
    this.formWorkerId = fila.workerId;
    this.formRoleId = fila.roleId;
    this.formCorreo = fila.tipoCodigo === 'CORREO' ? (fila.email ?? '') : '';
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  cerrarForm(): void {
    if (this.saving) return;
    this.formOpen = false;
    this.cdr.detectChanges();
  }

  get formTitulo(): string {
    return this.formId === null ? 'Agregar destinatario' : 'Editar destinatario';
  }

  /** Al cambiar de tipo se limpia lo que ya no aplica: la fila guarda un solo dato. */
  onFormTipoChange(tipo: TipoDestinatario): void {
    this.formTipo = tipo;
    this.formWorkerId = null;
    this.formRoleId = null;
    this.formCorreo = '';
    this.cdr.detectChanges();
  }

  get formValido(): boolean {
    if (this.formTipo === 'TRABAJADOR') return this.formWorkerId != null;
    if (this.formTipo === 'ROL') return this.formRoleId != null;
    return CronogramaCorreos.EMAIL_RE.test(this.formCorreo.trim());
  }

  guardarForm(): void {
    const correo = this.correoActivo;
    if (!correo || !this.formValido || this.saving) return;

    this.saving = true;
    this.formError = null;

    const dto = {
      tipoCodigo: this.formTipo,
      recepcionCodigo: this.formRecepcion,
      workerId: this.formTipo === 'TRABAJADOR' ? this.formWorkerId : null,
      roleId: this.formTipo === 'ROL' ? this.formRoleId : null,
      correo: this.formTipo === 'CORREO' ? this.formCorreo.trim().toLowerCase() : null,
    };

    const request$ =
      this.formId === null
        ? this.service.crearDestinatario(correo.codigo, dto)
        : this.service.actualizarDestinatario(this.formId, dto);

    request$.subscribe({
      next: (actualizado) => {
        this.reemplazar(correo, actualizado);
        this.saving = false;
        this.formOpen = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400 y 409 traen un mensaje útil (repetido, correo inválido): va dentro del modal.
        if (err.status === 400 || err.status === 409) {
          this.formError = err.error?.message ?? 'No se pudo guardar el destinatario.';
        } else {
          this.errorService.handleError(err);
        }
        this.cdr.detectChanges();
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────

  async eliminar(fila: CronogramaDestinatario): Promise<void> {
    const correo = this.correoActivo;
    if (!correo || this.savingDestinatarioId !== null) return;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar destinatario?',
      text: `${fila.nombre} dejará de recibir «${correo.nombre}».`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmacion.isConfirmed) return;

    this.savingDestinatarioId = fila.id;
    this.service.eliminarDestinatario(fila.id).subscribe({
      next: (actualizado) => {
        this.reemplazar(correo, actualizado);
        this.savingDestinatarioId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Repinta el correo con lo que devolvió el backend (el objeto es el mismo que tiene la página). */
  private reemplazar(correo: CronogramaCorreo, actualizado: CronogramaCorreo): void {
    Object.assign(correo, actualizado);
  }

  trackFila(_: number, fila: CronogramaDestinatario): number {
    return fila.id;
  }
}
