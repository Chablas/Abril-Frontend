import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EvEvaluacionService } from '../../services/ev-evaluacion.service';
import { EvPlantillaService } from '../../services/ev-plantilla.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';
import { EvEvaluacionResponseDto } from '../../dtos/ev-evaluacion.model';

interface ResidenteItem {
  userId: number;
  nombre: string;
  projectId: number | null;
  projectNombre: string | null;
}

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

@Component({
  selector: 'app-evaluar-residente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './evaluar-residente.html',
  styleUrl: './evaluar-residente.css',
})
export class EvaluarResidente implements OnInit {
  periodo: EvPeriodoDto | null = null;
  areas: string[] = [];
  areaSeleccionada: string | null = null;
  residentes: ResidenteItem[] = [];
  residenteSeleccionado: ResidenteItem | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';
  noAplica = false;
  noAplicaMotivo = '';
  guardando = false;
  misEvaluaciones: EvEvaluacionResponseDto[] = [];
  loading = true;
  errorMsg: string | null = null;
  successMsg: string | null = null;
  puntajes = [1, 2, 3, 4, 5];
  labelPuntaje: Record<number, string> = {
    1: 'Deficiente',
    2: 'Regular',
    3: 'Satisfactorio',
    4: 'Bueno',
    5: 'Sobresaliente',
  };

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => !d.esNa && d.puntaje !== null);
    if (!validos.length) return 0;
    const prom = validos.reduce((s, d) => s + d.puntaje!, 0) / validos.length;
    return Math.round(prom * 4 * 10) / 10;
  }

  get puedeGuardar(): boolean {
    if (!this.residenteSeleccionado || !this.areaSeleccionada) return false;
    if (this.noAplica) return this.noAplicaMotivo.trim().length > 0;
    return (
      this.detalles.some((d) => d.puntaje !== null || d.esNa) &&
      this.comentario.trim().length > 0
    );
  }

  constructor(
    private evalService: EvEvaluacionService,
    private plantillaService: EvPlantillaService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.periodoService.getActivo().subscribe({
      next: (p) => {
        this.periodo = p;
        this.loading = false;
        this.loadAreas();
        this.loadMisEvaluaciones();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadAreas(): void {
    this.plantillaService.getAreas().subscribe({
      next: (a) => {
        this.areas = a;
        this.cdr.detectChanges();
      },
    });
  }

  loadMisEvaluaciones(): void {
    this.evalService.getMisEvaluaciones().subscribe({
      next: (e) => {
        this.misEvaluaciones = e;
        this.cdr.detectChanges();
      },
    });
  }

  selectArea(area: string): void {
    this.areaSeleccionada = area;
    this.plantillaService.getByArea(area).subscribe({
      next: (criterios) => {
        this.detalles = criterios.map((c) => ({
          plantillaId: c.id,
          criterio: c.criterio,
          puntaje: null,
          esNa: false,
        }));
        this.cdr.detectChanges();
      },
    });
  }

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.detalles[idx].esNa = false;
    this.cdr.detectChanges();
  }

  setNa(idx: number): void {
    this.detalles[idx].esNa = true;
    this.detalles[idx].puntaje = null;
    this.cdr.detectChanges();
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.residenteSeleccionado || !this.areaSeleccionada) return;
    this.guardando = true;
    this.errorMsg = null;
    const dto = {
      evaluadoUserId: this.residenteSeleccionado.userId,
      projectId: this.residenteSeleccionado.projectId,
      areaNombre: this.areaSeleccionada,
      comentario: this.comentario || null,
      noAplica: this.noAplica,
      noAplicaMotivo: this.noAplicaMotivo || null,
      detalles: this.detalles,
    };
    this.evalService.crear(dto as any).subscribe({
      next: (r: any) => {
        this.guardando = false;
        this.successMsg = `Evaluación guardada · Nota: ${r.nota}`;
        this.loadMisEvaluaciones();
        this.resetForm();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (e: any) => {
        this.guardando = false;
        this.errorMsg = e.error?.message ?? 'Error al guardar la evaluación';
        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    this.residenteSeleccionado = null;
    this.areaSeleccionada = null;
    this.detalles = [];
    this.comentario = '';
    this.noAplica = false;
    this.noAplicaMotivo = '';
  }

  yaEvaluo(residenteId: number, area: string): boolean {
    return this.misEvaluaciones.some(
      (e) => e.evaluadoUserId === residenteId && e.areaNombre === area,
    );
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return 'score-eq';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
