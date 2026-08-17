import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { AreaScopeService } from '../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../configuracion/shared/dtos/areaScope.model';
import {
  ProyectoFiltroDTO,
  ReunionFolderDTO,
  ReunionTemaOpcionDTO,
  TemaConvocatoriaReglaInput,
} from '../dtos/actas-reunion.dto';

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

/**
 * Configuración de la carpeta de SharePoint/OneDrive donde se guardan los archivos
 * adjuntos de las actas de reunión. Existe un único registro: el usuario pega un link,
 * el sistema lo detecta (resuelve la carpeta vía Graph) y a partir de ahí todos los
 * adjuntos se suben ahí (en una subcarpeta por reunión).
 */
@Component({
  selector: 'app-actas-reunion-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './actas-reunion-configuracion.html',
})
export class ActasReunionConfiguracion implements OnInit {
  folder: ReunionFolderDTO | null = null;
  linkUrl = '';

  // ── Convocatoria recurrente por tema ──────────────────────────────────────
  temas: ReunionTemaOpcionDTO[] = [];
  proyectos: ProyectoFiltroDTO[] = [];
  temaSeleccionadoId: number | null = null;
  arbol: AreaScopeTreeDto[] = [];
  /** Varias reglas independientes (ej. jefaturas de una gerencia + un gerente de otra). */
  reglas: ReglaConvocatoria[] = [this.reglaVacia()];

