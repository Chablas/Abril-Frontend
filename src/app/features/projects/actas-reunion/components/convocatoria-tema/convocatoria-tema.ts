import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';
import {
  ProyectoFiltroDTO,
  TemaConvocatoriaReglaInput,
  TemaConvocatoriaSaveRequest,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';

interface PuestoRow {
  id: number;
  descripcion: string;
  marcado: boolean;
}

/** Una regla de convocatoria en edición: a quién convoca (área/gerencia y/o proyecto + puestos). */
interface ReglaConvocatoria {
  areaScopePath: AreaScopeTreeDto[];
  puestos: PuestoRow[];
  filtroPuesto: string;
  projectId: number | null;
}

export interface ConvocatoriaTemaResultado {
  config: TemaConvocatoriaSaveRequest;
  trabajadores: TrabajadorAbrilDTO[];
}

/**
 * Modal para configurar la convocatoria recurrente de un tema (varias reglas independientes de
 * área/proyecto + puestos que se convocan siempre, y si requiere agenda fija o dinámica), en vez
 * de amontonar todos estos campos dentro del formulario de "Agendar reunión". Se abre al marcar
 * "Guardar como tema recurrente". Ej.: "Reunión de Jefaturas de Proyectos" puede convocar a la vez
 * a los Jefes de Proyectos de su gerencia Y al Gerente Inmobiliario de otra — dos reglas, no una.
 */
@Component({
  selector: 'app-convocatoria-tema',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './convocatoria-tema.html',
})
export class ConvocatoriaTema {
  /** Árbol completo de áreas/gerencias, ya cargado por el padre. */
  @Input() arbol: AreaScopeTreeDto[] = [];
  /** Proyectos disponibles para el filtro "Staff de un proyecto" de cada regla. */
  @Input() proyectos: ProyectoFiltroDTO[] = [];

  /** Configuración previa, al reabrir el modal para editar (null = arranca en blanco). */
  @Input() set inicial(value: TemaConvocatoriaSaveRequest | null) {
    if (!value) return;
    this.agendaFija = value.agendaFija;
    this.agendaTexto = value.agendaTexto ?? '';
    this.recordatorioHorasAntes = value.recordatorioHorasAntes;
    this.reglas =
      value.reglas.length > 0
        ? value.reglas.map((r) => this.reglaDesde(r.areaScopeId, r.projectId, r.puestoIds))
        : [this.reglaVacia()];
    this.reglas.forEach((r) => this.cargarPuestos(r));
    this.previsualizar();
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<ConvocatoriaTemaResultado>();

  reglas: ReglaConvocatoria[] = [this.reglaVacia()];

  agendaFija = false;
  agendaTexto = '';
  recordatorioHorasAntes: number | null = null;

  /** Previsualización en vivo de a quién se agregaría como participante con las reglas elegidas. */
  trabajadoresPreview: TrabajadorAbrilDTO[] = [];
  buscando = false;
  private previewTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private service: ActasReunionService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  private reglaVacia(): ReglaConvocatoria {
    return { areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null };
  }

  private reglaDesde(areaScopeId: number | null, projectId: number | null, puestoIds: number[]): ReglaConvocatoria {
    return {
      areaScopePath: areaScopeId != null ? this.buscarRuta(this.arbol, areaScopeId) ?? [] : [],
      puestos: puestoIds.map((id) => ({ id, descripcion: '', marcado: true })), // se completa en cargarPuestos
      filtroPuesto: '',
      projectId,
    };
  }

  /** Busca la cadena de nodos (raíz → hoja) que llega al area_scope_id dado, para preseleccionar la cascada al editar. */
  private buscarRuta(nodos: AreaScopeTreeDto[], areaScopeId: number): AreaScopeTreeDto[] | null {
    for (const nodo of nodos) {
      if (nodo.areaScopeId === areaScopeId) return [nodo];
      const ruta = this.buscarRuta(nodo.children, areaScopeId);
      if (ruta) return [nodo, ...ruta];
    }
    return null;
  }

  agregarRegla(): void {
    const regla = this.reglaVacia();
    this.reglas.push(regla);
    this.cargarPuestos(regla);
  }

  removerRegla(index: number): void {
    this.reglas.splice(index, 1);
    this.previsualizar();
  }

  private areaScopeIdDeRegla(regla: ReglaConvocatoria): number | null {
    return regla.areaScopePath.length > 0
      ? regla.areaScopePath[regla.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /** Un select por nivel para esta regla: raíz (gerencias) y luego los hijos elegidos en cascada. */
  nivelesRegla(regla: ReglaConvocatoria): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbol];
    let actual = regla.areaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = regla.areaScopePath[i];
    }
    return niveles;
  }

  /** Placeholder del select de un nivel, con el nombre real del tipo de nodo (Gerencia, Área, Subárea...). */
  placeholderNivel(opciones: AreaScopeTreeDto[], nivel: number): string {
    const tipo = opciones[0]?.areaTypeName?.toLowerCase();
    if (!tipo) return nivel === 0 ? 'Todas las gerencias' : 'Todas (opcional)';
    return nivel === 0 ? `Todas las ${tipo}` : `Todas (opcional)`;
  }

  onNivelReglaChange(regla: ReglaConvocatoria, nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesRegla(regla)[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    regla.areaScopePath = regla.areaScopePath.slice(0, nivel);
    if (nodo) regla.areaScopePath.push(nodo);
    this.cargarPuestos(regla);
    this.previsualizar();
  }

  onProjectIdReglaChange(regla: ReglaConvocatoria, projectId: number | null): void {
    regla.projectId = projectId;
    this.previsualizar();
  }

  private cargarPuestos(regla: ReglaConvocatoria): void {
    const marcadosPrevios = new Set(regla.puestos.filter((p) => p.marcado).map((p) => p.id));
    this.service.getPuestosPorArea(this.areaScopeIdDeRegla(regla)).subscribe({
      next: (data) => {
        regla.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: marcadosPrevios.has(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  puestosFiltrados(regla: ReglaConvocatoria): PuestoRow[] {
    const texto = regla.filtroPuesto.trim().toLowerCase();
    if (!texto) return regla.puestos;
    return regla.puestos.filter((p) => p.descripcion.toLowerCase().includes(texto));
  }

  todosPuestosMarcados(regla: ReglaConvocatoria): boolean {
    const visibles = this.puestosFiltrados(regla);
    return visibles.length > 0 && visibles.every((p) => p.marcado);
  }

  toggleTodosPuestos(regla: ReglaConvocatoria, valor: boolean): void {
    this.puestosFiltrados(regla).forEach((p) => (p.marcado = valor));
    this.previsualizar();
  }

  onPuestoToggle(): void {
    this.previsualizar();
  }

  onAgendaFijaChange(): void {
    if (this.agendaFija) {
      this.recordatorioHorasAntes = null;
    } else {
      this.agendaTexto = '';
    }
  }

  private puestoIdsDeRegla(regla: ReglaConvocatoria): number[] {
    return regla.puestos.filter((p) => p.marcado).map((p) => p.id);
  }

  /** Una regla vacía (sin área, puestos ni proyecto) no aportaría a nadie: se ignora al guardar/previsualizar. */
  private reglaValida(regla: ReglaConvocatoria): boolean {
    return (
      this.areaScopeIdDeRegla(regla) != null ||
      this.puestoIdsDeRegla(regla).length > 0 ||
      regla.projectId != null
    );
  }

  /** Debounced: recalcula quién calzaría como participante con las reglas elegidas (unión, sin duplicar). */
  private previsualizar(): void {
    clearTimeout(this.previewTimer);
    const reglasValidas = this.reglas.filter((r) => this.reglaValida(r));
    if (reglasValidas.length === 0) {
      this.trabajadoresPreview = [];
      this.cdr.detectChanges();
      return;
    }
    this.previewTimer = setTimeout(() => {
      this.buscando = true;
      this.cdr.detectChanges();
      forkJoin(
        reglasValidas.map((r) =>
          this.service.buscarTrabajadoresPorFiltro(this.areaScopeIdDeRegla(r), this.puestoIdsDeRegla(r), r.projectId),
        ),
      ).subscribe({
        next: (resultados) => {
          this.buscando = false;
          const vistos = new Set<number>();
          const trabajadores: TrabajadorAbrilDTO[] = [];
          for (const lista of resultados) {
            for (const t of lista) {
              if (vistos.has(t.workerId)) continue;
              vistos.add(t.workerId);
              trabajadores.push(t);
            }
          }
          this.trabajadoresPreview = trabajadores;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.buscando = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    }, 300);
  }

  private getValidationErrors(): string[] {
    const errors: string[] = [];
    if (this.agendaFija && !this.agendaTexto.trim()) {
      errors.push('El texto de la agenda fija');
    }
    return errors;
  }

  guardarConfiguracion(): void {
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

    const reglas: TemaConvocatoriaReglaInput[] = this.reglas
      .filter((r) => this.reglaValida(r))
      .map((r) => ({
        areaScopeId: this.areaScopeIdDeRegla(r),
        projectId: r.projectId,
        puestoIds: this.puestoIdsDeRegla(r),
      }));

    this.guardar.emit({
      config: {
        reglas,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: !this.agendaFija ? this.recordatorioHorasAntes : null,
      },
      trabajadores: this.trabajadoresPreview,
    });
  }
}
