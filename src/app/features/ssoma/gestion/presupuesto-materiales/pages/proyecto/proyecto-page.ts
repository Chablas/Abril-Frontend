import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PresupuestoResumenDto, GenerarPresupuestoDto, HitoCriticoDisponibleDto,
  PersonalHitoDto, PersonalHitoItemInputDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import Swal from 'sweetalert2';

interface FilaPersonalHito extends PersonalHitoItemInputDto {
  hitoDescripcion: string;
  hitoFecha: string | null;
  total: number;
}

const ROLES_PERSONAL: string[] = [
  'PREVENCIONISTA', 'MONITOR', 'VIGIA',
  'CAPATAZ', 'OFICIAL', 'OPERARIO', 'PEON', 'AYUDANTE',
];
const SEMANAS_POR_MES = 4.345;

@Component({
  selector: 'app-proyecto-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './proyecto-page.html',
  styleUrl: './proyecto-page.css',
})
export class ProyectoPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  projectId!: number;
  presupuestos: PresupuestoResumenDto[] = [];
  loading = false;
  mostrarFormGenerar = false;
  generando = false;

  formGenerar: GenerarPresupuestoDto = {};

  hitosCriticos: HitoCriticoDisponibleDto[] = [];
  loadingHitos = false;
  asignandoHitos = false;

  // ── Dotación de personal por hito, mostrada aquí mismo junto a los hitos críticos ──
  readonly rolesPersonal = ROLES_PERSONAL;
  personalFilas: FilaPersonalHito[] = [];
  personalLoading = false;
  personalGuardando = false;

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    this.load();
    this.loadHitosCriticos();
  }

  loadHitosCriticos(): void {
    this.loadingHitos = true;
    this.cdr.markForCheck();
    this.svc.getHitosCriticosDisponibles(this.projectId).subscribe({
      next: (hitos) => {
        this.hitosCriticos = hitos;
        this.loadingHitos = false;
        this.cdr.markForCheck();
        this.loadPersonalPanel(hitos);
      },
      error: () => {
        this.loadingHitos = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadPersonalPanel(hitos: HitoCriticoDisponibleDto[]): void {
    if (hitos.length === 0) {
      this.personalFilas = [];
      return;
    }
    this.personalLoading = true;
    this.cdr.markForCheck();
    this.svc.getPersonalHitos(this.projectId).subscribe({
      next: (existentes) => {
        this.construirFilasPersonal(hitos, existentes);
        this.personalLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.personalLoading = false; this.cdr.markForCheck(); },
    });
  }

  private construirFilasPersonal(hitos: HitoCriticoDisponibleDto[], existentes: PersonalHitoDto[]): void {
    this.personalFilas = [];
    for (const hito of hitos) {
      for (const rol of ROLES_PERSONAL) {
        const existente = existentes.find((e) => e.hitoId === hito.hitoId && e.rol === rol);
        this.personalFilas.push({
          hitoId: hito.hitoId,
          hitoDescripcion: hito.hitoDescripcion,
          hitoFecha: hito.hitoFecha,
          rol,
          cantidad: existente?.cantidad ?? 0,
          semanas: existente?.semanas ?? 0,
          costoMensual: existente?.costoMensual ?? 0,
          total: existente?.total ?? 0,
        });
      }
    }
  }

  recalcularTotalPersonal(fila: FilaPersonalHito): void {
    fila.total = fila.cantidad * fila.costoMensual * (fila.semanas / SEMANAS_POR_MES);
  }

  /** Agrupa las filas por hito para pintar una sección por hito con sus roles debajo. */
  get personalPorHito(): { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }[] {
    const grupos = new Map<number, { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }>();
    for (const fila of this.personalFilas) {
      if (!grupos.has(fila.hitoId)) {
        grupos.set(fila.hitoId, { hitoId: fila.hitoId, hitoDescripcion: fila.hitoDescripcion, hitoFecha: fila.hitoFecha, filas: [] });
      }
      grupos.get(fila.hitoId)!.filas.push(fila);
    }
    return Array.from(grupos.values());
  }

  get personalTotalGeneral(): number {
    return this.personalFilas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  guardarPersonal(): void {
    if (this.personalGuardando) return;
    const items = this.personalFilas
      .filter((f) => f.cantidad > 0 && f.costoMensual > 0)
      .map((f) => ({ hitoId: f.hitoId, rol: f.rol, cantidad: f.cantidad, semanas: f.semanas, costoMensual: f.costoMensual }));

    this.personalGuardando = true;
    this.loader.show();
    this.svc.guardarPersonalHitos(this.projectId, { items }).subscribe({
      next: () => {
        this.personalGuardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Dotación de personal guardada', timer: 2000, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.personalGuardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  asignarHitos(): void {
    if (this.asignandoHitos) return;
    this.asignandoHitos = true;
    this.loader.show();
    this.svc.asignarHitos(this.projectId).subscribe({
      next: (res) => {
        this.asignandoHitos = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: 'Hitos asignados',
          text: `${res.lineasActualizadas} línea(s) de consumo repartidas entre los hitos críticos.`,
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.asignandoHitos = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Abre la pantalla real de Cronograma de Hitos (/projects/milestone-schedule) ya posicionada
   * en este proyecto, saltándose la lista de tarjetas. Es la misma pantalla que se usa en
   * producción — no hay un formulario duplicado dentro de SSOMA. */
  irACronograma(): void {
    this.router.navigate(['/projects/milestone-schedule'], {
      queryParams: { projectId: this.projectId, projectDescription: this.proyectNombre },
    });
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getPresupuestosPorProyecto(this.projectId).subscribe({
      next: (p) => {
        this.presupuestos = p;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  generar(): void {
    if (this.generando) return;
    this.generando = true;
    this.loader.show();
    this.svc.generarPresupuesto(this.projectId, this.formGenerar).subscribe({
      next: (p) => {
        this.generando = false;
        this.mostrarFormGenerar = false;
        this.loader.hide();
        this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', p.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.generando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id]);
  }

  irAControl(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id, 'control']);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/drivers']);
  }

  irAPersonalHitos(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', this.projectId, 'personal-hitos']);
  }

  estadoClass(estado: string): string {
    return estado === 'APROBADO' ? 'badge-ok' : 'badge-warn';
  }

  get proyectNombre(): string {
    return this.presupuestos[0]?.projectDescription ?? `Proyecto #${this.projectId}`;
  }
}