  // ── Agenda + recordatorio (toda reunión requiere agenda: fija o dinámica) ──
  agendaFija = false;
  agendaTexto = '';
  recordatorioHorasAntes: number | null = null;

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    this.service.getTemasCatalogo().subscribe({
      next: (data) => {
        this.temas = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.areaScopeService.getTree().subscribe({
      next: (data) => {
        this.arbol = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.service
      .getPaginaInicial({ projectId: null, areaScopeId: null, reunionEstadoId: null, desde: null, hasta: null, page: 1, pageSize: 1 })
      .subscribe({
        next: (data) => {
          this.proyectos = data.proyectos;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  private reglaVacia(): ReglaConvocatoria {
    return { areaScopePath: [], puestos: [], filtroPuesto: '', projectId: null };
  }

  /** Busca la cadena de nodos (raíz → hoja) que llega al area_scope_id dado, para preseleccionar la cascada. */
  private buscarRuta(nodos: AreaScopeTreeDto[], areaScopeId: number): AreaScopeTreeDto[] | null {
    for (const nodo of nodos) {
      if (nodo.areaScopeId === areaScopeId) return [nodo];
      const ruta = this.buscarRuta(nodo.children, areaScopeId);
      if (ruta) return [nodo, ...ruta];
    }
    return null;
  }

  private areaScopeIdDeRegla(regla: ReglaConvocatoria): number | null {
    return regla.areaScopePath.length > 0
      ? regla.areaScopePath[regla.areaScopePath.length - 1].areaScopeId
      : null;
  }

  private cargarPuestos(regla: ReglaConvocatoria, puestoIdsMarcados?: number[]): void {
    const marcadosPrevios = puestoIdsMarcados
      ? new Set(puestoIdsMarcados)
      : new Set(regla.puestos.filter((p) => p.marcado).map((p) => p.id));
    this.service.getPuestosPorArea(this.areaScopeIdDeRegla(regla)).subscribe({
      next: (data) => {
        regla.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: marcadosPrevios.has(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onTemaSeleccionadoChange(): void {
    this.reglas = [this.reglaVacia()];
    this.agendaFija = false;
    this.agendaTexto = '';
    this.recordatorioHorasAntes = null;
    if (this.temaSeleccionadoId == null) return;

    this.loaderService.show();
    this.service.getConvocatoriaTema(this.temaSeleccionadoId).subscribe({
      next: (data) => {
        this.loaderService.hide();
        this.reglas =
          data.reglas.length > 0
            ? data.reglas.map((r) => ({
                areaScopePath: r.areaScopeId != null ? this.buscarRuta(this.arbol, r.areaScopeId) ?? [] : [],
                puestos: [] as PuestoRow[],
                filtroPuesto: '',
                projectId: r.projectId,
              }))
            : [this.reglaVacia()];
        this.reglas.forEach((regla, i) => this.cargarPuestos(regla, data.reglas[i]?.puestoIds ?? []));
        this.agendaFija = data.agendaFija;
        this.agendaTexto = data.agendaTexto ?? '';
        this.recordatorioHorasAntes = data.recordatorioHorasAntes;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onAgendaFijaChange(): void {
    if (this.agendaFija) {
      this.recordatorioHorasAntes = null;
    } else {
      this.agendaTexto = '';
    }
  }

  agregarRegla(): void {
    const regla = this.reglaVacia();
    this.reglas.push(regla);
    this.cargarPuestos(regla);
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
  }

  onProjectIdReglaChange(regla: ReglaConvocatoria, projectId: number | null): void {
    regla.projectId = projectId;
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
  }

  private reglaValida(regla: ReglaConvocatoria): boolean {
    return (
      this.areaScopeIdDeRegla(regla) != null ||
      regla.puestos.some((p) => p.marcado) ||
      regla.projectId != null
    );
  }

  guardarConvocatoriaTema(): void {
    if (this.temaSeleccionadoId == null) return;

    const reglas: TemaConvocatoriaReglaInput[] = this.reglas
      .filter((r) => this.reglaValida(r))
      .map((r) => ({
        areaScopeId: this.areaScopeIdDeRegla(r),
        projectId: r.projectId,
        puestoIds: r.puestos.filter((p) => p.marcado).map((p) => p.id),
      }));

    this.loaderService.show();
    this.service
      .guardarConvocatoriaTema(this.temaSeleccionadoId, {
        reglas,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: !this.agendaFija ? this.recordatorioHorasAntes : null,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Convocatoria guardada',
            text: 'La próxima vez que se elija este tema, se sugerirán estos participantes automáticamente.',
            confirmButtonColor: 'var(--color-abril-primary)',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  /** Borrado real del catálogo (no soft-delete): falla si ya hay reuniones agendadas con este tema. */
  eliminarTema(): void {
    if (this.temaSeleccionadoId == null) return;
    const temaId = this.temaSeleccionadoId;
    const nombre = this.temas.find((t) => t.id === temaId)?.descripcion ?? 'este tema';

    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar tema?',
      html: `<b>${nombre}</b> se eliminará por completo del catálogo y ya no se podrá elegir en reuniones nuevas.
        Las reuniones que ya lo usan conservan su tema tal cual (solo se quitó el vínculo al catálogo); si alguna
        estaba programada con agenda dinámica pendiente, dejará de recibir el recordatorio automático.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.eliminarTema(temaId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.temas = this.temas.filter((t) => t.id !== temaId);
          this.temaSeleccionadoId = null;
          this.onTemaSeleccionadoChange();
          Swal.fire({
            icon: 'success',
            title: 'Tema eliminado',
            text: res.reunionesDesvinculadas > 0
              ? `${res.reunionesDesvinculadas} reunión(es) que lo usaban conservan su tema tal cual.`
              : undefined,
            confirmButtonColor: 'var(--color-abril-primary)',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/projects/actas-reunion']);
  }

  load(): void {
    this.loaderService.show();
    this.service.getCarpeta().subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res?.linkUrl ?? '';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(): void {
    if (!this.linkUrl.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Campo requerido',
        text: 'Ingresa el link de la carpeta (SharePoint u OneDrive).',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.loaderService.show();
    this.service.saveCarpeta(this.linkUrl.trim()).subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res.linkUrl;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Carpeta configurada',
          text: res.folderName
            ? `Los adjuntos de las actas se guardarán en: ${res.folderName}`
            : 'Carpeta detectada y guardada exitosamente.',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
