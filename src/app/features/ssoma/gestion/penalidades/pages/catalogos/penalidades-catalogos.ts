import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { PenalidadService } from '../../services/penalidad.service';
import { InfraccionAdminDto, UitAnioAdminDto } from '../../dtos/penalidad.dtos';
import { PENALIDADES_TABS } from '../../penalidades-tabs';

import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-penalidades-catalogos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './penalidades-catalogos.html',
  styleUrl: './penalidades-catalogos.css',
})
export class PenalidadesCatalogos implements OnInit {
  readonly tabs = PENALIDADES_TABS;

  infracciones: InfraccionAdminDto[] = [];
  uitAnios: UitAnioAdminDto[] = [];
  loading = false;

  // ── Formulario de infracción (crear/editar) ─────────────────────
  editandoInfraccionId: number | null = null;
  infNombre = '';
  infFactorUit: number | null = null;
  infMontoFijo: number | null = null;
  infDescripcion = '';
  infActivo = true;
  guardandoInfraccion = false;

  // ── Formulario de UIT (crear/editar) ────────────────────────────
  editandoUitId: number | null = null;
  uitAnio: number = new Date().getFullYear();
  uitValor: number | null = null;
  uitActivo = true;
  guardandoUit = false;

  constructor(
    private penalidadService: PenalidadService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    Promise.all([
      firstValueFrom(this.penalidadService.getInfraccionesAdmin(false)),
      firstValueFrom(this.penalidadService.getUitAnios()),
    ]).then(([infracciones, uit]) => {
      this.infracciones = infracciones ?? [];
      this.uitAnios = uit ?? [];
      this.loading = false;
      this.loaderService.hide();
      this.cdr.markForCheck();
    }).catch((err: HttpErrorResponse) => {
      this.loading = false;
      this.loaderService.hide();
      this.errorService.handleError(err);
      this.cdr.markForCheck();
    });
  }

  // ── Infracciones ─────────────────────────────────────────────────

  nuevaInfraccion(): void {
    this.editandoInfraccionId = null;
    this.infNombre = '';
    this.infFactorUit = null;
    this.infMontoFijo = null;
    this.infDescripcion = '';
    this.infActivo = true;
    this.cdr.markForCheck();
  }

  editarInfraccion(i: InfraccionAdminDto): void {
    this.editandoInfraccionId = i.id;
    this.infNombre = i.nombre;
    this.infFactorUit = i.factorUit ?? null;
    this.infMontoFijo = i.montoFijo ?? null;
    this.infDescripcion = i.descripcion ?? '';
    this.infActivo = i.activo;
    this.cdr.markForCheck();
  }

  get puedeGuardarInfraccion(): boolean {
    return !!this.infNombre.trim() && (this.infFactorUit != null || this.infMontoFijo != null) && !this.guardandoInfraccion;
  }

  guardarInfraccion(): void {
    if (!this.puedeGuardarInfraccion) return;
    this.guardandoInfraccion = true;
    const req = {
      nombre: this.infNombre.trim(),
      factorUit: this.infFactorUit ?? undefined,
      montoFijo: this.infMontoFijo ?? undefined,
      descripcion: this.infDescripcion || undefined,
      activo: this.infActivo,
    };
    const obs = this.editandoInfraccionId
      ? this.penalidadService.actualizarInfraccion(this.editandoInfraccionId, req)
      : this.penalidadService.crearInfraccion(req);
    obs.subscribe({
      next: () => { this.guardandoInfraccion = false; Swal.fire('Guardado', '', 'success'); this.nuevaInfraccion(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoInfraccion = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── UIT ──────────────────────────────────────────────────────────

  nuevoUit(): void {
    this.editandoUitId = null;
    this.uitAnio = new Date().getFullYear();
    this.uitValor = null;
    this.uitActivo = true;
    this.cdr.markForCheck();
  }

  editarUit(u: UitAnioAdminDto): void {
    this.editandoUitId = u.id;
    this.uitAnio = u.anio;
    this.uitValor = u.valor;
    this.uitActivo = u.activo;
    this.cdr.markForCheck();
  }

  get puedeGuardarUit(): boolean {
    return this.uitAnio > 2000 && !!this.uitValor && this.uitValor > 0 && !this.guardandoUit;
  }

  guardarUit(): void {
    if (!this.puedeGuardarUit) return;
    this.guardandoUit = true;
    const req = { anio: this.uitAnio, valor: this.uitValor!, activo: this.uitActivo };
    const obs = this.editandoUitId
      ? this.penalidadService.actualizarUitAnio(this.editandoUitId, req)
      : this.penalidadService.crearUitAnio(req);
    obs.subscribe({
      next: () => { this.guardandoUit = false; Swal.fire('Guardado', '', 'success'); this.nuevoUit(); this.load(); },
      error: (err: HttpErrorResponse) => { this.guardandoUit = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }
}
