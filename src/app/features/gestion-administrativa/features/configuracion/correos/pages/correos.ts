import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CorreosService } from '../services/correos.service';
import {
  CorreoAreaOption,
  CorreoDestinatario,
  CorreoEvento,
  CorreoTipoCodigo,
  CorreoWorkerOption,
} from '../dtos/ga-correo.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SectionTabs, SectionTab } from '../../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

/**
 * Sección "Correos" de la Configuración de Gestión Administrativa.
 *
 * Una sección por cada correo del flujo de salidas, con su interruptor maestro (apagado = ese
 * correo no se envía a nadie) y la matriz de sus destinatarios, cada uno con su propio
 * interruptor — incluido el destinatario principal (el revisor de la solicitud, el solicitante),
 * que no es una fila de la tabla de reglas sino una propiedad del propio correo.
 *
 * Es la misma pantalla que la configuración de correos de Gestión GTH y comparte su hoja de
 * estilos (`shared/styles/correos-config.css`). Lo que cambia es el dato: acá un destinatario
 * puede ser un trabajador, un área (se expande a sus miembros) o un correo escrito a mano.
 *
 * Todo guarda al momento de tocarlo: los interruptores son optimistas y se revierten si el
 * guardado falla; el alta, la edición y la baja recargan la lista.
 *
 * La lista "nunca se enviará a" se dio de baja en septiembre de 2026: nunca quedaba registro de
 * por qué alguien estaba excluido, y la misma exclusión se logra apagando o quitando su fila.
 */
