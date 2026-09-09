import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { InspeccionCruzadaProgramacionService } from '../../../../shared/services/inspeccion-cruzada-programacion.service';
import {
  AnilloDTO,
  MiembroAnilloDTO,
  ProgramacionInspeccionCruzadaDTO,
  ProyectoSimpleInspeccionCruzadaDTO,
} from '../../../../shared/dtos/inspeccion-cruzada-programacion.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { INSPECCION_TABS } from '../../inspeccion-tabs';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-inspeccion-cruzadas',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, AbrilModalPanel],
  templateUrl: './inspeccion-cruzadas.component.html',
  styleUrl: './inspeccion-cruzadas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspeccionCruzadasComponent implements OnInit {
  private svc = inject(InspeccionCruzadaProgramacionService);
  private errorSvc = inject(ErrorService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  readonly tabs = INSPECCION_TABS;
  readonly meses = MESES;

  vista: 'calendario' | 'anillos' = 'calendario';

  // ── Anillos ──────────────────────────────────────────────────────
  anillos: AnilloDTO[] = [];
  proyectosDisponibles: ProyectoSimpleInspeccionCruzadaDTO[] = [];
  nombreAnilloNuevo = '';
  anilloParaAgregarId: number | null = null;
  proyectoNuevoId: number | null = null;

  // ── Calendario ────────────────────────────────────────────────────
  anioActual = new Date().getFullYear();
  mesActual = new Date().getMonth() + 1;
  calendario: ProgramacionInspeccionCruzadaDTO[] = [];

  // ── Modal: reasignar una pareja del mes ────────────────────────────
  editando: ProgramacionInspeccionCruzadaDTO | null = null;
  formInspectorId: number | null = null;
  formInspeccionadoId: number | null = null;
  formMotivo = '';
  guardando = false;

  ngOnInit(): void {
    this.cargarAnillos();
    this.cargarProyectosDisponibles();
    this.cargarCalendario();
  }

  cambiarVista(v: 'calendario' | 'anillos'): void {
    this.vista = v;
    this.cdr.markForCheck();
  }

  get nombreMesActual(): string {
    return `${this.meses[this.mesActual - 1]} ${this.anioActual}`;
  }

  calendarioDe(anilloId: number): ProgramacionInspeccionCruzadaDTO[] {
    return this.calendario.filter((c) => c.anilloId === anilloId);
  }

  mesAnterior(): void {
    this.mesActual--;
    if (this.mesActual < 1) {
      this.mesActual = 12;
      this.anioActual--;
    }
    this.cargarCalendario();
  }

  mesSiguiente(): void {
    this.mesActual++;
    if (this.mesActual > 12) {
      this.mesActual = 1;
      this.anioActual++;
    }
    this.cargarCalendario();
  }

  // ── Calendario ────────────────────────────────────────────────────

  cargarCalendario(): void {
    this.loader.show();
    this.svc.getCalendario(this.anioActual, this.mesActual, this.anioActual, this.mesActual).subscribe({
      next: (res) => {
        this.calendario = res;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  get todosLosProyectos(): { proyectoId: number; nombre: string }[] {
    const porId = new Map<number, string>();
    for (const a of this.anillos) for (const m of a.miembros) porId.set(m.proyectoId, m.proyectoNombre);
    for (const p of this.proyectosDisponibles) porId.set(p.proyectoId, p.nombre);
    return Array.from(porId, ([proyectoId, nombre]) => ({ proyectoId, nombre })).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }

  abrirReasignar(item: ProgramacionInspeccionCruzadaDTO): void {
    this.editando = item;
    this.formInspectorId = item.proyectoInspectorId;
    this.formInspeccionadoId = item.proyectoInspeccionadoId;
    this.formMotivo = '';
    this.cdr.markForCheck();
  }

  cerrarModalReasignar(): void {
    this.editando = null;
    this.cdr.markForCheck();
  }

  confirmarReasignar(): void {
    if (!this.editando || !this.formInspectorId || !this.formInspeccionadoId) return;
    if (this.formInspectorId === this.formInspeccionadoId) {
      Swal.fire({ icon: 'warning', title: 'El inspector y el inspeccionado no pueden ser el mismo proyecto' });
      return;
    }

    this.guardando = true;
    this.svc
      .reasignar(this.editando.id, this.formInspectorId, this.formInspeccionadoId, this.formMotivo || undefined)
      .subscribe({
        next: () => {
          this.guardando = false;
          this.cerrarModalReasignar();
          this.cargarCalendario();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ── Anillos ──────────────────────────────────────────────────────

  cargarAnillos(): void {
    this.svc.getAnillos().subscribe({
      next: (res) => {
        this.anillos = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  cargarProyectosDisponibles(): void {
    this.svc.getProyectosDisponibles().subscribe({
      next: (res) => {
        this.proyectosDisponibles = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  crearAnillo(): void {
    if (!this.nombreAnilloNuevo.trim()) return;
    this.loader.show();
    this.svc.crearAnillo(this.nombreAnilloNuevo.trim()).subscribe({
      next: () => {
        this.nombreAnilloNuevo = '';
        this.loader.hide();
        this.cargarAnillos();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  agregarMiembro(anillo: AnilloDTO): void {
    if (!this.proyectoNuevoId || this.anilloParaAgregarId !== anillo.id) return;
    this.loader.show();
    this.svc.agregarMiembro(anillo.id, this.proyectoNuevoId).subscribe({
      next: () => {
        this.proyectoNuevoId = null;
        this.anilloParaAgregarId = null;
        this.loader.hide();
        this.cargarAnillos();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  toggleActivo(miembro: MiembroAnilloDTO): void {
    const nuevo = !miembro.activo;
    this.svc.setActivo(miembro.id, nuevo).subscribe({
      next: () => {
        miembro.activo = nuevo;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  mover(anillo: AnilloDTO, miembro: MiembroAnilloDTO, direccion: -1 | 1): void {
    const idx = anillo.miembros.findIndex((m) => m.id === miembro.id);
    const otroIdx = idx + direccion;
    if (otroIdx < 0 || otroIdx >= anillo.miembros.length) return;

    const otro = anillo.miembros[otroIdx];
    const ordenA = miembro.orden;
    const ordenB = otro.orden;

    this.loader.show();
    this.svc
      .reordenar([
        { id: miembro.id, orden: ordenB },
        { id: otro.id, orden: ordenA },
      ])
      .subscribe({
        next: () => {
          miembro.orden = ordenB;
          otro.orden = ordenA;
          anillo.miembros.sort((a, b) => a.orden - b.orden);
          this.loader.hide();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loader.hide();
          this.errorSvc.handleError(err);
        },
      });
  }
}
