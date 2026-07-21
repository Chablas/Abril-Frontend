import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CorreosService } from '../services/correos.service';
import {
  CorreoAreaOption,
  CorreoEvento,
  CorreoRegla,
  CorreoReglaInput,
  CorreoTipoCodigo,
  CorreoWorkerOption,
} from '../dtos/ga-correo.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SectionTabs, SectionTab } from '../../../../../../shared/components/section-tabs/section-tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

/** Fila editable de un destinatario (inclusión o exclusión). */
interface FilaCorreo {
  tipoCodigo: CorreoTipoCodigo;
  workerId: number | null;
  areaScopeId: number | null;
  correo: string;
  incluirDescendientes: boolean;
  active: boolean;
}

/** Estado editable de un correo: sus dos listas de filas. */
interface EstadoCorreo {
  incluir: FilaCorreo[];
  excluir: FilaCorreo[];
}

/**
 * Sección "Correos" de la Configuración de Gestión Administrativa.
 *
 * Por cada correo del flujo de salidas (Revisor, Confirmación, Aprobada, Rechazada)
 * define a quién SÍ se envía ("Se enviará a") y a quién NUNCA se envía ("Nunca se
 * enviará a"). La exclusión gana aunque el destinatario esté en la lista de envío.
 * Cada destinatario es un trabajador, un área (se expande a sus miembros) o un correo
 * escrito a mano (ej. un grupo de correos como gthnm@abril.pe).
 */
@Component({
  selector: 'app-ga-correos',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionTabs, SearchSelect],
  templateUrl: './correos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaCorreos implements OnInit {
  eventos: CorreoEvento[] = [];
  trabajadores: CorreoWorkerOption[] = [];
  areas: CorreoAreaOption[] = [];

  /** Estado editable por código de correo. */
  estado: Record<string, EstadoCorreo> = {};
  activeCodigo: string | null = null;

  guardando = false;

  // Contrato del contenedor GaConfiguracion (esta sección no tiene filtros).
  filtrosActivos = 0;
  filtrosAbiertos = false;

  /** Etiquetas cortas para las pestañas internas. */
  private readonly labelCorto: Record<string, string> = {
    REVISOR: 'Revisor',
    CONFIRMACION: 'Confirmación',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
  };

  constructor(
    private service: CorreosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
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

        this.estado = {};
        for (const ev of this.eventos) {
          this.estado[ev.codigo] = {
            incluir: (ev.incluir ?? []).map(this.reglaAFila),
            excluir: (ev.excluir ?? []).map(this.reglaAFila),
          };
        }
        this.activeCodigo = this.eventos[0]?.codigo ?? null;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Calcula la etiqueta de cada área para el desplegable. Si dos áreas comparten nombre
   * (ej. dos nodos "Gestión del Talento Humano"), desambigua con el nombre del padre; si no
   * hay padre, usa el correo de grupo del área.
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

  private reglaAFila = (r: CorreoRegla): FilaCorreo => ({
    tipoCodigo: r.tipoCodigo,
    workerId: r.workerId ?? null,
    areaScopeId: r.areaScopeId ?? null,
    correo: r.correo ?? '',
    incluirDescendientes: r.incluirDescendientes,
    active: r.active,
  });

  // ── Pestañas internas ────────────────────────────────────────────────────

  get sectionTabs(): SectionTab[] {
    return this.eventos.map((e) => ({ id: e.codigo, label: this.labelCorto[e.codigo] ?? e.nombre }));
  }

  get activeEvento(): CorreoEvento | undefined {
    return this.eventos.find((e) => e.codigo === this.activeCodigo);
  }

  get activeEstado(): EstadoCorreo | undefined {
    return this.activeCodigo ? this.estado[this.activeCodigo] : undefined;
  }

  onTabChange(codigo: string): void {
    this.activeCodigo = codigo;
  }

  // ── Edición de filas ───────────────────────────────────────────────────────

  agregar(lista: FilaCorreo[]): void {
    lista.push({
      tipoCodigo: 'TRABAJADOR',
      workerId: null,
      areaScopeId: null,
      correo: '',
      incluirDescendientes: true,
      active: true,
    });
  }

  quitar(lista: FilaCorreo[], i: number): void {
    lista.splice(i, 1);
  }

  /** Cambia el tipo de destinatario de una fila y limpia los campos que no aplican. */
  setTipo(fila: FilaCorreo, tipo: CorreoTipoCodigo): void {
    fila.tipoCodigo = tipo;
    fila.workerId = null;
    fila.areaScopeId = null;
    fila.correo = '';
    fila.incluirDescendientes = true;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  guardar(): void {
    const codigo = this.activeCodigo;
    const est = this.activeEstado;
    if (!codigo || !est) return;

    const incompleta = (f: FilaCorreo): boolean => {
      if (f.tipoCodigo === 'TRABAJADOR') return f.workerId == null;
      if (f.tipoCodigo === 'AREA') return f.areaScopeId == null;
      return !f.correo.trim();
    };

    if (est.incluir.some(incompleta) || est.excluir.some(incompleta)) {
      Swal.fire({
        icon: 'warning',
        title: 'Filas incompletas',
        text: 'Completa el trabajador, área o correo de cada fila, o quita las filas vacías.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    const toInput = (f: FilaCorreo): CorreoReglaInput => ({
      tipoCodigo: f.tipoCodigo,
      workerId: f.tipoCodigo === 'TRABAJADOR' ? f.workerId : null,
      areaScopeId: f.tipoCodigo === 'AREA' ? f.areaScopeId : null,
      correo: f.tipoCodigo === 'CORREO' ? f.correo.trim() : null,
      incluirDescendientes: f.incluirDescendientes,
      active: f.active,
    });

    this.guardando = true;
    this.loaderService.show();
    this.service
      .updateReglas(codigo, {
        incluir: est.incluir.map(toInput),
        excluir: est.excluir.map(toInput),
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: res?.message ?? 'Destinatarios actualizados.',
            timer: 1800,
            showConfirmButton: false,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
