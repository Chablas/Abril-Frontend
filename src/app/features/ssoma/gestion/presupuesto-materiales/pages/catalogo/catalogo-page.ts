import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  FamiliaCatalogoDto,
  MaterialPendienteGlobalDto,
  MaterialNoSsomaDto,
  BuscarItemDto,
  TipoMaterialDto,
  RevisionDecisionDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';

type Seccion = 'normalizado' | 'sin-estandarizar' | 'no-ssoma';
const VARIABLES_BASE = ['HH', 'AREATECHADA', 'TRABAJADORES', 'CALCULADO', 'FIJO', 'METRADO'];

@Component({
  selector: 'app-catalogo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './catalogo-page.html',
  styleUrl: './catalogo-page.css',
})
export class CatalogoPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);

  readonly variablesBase = VARIABLES_BASE;
  seccion: Seccion = 'normalizado';
  loading = false;

  // Sección 1
  tipos: TipoMaterialDto[] = [];
  familias: FamiliaCatalogoDto[] = [];
  filtroTexto = '';

  // Sección 2
  pendientes: MaterialPendienteGlobalDto[] = [];
  busquedaPorLinea: Record<number, string> = {};
  resultadosPorLinea: Record<number, BuscarItemDto[]> = {};
  seleccionPorLinea: Record<number, number | null> = {};
  private debounceBusqueda?: ReturnType<typeof setTimeout>;

  // Sección 3
  noSsoma: MaterialNoSsomaDto[] = [];

  ngOnInit(): void {
    this.cambiarSeccion('normalizado');
  }

  cambiarSeccion(s: Seccion): void {
    this.seccion = s;
    if (s === 'normalizado') this.cargarNormalizado();
    if (s === 'sin-estandarizar') this.cargarSinEstandarizar();
    if (s === 'no-ssoma') this.cargarNoSsoma();
  }

  get familiasFiltradas(): FamiliaCatalogoDto[] {
    if (!this.filtroTexto.trim()) return this.familias;
    const q = this.filtroTexto.toLowerCase();
    return this.familias.filter((f) => f.nombre.toLowerCase().includes(q));
  }

  private cargarNormalizado(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarFamiliasCatalogo().subscribe({
      next: (familias) => {
        this.familias = familias;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        if (this.tipos.length === 0) this.cargarTipos();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  private cargarTipos(): void {
    this.svc.listarTiposCatalogo().subscribe({
      next: (tipos) => {
        this.tipos = tipos;
        this.cdr.markForCheck();
      },
    });
  }

  guardarFamilia(f: FamiliaCatalogoDto): void {
    this.loader.show();
    this.svc.actualizarFamiliaCatalogo(f.id, {
      nombre: f.nombre,
      tipoId: f.tipoId,
      variableBase: f.variableBase,
      unidadMedida: f.unidadMedida,
      perteneceSsoma: f.perteneceSsoma,
      activo: f.activo,
    }).subscribe({
      next: () => {
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Familia actualizada', timer: 1200, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarSinEstandarizar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.obtenerSinEstandarizarGlobal().subscribe({
      next: (lineas) => {
        this.pendientes = lineas;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  onBuscarItem(lineaId: number, texto: string): void {
    this.busquedaPorLinea[lineaId] = texto;
    clearTimeout(this.debounceBusqueda);
    this.debounceBusqueda = setTimeout(() => {
      if (!texto || texto.length < 3) {
        this.resultadosPorLinea[lineaId] = [];
        this.cdr.markForCheck();
        return;
      }
      this.svc.buscarItems(texto).subscribe({
        next: (resultados) => {
          this.resultadosPorLinea[lineaId] = resultados;
          this.cdr.markForCheck();
        },
      });
    }, 300);
  }

  autorizar(linea: MaterialPendienteGlobalDto): void {
    const itemId = this.seleccionPorLinea[linea.lineaId] ?? linea.itemIdSugerido;
    if (!itemId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona un ítem del catálogo primero.' });
      return;
    }
    this.procesar([{ lineaId: linea.lineaId, decision: 'AUTORIZADO', itemIdConfirmado: itemId }]);
  }

  rechazar(linea: MaterialPendienteGlobalDto): void {
    Swal.fire({
      title: '¿Rechazar este material?',
      text: 'Se notificará a Oficina Técnica del proyecto correspondiente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.procesar([{ lineaId: linea.lineaId, decision: 'RECHAZADO' }]);
    });
  }

  private procesar(decisiones: RevisionDecisionDto[]): void {
    this.loader.show();
    this.svc.procesarSinEstandarizarGlobal(decisiones).subscribe({
      next: () => {
        this.loader.hide();
        this.cargarSinEstandarizar();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarNoSsoma(): void {
    this.loading = true;
    this.loader.show();
    this.svc.obtenerNoSsoma().subscribe({
      next: (lineas) => {
        this.noSsoma = lineas;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  private onError(err: HttpErrorResponse): void {
    this.loading = false;
    this.loader.hide();
    this.error.handleError(err);
    this.cdr.markForCheck();
  }
}
