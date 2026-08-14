import { Component, OnInit } from '@angular/core';
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
import { CatalogoDTO, ReunionFolderDTO } from '../dtos/actas-reunion.dto';

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
  temas: CatalogoDTO[] = [];
  temaSeleccionadoId: number | null = null;
  arbol: AreaScopeTreeDto[] = [];
  areaScopePath: AreaScopeTreeDto[] = [];
  puestos: PuestoRow[] = [];
  filtroPuesto = '';

  constructor(
    private service: ActasReunionService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
    this.service.getTemasCatalogo().subscribe({
      next: (data) => (this.temas = data),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
    this.areaScopeService.getTree().subscribe({
      next: (data) => (this.arbol = data),
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
    if (this.temaSeleccionadoId == null) return;

    this.loaderService.show();
    this.service.getConvocatoriaTema(this.temaSeleccionadoId).subscribe({
      next: (data) => {
        this.loaderService.hide();
        if (data.areaScopeId != null) {
          this.areaScopePath = this.buscarRuta(this.arbol, data.areaScopeId) ?? [];
        }
        this.cargarPuestos(data.puestoIds);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
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