@Component({
  selector: 'app-ga-correos',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SectionTabs, SearchSelect],
  templateUrl: './correos.html',
  styleUrl: '../../../../../../shared/styles/correos-config.css',
  // Lo propio de esta pantalla: el resto del look sale de la hoja compartida.
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: auto; }

    /* "Incluir sub-áreas": solo aparece con el tipo Área, dentro del modal. */
    .form-check {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: -4px 0 14px;
      font-size: 0.82rem;
      color: #475569;
      cursor: pointer;
      user-select: none;
    }
    .form-check input {
      width: 15px;
      height: 15px;
      accent-color: var(--color-abril-standard, #0f6e56);
      cursor: pointer;
    }
  `],
})
export class GaCorreos implements OnInit {
  eventos: CorreoEvento[] = [];
  trabajadores: CorreoWorkerOption[] = [];
  areas: CorreoAreaOption[] = [];
  loading = false;

  /** Código del correo cuya sección se está viendo. */
  eventoActivoCodigo: string | null = null;

  /** id del destinatario que se está guardando, para bloquear su fila. 0 = el principal. */
  savingDestinatarioId: number | null = null;
  /** Código del correo cuyo interruptor maestro se está guardando. */
  savingEventoCodigo: string | null = null;

  // Contrato del contenedor GaConfiguracion (esta sección no tiene filtros).
  filtrosActivos = 0;
  filtrosAbiertos = false;

  // ── Modal de alta/edición de un destinatario ──
  formOpen = false;
  /** null = alta; distinto de null = edición. */
  formId: number | null = null;
  formTipo: CorreoTipoCodigo = 'TRABAJADOR';
  formWorkerId: number | null = null;
  formAreaScopeId: number | null = null;
  formCorreo = '';
  formIncluirDescendientes = true;
  formError: string | null = null;
  saving = false;

  /** Opciones de "Tipo de destinatario". Orden deliberado → `sortAlpha` en false. */
  readonly tipoOptions: { id: CorreoTipoCodigo; label: string }[] = [
    { id: 'TRABAJADOR', label: 'Trabajador' },
    { id: 'AREA', label: 'Área' },
    { id: 'CORREO', label: 'Correo escrito a mano' },
  ];

  private static readonly EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  /**
   * Etiquetas cortas para las pestañas. Las pestañas salen de ga_correo_evento, así que un correo
   * nuevo aparece solo: sin entrada acá se muestra con su nombre completo.
   */
  private readonly labelCorto: Record<string, string> = {
    REVISOR: 'Revisor',
    CONFIRMACION: 'Confirmación',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    S10_REVISOR: 'S10 al revisor',
    REEMBOLSO_APROBADO: 'Reembolso OK',
    REEMBOLSO_RECHAZADO: 'Reembolso observado',
  };

  constructor(
    private service: CorreosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getInicial().subscribe({
      next: (data) => {
        this.eventos = data.eventos ?? [];
        this.trabajadores = (data.trabajadores ?? []).sort((a, b) =>
          (a.fullName ?? '').localeCompare(b.fullName ?? ''),
        );
        this.areas = this.conEtiquetas(data.areas ?? []).sort((a, b) =>
          (a.label ?? a.nombre).localeCompare(b.label ?? b.nombre),
        );

        if (!this.eventos.some((e) => e.codigo === this.eventoActivoCodigo))
          this.eventoActivoCodigo = this.eventos[0]?.codigo ?? null;

        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Calcula la etiqueta de cada área para el desplegable. Si dos áreas comparten nombre
   * (ej. dos nodos "Producción"), desambigua con el nombre del padre; si no hay padre, usa el
   * correo de grupo del área.
   */
  private conEtiquetas(areas: CorreoAreaOption[]): CorreoAreaOption[] {
    const conteo = new Map<string, number>();
    for (const a of areas) conteo.set(a.nombre, (conteo.get(a.nombre) ?? 0) + 1);
    const porId = new Map(areas.map((a) => [a.areaScopeId, a] as const));

    return areas.map((a) => {
      let label = a.nombre;
      if ((conteo.get(a.nombre) ?? 0) > 1) {
        const padre = a.parentId != null ? porId.get(a.parentId) : undefined;
        if (padre) label = `${a.nombre} — ${padre.nombre}`;
        else if (a.email) label = `${a.nombre} — ${a.email}`;
      }
      return { ...a, label };
    });
  }

  // ── Secciones ────────────────────────────────────────────────────────────

  get sectionTabs(): SectionTab[] {
    return this.eventos.map((e) => ({
      id: e.codigo,
      label: this.labelCorto[e.codigo] ?? e.nombre,
      badge: e.active ? this.destinatariosActivos(e) : 'Off',
    }));
  }

  get eventoActivo(): CorreoEvento | null {
    return this.eventos.find((e) => e.codigo === this.eventoActivoCodigo) ?? null;
  }

  onSectionChange(codigo: string): void {
    this.eventoActivoCodigo = codigo;
    this.cdr.detectChanges();
  }

  /** Cuántos destinatarios reciben ese correo hoy (contando al principal). */
  private destinatariosActivos(evento: CorreoEvento): number {
    const principal = evento.destinatarioPrincipalActivo ? 1 : 0;
    return principal + evento.destinatarios.filter((d) => d.active).length;
  }

  /** El correo está prendido pero no tiene a quién mandárselo. */
  get sinDestinatarios(): boolean {
    const e = this.eventoActivo;
    return !this.loading && !!e && e.active && this.destinatariosActivos(e) === 0;
  }

  // ── Interruptor maestro del correo ───────────────────────────────────────

  toggleEvento(evento: CorreoEvento): void {
    if (this.savingEventoCodigo !== null || !evento.permiteDesactivarEnvio) return;

    const nuevo = !evento.active;
    this.savingEventoCodigo = evento.codigo;
    // Optimista: se pinta al toque y se revierte si el guardado falla.
    evento.active = nuevo;

    this.service.setEventoActive(evento.codigo, nuevo).subscribe({
      next: () => {
        this.savingEventoCodigo = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        evento.active = !nuevo;
        this.savingEventoCodigo = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Interruptor de un destinatario ───────────────────────────────────────

  /** Interruptor del destinatario principal: va por el código del correo, no por un id. */
  togglePrincipal(evento: CorreoEvento): void {
    if (this.savingDestinatarioId !== null || !evento.permiteDesactivarPrincipal) return;

    const nuevo = !evento.destinatarioPrincipalActivo;
    this.savingDestinatarioId = 0;
    evento.destinatarioPrincipalActivo = nuevo;

    this.service.setPrincipalActive(evento.codigo, nuevo).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        evento.destinatarioPrincipalActivo = !nuevo;
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  toggleDestinatario(fila: CorreoDestinatario): void {
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
    this.formWorkerId = null;
    this.formAreaScopeId = null;
    this.formCorreo = '';
    this.formIncluirDescendientes = true;
    this.formError = null;
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  abrirEdicion(fila: CorreoDestinatario): void {
    this.formId = fila.id;
    this.formTipo = fila.tipoCodigo;
    this.formWorkerId = fila.workerId;
    this.formAreaScopeId = fila.areaScopeId;
    this.formCorreo = fila.tipoCodigo === 'CORREO' ? (fila.email ?? '') : '';
    this.formIncluirDescendientes = fila.incluirDescendientes;
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
  onFormTipoChange(tipo: CorreoTipoCodigo): void {
    this.formTipo = tipo;
    this.formWorkerId = null;
    this.formAreaScopeId = null;
    this.formCorreo = '';
    this.formIncluirDescendientes = true;
    this.cdr.detectChanges();
  }

  get formValido(): boolean {
    if (this.formTipo === 'TRABAJADOR') return this.formWorkerId != null;
    if (this.formTipo === 'AREA') return this.formAreaScopeId != null;
    return GaCorreos.EMAIL_RE.test(this.formCorreo.trim());
  }

  guardarForm(): void {
    if (!this.formValido || this.saving) return;
    const codigo = this.eventoActivoCodigo;
    if (!codigo) return;

    this.saving = true;
    this.formError = null;

    const dto = {
      tipoCodigo: this.formTipo,
      workerId: this.formTipo === 'TRABAJADOR' ? this.formWorkerId : null,
      areaScopeId: this.formTipo === 'AREA' ? this.formAreaScopeId : null,
      correo: this.formTipo === 'CORREO' ? this.formCorreo.trim().toLowerCase() : null,
      incluirDescendientes: this.formTipo === 'AREA' ? this.formIncluirDescendientes : true,
    };

    const request$ =
      this.formId === null
        ? this.service.crearDestinatario(codigo, dto)
        : this.service.actualizarDestinatario(this.formId, dto);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        // 400/409 traen un mensaje útil (destinatario repetido, correo inválido): se muestra
        // dentro del modal en vez de cerrarlo con un alert genérico.
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

  async eliminar(fila: CorreoDestinatario): Promise<void> {
    if (this.savingDestinatarioId !== null) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar destinatario?',
      text: `${fila.nombre} dejará de recibir «${this.eventoActivo?.nombre}».`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    this.savingDestinatarioId = fila.id;
    this.service.eliminarDestinatario(fila.id).subscribe({
      next: () => {
        this.savingDestinatarioId = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.savingDestinatarioId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  /** Etiqueta del tipo para la columna "Recibe como" de la matriz. */
  tipoLabel(fila: CorreoDestinatario): string {
    switch (fila.tipoCodigo) {
      case 'TRABAJADOR': return 'Trabajador';
      case 'AREA': return 'Área';
      default: return 'Correo';
    }
  }

  trackFila(_: number, f: CorreoDestinatario): number {
    return f.id;
  }
}
