import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { AreaScopeService } from '../../../configuracion/shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../configuracion/shared/dtos/areaScope.model';
import { ReunionFolderDTO, ReunionTemaOpcionDTO } from '../dtos/actas-reunion.dto';

interface PuestoRow {
  id: number;
  descripcion: string;
  marcado: boolean;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './actas-reunion-configuracion.html',
})
export class ActasReunionConfiguracion implements OnInit {
  folder: ReunionFolderDTO | null = null;
  linkUrl = '';

  // ── Convocatoria recurrente por tema ──────────────────────────────────────
  temas: ReunionTemaOpcionDTO[] = [];
  temaSeleccionadoId: number | null = null;
  arbol: AreaScopeTreeDto[] = [];
  areaScopePath: AreaScopeTreeDto[] = [];
  puestos: PuestoRow[] = [];
  filtroPuesto = '';

  // ── Agenda + recordatorio ──────────────────────────────────────────────────
  requiereAgenda = false;
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
  }

  private areaScopeId(): number | null {
    return this.areaScopePath.length > 0
      ? this.areaScopePath[this.areaScopePath.length - 1].areaScopeId
      : null;
  }

  private cargarPuestos(puestoIdsMarcados: number[]): void {
    this.service.getPuestosPorArea(this.areaScopeId()).subscribe({
      next: (data) => {
        this.puestos = data.map((p) => ({
          id: p.id,
          descripcion: p.descripcion,
          marcado: puestoIdsMarcados.includes(p.id),
        }));
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
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

  onTemaSeleccionadoChange(): void {
    this.areaScopePath = [];
    this.puestos = [];
    this.filtroPuesto = '';
    this.requiereAgenda = false;
    this.agendaFija = false;
    this.agendaTexto = '';
    this.recordatorioHorasAntes = null;
    if (this.temaSeleccionadoId == null) return;

    this.loaderService.show();
    this.service.getConvocatoriaTema(this.temaSeleccionadoId).subscribe({
      next: (data) => {
        this.loaderService.hide();
        if (data.areaScopeId != null) {
          this.areaScopePath = this.buscarRuta(this.arbol, data.areaScopeId) ?? [];
        }
        this.cargarPuestos(data.puestoIds);
        this.requiereAgenda = data.requiereAgenda;
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

  /** Un select por nivel: raíz (gerencias) y luego los hijos elegidos en cascada. */
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

  onNivelAreaScopeChange(nivel: number, areaScopeId: number | null): void {
    const opciones = this.nivelesAreaScope[nivel] ?? [];
    const nodo = opciones.find((n) => n.areaScopeId === areaScopeId) ?? null;
    this.areaScopePath = this.areaScopePath.slice(0, nivel);
    if (nodo) this.areaScopePath.push(nodo);
    this.cargarPuestos(this.puestos.filter((p) => p.marcado).map((p) => p.id));
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
  }

  guardarConvocatoriaTema(): void {
    if (this.temaSeleccionadoId == null) return;

    this.loaderService.show();
    this.service
      .guardarConvocatoriaTema(this.temaSeleccionadoId, {
        areaScopeId: this.areaScopeId(),
        puestoIds: this.puestos.filter((p) => p.marcado).map((p) => p.id),
        requiereAgenda: this.requiereAgenda,
        agendaFija: this.agendaFija,
        agendaTexto: this.agendaFija ? this.agendaTexto.trim() || null : null,
        recordatorioHorasAntes: this.requiereAgenda && !this.agendaFija ? this.recordatorioHorasAntes : null,
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
