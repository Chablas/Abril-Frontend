import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';
import { TemaConvocatoriaSaveRequest, TrabajadorAbrilDTO } from '../../dtos/actas-reunion.dto';

interface PuestoRow {
  id: number;
  descripcion: string;
  marcado: boolean;
}

export interface ConvocatoriaTemaResultado {
  config: TemaConvocatoriaSaveRequest;
  trabajadores: TrabajadorAbrilDTO[];
}

/**
 * Modal para configurar la convocatoria recurrente de un tema nuevo (área/puestos que se
 * convocan siempre + si requiere agenda fija o dinámica), en vez de amontonar todos estos campos
 * dentro del formulario de "Agendar reunión". Se abre al marcar "Guardar como tema recurrente".
 */
@Component({
  selector: 'app-convocatoria-tema',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './convocatoria-tema.html',
})
export class ConvocatoriaTema {
  /** Árbol completo de áreas/gerencias, ya cargado por el padre. */
  @Input() arbol: AreaScopeTreeDto[] = [];

  /** Configuración previa, al reabrir el modal para editar (null = arranca en blanco). */
  @Input() set inicial(value: TemaConvocatoriaSaveRequest | null) {
    if (!value) return;
    this.areaScopePath = value.areaScopeId != null ? this.buscarRuta(this.arbol, value.areaScopeId) ?? [] : [];
    this.requiereAgenda = value.requiereAgenda;
    this.agendaFija = value.agendaFija;
    this.agendaTexto = value.agendaTexto ?? '';
    this.recordatorioHorasAntes = value.recordatorioHorasAntes;
    this.cargarPuestos(value.puestoIds);
    this.previsualizar();
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<ConvocatoriaTemaResultado>();

  areaScopePath: AreaScopeTreeDto[] = [];
  puestos: PuestoRow[] = [];
  filtroPuesto = '';

  requiereAgenda = false;
  agendaFija = false;
  agendaTexto = '';
  recordatorioHorasAntes: number | null = null;

  /** Previsualización en vivo de a quién se agregaría como participante con el área/puestos elegidos. */
  trabajadoresPreview: TrabajadorAbrilDTO[] = [];
  buscando = false;
  private previewTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private service: ActasReunionService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Busca la cadena de nodos (raíz → hoja) que llega al area_scope_id dado, para preseleccionar la cascada al editar. */
  private buscarRuta(nodos: AreaScopeTreeDto[], areaScopeId: number): AreaScopeTreeDto[] | null {
    for (const nodo of nodos) {
      if (nodo.areaScopeId === areaScopeId) return [nodo];
      const ruta = this.buscarRuta(nodo.children, areaScopeId);
      if (ruta) return [nodo, ...ruta];
    }
    return null;
  }

  get areaScopeId(): number | null {
    return this.areaScopePath.length > 0
      ? this.areaScopePath[this.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /** Un select por nivel: raíz (gerencias) y luego los hijos del nodo elegido en el nivel anterior. */
  get nivelesAreaScope(): AreaScopeTreeDto[][] {
    const niveles: AreaScopeTreeDto[][] = [this.arbol];
    let actual = this.areaScopePath[0];
    let i = 0;
    while (actual && actual.children.length > 0) {
      niveles.push(actual.children);
      i++;
      actual = this.areaScopePath[i];
    }
    return niveles;
  }

  /** Placeholder del select de un nivel, con el nombre real del tipo de nodo (Gerencia, Área, Subárea...). */
  placeholderNivel(opciones: AreaScopeTreeDto[], nivel: number): string {
    const tipo = opciones[0]?.areaTypeName?.toLowerCase();
    if (!tipo) return nivel === 0 ? 'Todas las gerencias' : 'Todas (opcional)';
    return nivel === 0 ? `Todas las ${tipo}` : `Todas (opcional)`;
  }

  onNivelAreaScopeChange(nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesAreaScope[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    this.areaScopePath = this.areaScopePath.slice(0, nivel);
    if (nodo) this.areaScopePath.push(nodo);
    this.cargarPuestos();
    this.previsualizar();
  }

  private cargarPuestos(puestoIdsMarcados?: number[]): void {
    const marcadosPrevios = puestoIdsMarcados
      ? new Set(puestoIdsMarcados)
      : new Set(this.puestos.filter((p) => p.marcado).map((p) => p.id));
    this.service.getPuestosPorArea(this.areaScopeId).subscribe({
      next: (data) => {
        this.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: marcadosPrevios.has(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  get puestosFiltrados(): PuestoRow[] {
    const texto = this.filtroPuesto.trim().toLowerCase();
    if (!texto) return this.puestos;
    return this.puestos.filter((p) => p.descripcion.toLowerCase().includes(texto));
  }

  get todosPuestosMarcados(): boolean {
    const visibles = this.puestosFiltrados;
    return visibles.length > 0 && visibles.every((p) => p.marcado);
  }

  toggleTodosPuestos(valor: boolean): void {
    this.puestosFiltrados.forEach((p) => (p.marcado = valor));
    this.previsualizar();
  }

  onPuestoToggle(): void {
    this.previsualizar();
  }

  onRequiereAgendaChange(): void {
    if (!this.requiereAgenda) {
      this.agendaFija = false;
      this.agendaTexto = '';
      this.recordatorioHorasAntes = null;
    }
  }

  onAgendaFijaChange(): void {
    if (this.agendaFija) {
      this.recordatorioHorasAntes = null;
    } else {
      this.agendaTexto = '';
    }
  }

  /** Debounced: recalcula quién calzaría como participante con el área/puestos elegidos. */
  private previsualizar(): void {
    clearTimeout(this.previewTimer);
    const areaScopeId = this.areaScopeId;
    const puestoIds = this.puestos.filter((p) => p.marcado).map((p) => p.id);
    if (areaScopeId == null && puestoIds.length === 0) {
      this.trabajadoresPreview = [];
      this.cdr.detectChanges();
      return;
    }
    this.previewTimer = setTimeout(() => {
      this.buscando = true;
      this.cdr.detectChanges();
      this.service.buscarTrabajadoresPorFiltro(areaScopeId, puestoIds, null).subscribe({
        next: (trabajadores) => {
          this.buscando = false;
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
    if (this.requiereAgenda && this.agendaFija && !this.agendaTexto.trim()) {
      errors.push('El texto de la agenda fija');
    }
    if (this.requiereAgenda && !this.agendaFija && !this.recordatorioHorasAntes) {
      errors.push('Las horas de anticipación del recordatorio');
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

    this.guardar.emit({
      config: {
        areaScopeId: this.areaScopeId,
        puestoIds: this.puestos.filter((p) => p.marcado).map((p) => p.id),
        requiereAgenda: this.requiereAgenda,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: this.requiereAgenda && !this.agendaFija ? this.recordatorioHorasAntes : null,
      },
      trabajadores: this.trabajadoresPreview,
    });
  }
}
