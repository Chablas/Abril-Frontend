import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HitoCriticoDisponibleDto, PersonalHitoDto, PersonalHitoItemInputDto } from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

type RolPersonal = 'PREVENCIONISTA' | 'MONITOR' | 'VIGIA';

interface FilaPersonalHito extends PersonalHitoItemInputDto {
  hitoDescripcion: string;
  hitoFecha: string | null;
  total: number;
}

const ROLES: RolPersonal[] = ['PREVENCIONISTA', 'MONITOR', 'VIGIA'];
const SEMANAS_POR_MES = 4.345;

@Component({
  selector: 'app-personal-hitos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './personal-hitos-page.html',
  styleUrl: './personal-hitos-page.css',
})
export class PersonalHitosPage implements OnInit {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  projectId!: number;
  loading = false;
  guardando = false;

  hitosCriticos: HitoCriticoDisponibleDto[] = [];
  /** Una fila por hito × rol, filas sin cantidad/costo cargado simplemente no se guardan. */
  filas: FilaPersonalHito[] = [];

  readonly roles = ROLES;

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getHitosCriticosDisponibles(this.projectId).subscribe({
      next: (hitos) => {
        this.hitosCriticos = hitos;
        this.svc.getPersonalHitos(this.projectId).subscribe({
          next: (existentes) => {
            this.construirFilas(hitos, existentes);
            this.loading = false;
            this.loader.hide();
            this.cdr.markForCheck();
          },
          error: (err: HttpErrorResponse) => this.onError(err),
        });
      },
      error: (err: HttpErrorResponse) => this.onError(err),
    });
  }

  private construirFilas(hitos: HitoCriticoDisponibleDto[], existentes: PersonalHitoDto[]): void {
    this.filas = [];
    for (const hito of hitos) {
      for (const rol of ROLES) {
        const existente = existentes.find((e) => e.hitoId === hito.hitoId && e.rol === rol);
        this.filas.push({
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

  recalcularTotal(fila: FilaPersonalHito): void {
    fila.total = fila.cantidad * fila.costoMensual * (fila.semanas / SEMANAS_POR_MES);
  }

  get totalGeneral(): number {
    return this.filas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  /** Agrupa las filas por hito para pintar una sección por hito con sus 3 roles debajo. */
  get hitosAgrupados(): { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }[] {
    const grupos = new Map<number, { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }>();
    for (const fila of this.filas) {
      if (!grupos.has(fila.hitoId)) {
        grupos.set(fila.hitoId, { hitoId: fila.hitoId, hitoDescripcion: fila.hitoDescripcion, hitoFecha: fila.hitoFecha, filas: [] });
      }
      grupos.get(fila.hitoId)!.filas.push(fila);
    }
    return Array.from(grupos.values());
  }

  guardar(): void {
    if (this.guardando) return;
    const items = this.filas
      .filter((f) => f.cantidad > 0 && f.costoMensual > 0)
      .map((f) => ({ hitoId: f.hitoId, rol: f.rol, cantidad: f.cantidad, semanas: f.semanas, costoMensual: f.costoMensual }));

    this.guardando = true;
    this.loader.show();
    this.svc.guardarPersonalHitos(this.projectId, { items }).subscribe({
      next: () => {
        this.guardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Dotación de personal guardada', draggable: true });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private onError(err: HttpErrorResponse): void {
    this.loading = false;
    this.loader.hide();
    this.error.handleError(err);
    this.cdr.markForCheck();
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', this.projectId]);
  }
}
