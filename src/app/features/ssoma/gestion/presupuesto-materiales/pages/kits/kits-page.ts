import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { KitResumenDto, KitDetalleDto, KitCalculoLineaDto } from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';

@Component({
  selector: 'app-kits-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './kits-page.html',
  styleUrl: './kits-page.css',
})
export class KitsPage implements OnInit {
  readonly headerTabs = PRESUPUESTO_TABS;
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);

  loading = false;
  kits: KitResumenDto[] = [];
  kitSeleccionadoId: number | null = null;
  kitDetalle: KitDetalleDto | null = null;
  cantidadKits: number | null = null;
  resultado: KitCalculoLineaDto[] = [];

  ngOnInit(): void {
    this.loading = true;
    this.loader.show();
    this.svc.listarKits().subscribe({
      next: (kits) => {
        this.kits = kits;
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

  onSeleccionarKit(): void {
    this.resultado = [];
    this.cantidadKits = null;
    if (this.kitSeleccionadoId == null) {
      this.kitDetalle = null;
      return;
    }
    this.loader.show();
    this.svc.getKit(this.kitSeleccionadoId).subscribe({
      next: (kit) => {
        this.kitDetalle = kit;
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

  calcular(): void {
    if (!this.kitSeleccionadoId || !this.cantidadKits || this.cantidadKits <= 0) return;
    this.loader.show();
    this.svc.calcularKit(this.kitSeleccionadoId, this.cantidadKits).subscribe({
      next: (lineas) => {
        this.resultado = lineas;
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

  get consumibles(): KitCalculoLineaDto[] {
    return this.resultado.filter((r) => r.esConsumible);
  }

  get durables(): KitCalculoLineaDto[] {
    return this.resultado.filter((r) => !r.esConsumible);
  }
}
