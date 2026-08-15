import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { AreaScopeService } from '../../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../configuracion/shared/dtos/areaScope.model';
import { ProyectoFiltroDTO, TrabajadorAbrilDTO } from '../../dtos/actas-reunion.dto';

interface PuestoRow {
  id: number;
  descripcion: string;
  marcado: boolean;
}

interface ReglaConvocatoria {
  /** Nodo elegido en cada nivel de la cascada (gerencia, luego área, luego subárea si existe). */
  areaScopePath: AreaScopeTreeDto[];
  /** Puestos que realmente existen en el área elegida (o en toda la organización si no hay área), con checkbox. */
  puestos: PuestoRow[];
  /** Filtra el checklist de puestos en vivo (ej. "jefe" deja ver solo los que contienen esa palabra). */
  filtroPuesto: string;
  /** Staff asignado a este proyecto (ss_contratista_usuario con scope POR_PROYECTO). Se combina con área/puestos. */
  projectId: number | null;
}

interface ResultadoRow {
  trabajador: TrabajadorAbrilDTO;
  seleccionado: boolean;
}

@Component({
  selector: 'app-convocatoria-masiva',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './convocatoria-masiva.html',
})
export class ConvocatoriaMasiva implements OnInit {
  /** Proyectos disponibles para el filtro "Staff de un proyecto" de cada regla. */
  @Input() proyectos: ProyectoFiltroDTO[] = [];

  @Output() closeModal = new EventEmitter<void>();
  /** Trabajadores resueltos (ya deduplicados); el padre decide cuáles agregar como participantes. */
  @Output() agregarTrabajadores = new EventEmitter<TrabajadorAbrilDTO[]>();

  arbol: AreaScopeTreeDto[] = [];
  reglas: ReglaConvocatoria[] = [{ areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null }];

  /** Una vez buscado, se muestra el resultado para que el usuario marque a todos o solo a algunos. */
  mostrandoResultados = false;
  resultados: ResultadoRow[] = [];

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.areaScopeService.getTree().subscribe({
      next: (data) => (this.arbol = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.cargarPuestos(this.reglas[0]);
  }

  agregarRegla(): void {
    const regla: ReglaConvocatoria = { areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null };
    this.reglas.push(regla);
    this.cargarPuestos(regla);
  }

  /** Recarga el checklist de puestos de la regla según el área elegida (null = toda la organización). */
  private cargarPuestos(regla: ReglaConvocatoria): void {
    this.service.getPuestosPorArea(this.areaScopeIdDeRegla(regla)).subscribe({
      next: (data) => {
        regla.puestos = data.map((p) => ({ id: p.id, descripcion: p.descripcion, marcado: false }));
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  removerRegla(index: number): void {
    this.reglas.splice(index, 1);
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

  onNivelReglaChange(regla: ReglaConvocatoria, nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesRegla(regla)[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    regla.areaScopePath = regla.areaScopePath.slice(0, nivel);
    if (nodo) regla.areaScopePath.push(nodo);
    // El área cambió: los puestos marcados antes pueden ya no aplicar, se recarga el checklist.
    this.cargarPuestos(regla);
  }

  private areaScopeIdDeRegla(regla: ReglaConvocatoria): number | null {
    return regla.areaScopePath.length > 0
      ? regla.areaScopePath[regla.areaScopePath.length - 1].areaScopeId
      : null;
  }

  /** Puestos visibles según el texto escrito en el buscador de esta regla. */
  puestosFiltrados(regla: ReglaConvocatoria): PuestoRow[] {
    const texto = regla.filtroPuesto.trim().toLowerCase();
    if (!texto) return regla.puestos;
    return regla.puestos.filter((p) => p.descripcion.toLowerCase().includes(texto));
  }

  /** "Marcar todos" actúa solo sobre lo que está filtrado/visible, no sobre el checklist completo. */
  todosPuestosMarcados(regla: ReglaConvocatoria): boolean {
    const visibles = this.puestosFiltrados(regla);
    return visibles.length > 0 && visibles.every((p) => p.marcado);
  }

  toggleTodosPuestos(regla: ReglaConvocatoria, valor: boolean): void {
    this.puestosFiltrados(regla).forEach((p) => (p.marcado = valor));
  }

  private puestoIdsDeRegla(regla: ReglaConvocatoria): number[] {
    return regla.puestos.filter((p) => p.marcado).map((p) => p.id);
  }

  /** Una regla vacía (sin área, puestos ni proyecto) traería a toda la organización: se exige al menos un filtro. */
  reglaValida(regla: ReglaConvocatoria): boolean {
    return (
      this.areaScopeIdDeRegla(regla) != null ||
      this.puestoIdsDeRegla(regla).length > 0 ||
      regla.projectId != null
    );
  }

  buscar(): void {
    const reglasValidas = this.reglas.filter((r) => this.reglaValida(r));
    if (reglasValidas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin filtros',
        text: 'Define al menos un área/gerencia, marca algún puesto o elige un proyecto en alguna regla.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    forkJoin(
      reglasValidas.map((r) =>
        this.service.buscarTrabajadoresPorFiltro(this.areaScopeIdDeRegla(r), this.puestoIdsDeRegla(r), r.projectId),
      ),
    ).subscribe({
      next: (resultados) => {
        this.loaderService.hide();
        const vistos = new Set<number>();
        const trabajadores: TrabajadorAbrilDTO[] = [];
        for (const lista of resultados) {
          for (const t of lista) {
            if (vistos.has(t.workerId)) continue;
            vistos.add(t.workerId);
            trabajadores.push(t);
          }
        }
        if (trabajadores.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontró ningún trabajador con esos filtros.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
          return;
        }
        // Todos vienen marcados por defecto; el usuario puede destildar los que no quiere.
        this.resultados = trabajadores.map((t) => ({ trabajador: t, seleccionado: true }));
        this.mostrandoResultados = true;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get todosSeleccionados(): boolean {
    return this.resultados.length > 0 && this.resultados.every((r) => r.seleccionado);
  }

  toggleTodos(valor: boolean): void {
    this.resultados.forEach((r) => (r.seleccionado = valor));
  }

  get totalSeleccionados(): number {
    return this.resultados.filter((r) => r.seleccionado).length;
  }

  volverAFiltros(): void {
    this.mostrandoResultados = false;
    this.resultados = [];
  }

  confirmar(): void {
    const elegidos = this.resultados.filter((r) => r.seleccionado).map((r) => r.trabajador);
    if (elegidos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nadie seleccionado',
        text: 'Marca al menos un trabajador para agregarlo.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }
    this.agregarTrabajadores.emit(elegidos);
  }
}
