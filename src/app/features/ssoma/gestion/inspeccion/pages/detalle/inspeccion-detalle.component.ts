import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InspeccionService } from '../../inspeccion.service';
import {
  InspeccionDetalleDto,
  InspeccionHallazgoDto,
  InspeccionRespuestaDto,
  CerrarHallazgoRequest,
} from '../../inspeccion.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

interface GrupoRespuesta {
  categoria: string;
  items: InspeccionRespuestaDto[];
  expandido: boolean;
}

@Component({
  selector: 'app-inspeccion-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspeccion-detalle.component.html',
  styleUrl: './inspeccion-detalle.component.css',
})
export class InspeccionDetalleComponent implements OnInit {
  data: InspeccionDetalleDto | null = null;
  loading = true;
  id = 0;

  grupos: GrupoRespuesta[] = [];
  mostrarNA = false;

  hallazgoCierre: InspeccionHallazgoDto | null = null;
  cierreAccion = '';
  cierreFotoBase64 = '';
  cierreFotoPreview = '';
  cerrando = false;

  lightboxUrl = '';
  lightboxOpen = false;
  descargandoPdf = false;

  readonly circumference = 2 * Math.PI * 44;

  spUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://abrilinmob.sharepoint.com/sites/SSOMA-Powerapps/InspeccionesAbril2026/${url.startsWith('/') ? url.slice(1) : url}`;
  }

  constructor(
    private inspeccionService: InspeccionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.inspeccionService.getDetalle(this.id).subscribe({
      next: (d) => {
        this.data = d;
        this.grupos = this.buildGrupos(d.respuestas);
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private buildGrupos(respuestas: InspeccionRespuestaDto[]): GrupoRespuesta[] {
    const map = new Map<string, InspeccionRespuestaDto[]>();
    for (const r of respuestas) {
      const cat = r.categoria ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return Array.from(map.entries()).map(([categoria, items]) => ({
      categoria,
      items,
      expandido: true,
    }));
  }

  toggleGrupo(g: GrupoRespuesta): void {
    g.expandido = !g.expandido;
    this.cdr.markForCheck();
  }

  itemsVisibles(g: GrupoRespuesta): InspeccionRespuestaDto[] {
    return this.mostrarNA ? g.items : g.items.filter((i) => i.resultado !== 'NA');
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/lista']);
  }

  scoreClass(v?: number | null): string {
    if (v == null) return 'score-na';
    if (v >= 80) return 'score-verde';
    if (v >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  scoreDashOffset(v?: number | null): number {
    const pct = v != null ? Math.min(100, Math.max(0, v)) : 0;
    return this.circumference * (1 - pct / 100);
  }

  resultadoClass(r: string): string {
    if (r === 'Cumple') return 'res-cumple';
    if (r === 'NoCumple') return 'res-nocumple';
    return 'res-na';
  }

  tipoClass(tipo: string): string {
    if (tipo === 'Critico') return 'badge-critico';
    if (tipo === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }

  estadoHallazgoClass(estado: string): string {
    if (estado === 'Cerrado') return 'estado-cerrado';
    if (estado === 'EnProceso') return 'estado-proceso';
    return 'estado-abierto';
  }

  ambitoClass(ambito: string): string {
    if (ambito === 'Seguridad') return 'badge-seguridad';
    if (ambito === 'Salud') return 'badge-salud';
    return 'badge-ambiente';
  }

  abrirCierre(h: InspeccionHallazgoDto): void {
    this.hallazgoCierre = h;
    this.cierreAccion = '';
    this.cierreFotoBase64 = '';
    this.cierreFotoPreview = '';
    this.cdr.markForCheck();
  }

  cerrarDrawer(): void {
    this.hallazgoCierre = null;
    this.cdr.markForCheck();
  }

  onCierreFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      this.cierreFotoPreview = dataUrl;
      this.cierreFotoBase64 = dataUrl.split(',')[1];
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  confirmarCierre(): void {
    if (!this.cierreAccion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la acción correctiva', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (!this.hallazgoCierre) return;
    this.cerrando = true;
    this.loaderService.show();
    const req: CerrarHallazgoRequest = {
      accionCorrectiva: this.cierreAccion,
      evidenciaCierreBase64: this.cierreFotoBase64 || undefined,
    };
    this.inspeccionService.cerrarHallazgo(this.hallazgoCierre.id, req).subscribe({
      next: () => {
        this.cerrando = false;
        this.loaderService.hide();
        this.hallazgoCierre = null;
        Swal.fire({ icon: 'success', title: 'Hallazgo cerrado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.cerrando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  openLightbox(url: string): void {
    this.lightboxUrl = url;
    this.lightboxOpen = true;
    this.cdr.markForCheck();
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.cdr.markForCheck();
  }

  descargarPdf(): void {
    if (this.descargandoPdf) return;
    this.descargandoPdf = true;
    this.cdr.markForCheck();
    this.inspeccionService.descargarPdf(this.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Inspeccion_${this.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargandoPdf = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.descargandoPdf = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
