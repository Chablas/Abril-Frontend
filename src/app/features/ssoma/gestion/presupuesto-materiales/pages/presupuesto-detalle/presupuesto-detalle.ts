import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PresupuestoDetalleDto, PresupuestoLineaDto, ActualizarLineaPresupuestoDto,
  PersonalHitoDto, VigilanciaHitoDto, ServicioFijoDto, KitProyectoGuardadoDto,
  PresupuestoDestinatarioDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-presupuesto-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './presupuesto-detalle.html',
  styleUrl: './presupuesto-detalle.css',
})
export class PresupuestoDetallePage implements OnInit {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  private cdr    = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  presupuestoId!: number;
  detalle: PresupuestoDetalleDto | null = null;
  loading = false;
  aprobando = false;

  // Edición inline de línea
  editandoLineaId: number | null = null;
  formLinea: ActualizarLineaPresupuestoDto = {};

  // Acordeón de tipos
  tipoAbierto: Set<number> = new Set();

  // Otras secciones del presupuesto que NO son materiales por ratio — ya suman al total del
  // presupuesto (PresupuestoTotalHelper en el backend) pero antes no aparecían en este resumen,
  // así que parecía que "faltaban" los kits, personal, vigilancia y servicios ya cargados.
  personalHitos: PersonalHitoDto[] = [];
  vigilanciaHitos: VigilanciaHitoDto[] = [];
  serviciosFijos: ServicioFijoDto[] = [];
  kitsGuardados: KitProyectoGuardadoDto[] = [];
  otrasSeccionesAbierto: Set<string> = new Set();

  get totalPersonal(): number { return this.personalHitos.reduce((a, p) => a + (p.total || 0), 0); }
  get totalVigilancia(): number { return this.vigilanciaHitos.reduce((a, v) => a + (v.total || 0), 0); }
  get totalServicios(): number { return this.serviciosFijos.reduce((a, s) => a + (s.total || 0), 0); }
  get totalKits(): number { return this.kitsGuardados.reduce((a, k) => a + (k.total || 0), 0); }

  toggleSeccion(id: string): void {
    if (this.otrasSeccionesAbierto.has(id)) this.otrasSeccionesAbierto.delete(id);
    else this.otrasSeccionesAbierto.add(id);
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.presupuestoId = Number(this.route.snapshot.paramMap.get('presupuestoId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getPresupuestoDetalle(this.presupuestoId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.cargarOtrasSecciones(d.projectId);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Personal, Vigilancia, Servicios y Kits no viven en el detalle del presupuesto (son tablas
   * aparte, editables desde "Datos Base" del proyecto) — se cargan por projectId, igual que en la
   * calculadora del proyecto, solo que acá es de solo lectura (el resumen completo). */
  private cargarOtrasSecciones(projectId: number): void {
    forkJoin({
      personal: this.svc.getPersonalHitos(projectId),
      vigilancia: this.svc.getVigilanciaHitos(projectId),
      servicios: this.svc.getServiciosFijos(projectId),
      kits: this.svc.getKitsGuardados(projectId),
    }).subscribe({
      next: ({ personal, vigilancia, servicios, kits }) => {
        this.personalHitos = personal;
        this.vigilanciaHitos = vigilancia;
        this.serviciosFijos = servicios;
        this.kitsGuardados = kits;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        // No bloquea la vista del presupuesto si estas secciones fallan — son informativas.
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleTipo(tipoId: number): void {
    if (this.tipoAbierto.has(tipoId)) this.tipoAbierto.delete(tipoId);
    else this.tipoAbierto.add(tipoId);
    this.cdr.markForCheck();
  }

  editarLinea(l: PresupuestoLineaDto): void {
    this.editandoLineaId = l.lineaId;
    this.formLinea = {
      cantidadManual: l.cantidadManual,
      precioManual:   l.precioManual,
      notasLinea:     l.notasLinea,
    };
    this.cdr.markForCheck();
  }

  cancelarEdicion(): void {
    this.editandoLineaId = null;
    this.cdr.markForCheck();
  }

  guardarLinea(lineaId: number): void {
    this.loader.show();
    this.svc.actualizarLinea(this.presupuestoId, lineaId, this.formLinea).subscribe({
      next: (d) => {
        this.detalle = d;
        this.editandoLineaId = null;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  aprobar(): void {
    this.loader.show();
    this.svc.getDestinatariosAprobacion(this.presupuestoId).subscribe({
      next: (destinatarios) => this.confirmarAprobacion(destinatarios),
      error: () => {
        // Si falla la vista previa, no bloquea aprobar — solo se pierde el detalle de a quién.
        this.confirmarAprobacion([]);
      },
    });
  }

  /** Muestra a quiénes se les va a avisar (mismo resolver que usa el envío real, así la vista
   * previa nunca puede mostrar algo distinto de lo que después se envía de verdad) y recién ahí
   * pide confirmar. */
  private confirmarAprobacion(destinatarios: PresupuestoDestinatarioDto[]): void {
    this.loader.hide();
    const listaHtml = destinatarios.length > 0
      ? `<ul style="text-align:left;margin:0.5rem 0 0;padding-left:1.2rem;">`
        + destinatarios.map((d) => `<li><strong>${d.rol}:</strong> ${d.email}</li>`).join('')
        + `</ul>`
      : `<p style="color:#b45309;">No se pudo resolver ningún destinatario válido — no se enviará ningún correo.</p>`;

    Swal.fire({
      icon: 'question',
      title: '¿Aprobar presupuesto?',
      html: `<p>Una vez aprobado podrás registrar el control semanal de consumo. Se avisará por correo a:</p>${listaHtml}`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar y enviar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.aprobando = true;
      this.loader.show();
      this.cdr.markForCheck();
      this.svc.aprobarPresupuesto(this.presupuestoId).subscribe({
        next: () => {
          this.aprobando = false;
          this.loader.hide();
          Swal.fire({ icon: 'success', title: 'Presupuesto aprobado', timer: 1800, showConfirmButton: false });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.aprobando = false;
          this.loader.hide();
          this.error.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  irAControl(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', this.presupuestoId, 'control']);
  }

  volver(): void {
    if (this.detalle) {
      this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', this.detalle.projectId]);
    }
  }

  totalEfectivo(l: PresupuestoLineaDto): number {
    return l.totalEfectivo;
  }

  tieneOverride(l: PresupuestoLineaDto): boolean {
    return l.cantidadManual !== null || l.precioManual !== null;
  }

  /** Nombre legible de la variable base (antes se mostraba el código crudo, ej. "AREATECHADA"). */
  baseLabel(variableBase: string): string {
    switch (variableBase) {
      case 'HH': return 'Horas-Hombre';
      case 'AREATECHADA': return 'Área Techada (m²)';
      case 'TRABAJADORES': return 'Trabajadores';
      case 'CALCULADO': return 'Calculado (sin ratio real)';
      case 'FIJO': return 'Monto fijo';
      case 'METRADO': return 'Metrado';
      default: return variableBase;
    }
  }
}
