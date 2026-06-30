import {
  Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { IndicadorProactivoProyectoDto, MetaEmpresaDto, PuntajeMesDto } from '../../indicadores-proactivos.dtos';
import { HttpClient } from '@angular/common/http';
import { SelectOption } from '../../../../../../shared/services/shared-filters.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-proyecto.component.html',
  styleUrls: ['./dashboard-proyecto.component.css'],
})
export class DashboardProyectoComponent implements OnInit, AfterViewInit {
  private svc      = inject(IndicadoresProactivosService);
  private loader   = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private http     = inject(HttpClient);

  @ViewChild('chartCanvas') chartCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportContent') reportContentRef!: ElementRef<HTMLDivElement>;

  private chart: Chart | null = null;

  proyectos = signal<SelectOption[]>([]);
  proyectoId = signal<number | null>(null);
  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());

  indicadores = signal<IndicadorProactivoProyectoDto | null>(null);
  puntaje     = signal<PuntajeMesDto | null>(null);
  exportando  = signal(false);
  empresaExpandida = signal<string | null>(null);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027];

  readonly INDICADORES = [
    { key: 'Racs',         label: 'RAC Generados',  color: '#0f4c75' },
    { key: 'RacsCerrados', label: 'RAC Cerrados',   color: '#1e88e5' },
    { key: 'Opt',          label: 'OPT',            color: '#7c3aed' },
    { key: 'Ats',          label: 'ATS',            color: '#0891b2' },
    { key: 'Charlas',      label: 'Charlas',        color: '#16a34a' },
    { key: 'Inspecciones', label: 'Inspecciones',   color: '#ea580c' },
  ];

  ngOnInit(): void {
    this.http.get<SelectOption[]>(`${environment.apiUrl}api/v1/shared-filters/proyectos`)
      .subscribe({ next: data => this.proyectos.set(data) });
  }

  ngAfterViewInit(): void {}

  cargar(): void {
    if (!this.proyectoId()) return;
    this.loader.show();
    this.indicadores.set(null);
    this.puntaje.set(null);

    forkJoin({
      ind: this.svc.getIndicadoresProyecto(this.proyectoId()!, this.mes(), this.anio()),
      pts: this.svc.getPuntaje(this.proyectoId()!, this.mes(), this.anio()),
    }).subscribe({
      next: ({ ind, pts }) => {
        this.indicadores.set(ind);
        this.puntaje.set(pts);
        this.loader.hide();
        setTimeout(() => this.renderChart(ind), 50);
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  private renderChart(ind: IndicadorProactivoProyectoDto): void {
    const canvas = this.chartCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    const labels = ind.empresas.filter(e => e.esActiva).map(e => e.empresaNombre);
    const datasets = this.INDICADORES.map(ind_ => ({
      label: ind_.label,
      data: ind.empresas.filter(e => e.esActiva).map(e => {
        const key = `pct${ind_.key}` as keyof MetaEmpresaDto;
        return Number(e[key]) ?? 0;
      }),
      backgroundColor: ind_.color + 'cc',
      borderColor: ind_.color,
      borderWidth: 1,
      borderRadius: 4,
    }));

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(0)}%` }
          },
        },
        scales: {
          y: {
            min: 0, max: 130,
            ticks: { callback: v => `${v}%`, stepSize: 25 },
            grid: { color: '#e2e8f0' },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  toggleEmpresa(nombre: string): void {
    this.empresaExpandida.set(this.empresaExpandida() === nombre ? null : nombre);
  }

  async exportarPDF(): Promise<void> {
    const el = this.reportContentRef?.nativeElement;
    if (!el) return;
    this.exportando.set(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f4f6f9' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW  = pageW - 20;
      const imgH  = imgW * ratio;

      if (imgH <= pageH - 20) {
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH);
      } else {
        // Multi-page
        let yPos = 0;
        while (yPos < canvas.height) {
          const sliceH = Math.min((pageH - 20) / (imgW / canvas.width), canvas.height - yPos);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext('2d')!.drawImage(canvas, 0, -yPos);
          if (yPos > 0) pdf.addPage();
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, sliceH * (imgW / canvas.width));
          yPos += sliceH;
        }
      }

      const ind = this.indicadores();
      pdf.save(`SSOMA-${ind?.proyectoNombre ?? 'proyecto'}-${this.nombreMes(this.mes())}-${this.anio()}.pdf`);
    } finally {
      this.exportando.set(false);
    }
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  pctClass(pct: number): string {
    if (pct >= 100) return 'pct--verde';
    if (pct >= 75)  return 'pct--amarillo';
    if (pct >= 50)  return 'pct--naranja';
    return 'pct--rojo';
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'score--verde';
    if (score >= 70) return 'score--amarillo';
    if (score >= 50) return 'score--naranja';
    return 'score--rojo';
  }

  gaugeOffset(score: number): number {
    return 251.2 * (1 - Math.min(score / 110, 1));
  }

  gaugeColor(score: number): string {
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#ca8a04';
    if (score >= 50) return '#ea580c';
    return '#dc2626';
  }

  barWidth(val: number): string {
    return `${Math.min(100, val)}%`;
  }

  pctEmpresa(emp: MetaEmpresaDto, key: string): number {
    return Number(emp[`pct${key}` as keyof MetaEmpresaDto]) ?? 0;
  }

  actualEmpresa(emp: MetaEmpresaDto, key: string): number {
    return Number(emp[`actual${key}` as keyof MetaEmpresaDto]) ?? 0;
  }

  metaEmpresa(emp: MetaEmpresaDto, key: string): number {
    return Number(emp[`meta${key}` as keyof MetaEmpresaDto]) ?? 0;
  }
}
