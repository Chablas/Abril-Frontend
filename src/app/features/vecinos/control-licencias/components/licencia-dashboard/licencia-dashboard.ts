import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MultiSearchSelect } from '../../../../../shared/components/multi-search-select/multi-search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import {
  FECHA_ESTADO_LABEL,
  FechaEstado,
  ProjectOptionDTO,
  VecinoLicenciaDashboardItemDTO,
  VecinoLicenciaDashboardResumenDTO,
} from '../../dtos/control-licencias.dto';

/** Dashboard gerencial: todas las obras (o las que se filtren), ordenadas de más a menos crítico. */
@Component({
  selector: 'app-licencia-dashboard',
  standalone: true,
  imports: [CommonModule, MultiSearchSelect],
  templateUrl: './licencia-dashboard.html',
})
export class LicenciaDashboard implements OnInit {
  proyectos: ProjectOptionDTO[] = [];
  selectedProjectIds: number[] = [];

  items: VecinoLicenciaDashboardItemDTO[] = [];
  resumen: VecinoLicenciaDashboardResumenDTO | null = null;
  loaded = false;
  exportando = false;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // No se auto-carga: recorrer todos los proyectos es pesado, así que el usuario elige obra(s) primero.
    this.loaderService.show();
    this.service.getProyectos().subscribe({
      next: (proyectos) => {
        this.proyectos = proyectos;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onFiltroChange(): void {
    if (this.selectedProjectIds.length) this.load();
    else {
      this.items = [];
      this.resumen = null;
      this.loaded = false;
    }
  }

  load(): void {
    if (!this.selectedProjectIds.length) return;
    this.loaderService.show();
    this.service.getDashboard(this.selectedProjectIds).subscribe({
      next: (res) => {
        this.items = res.items;
        this.resumen = res.resumen;
        this.loaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  estadoFechaLabel(estado: FechaEstado | null): string {
    return estado ? FECHA_ESTADO_LABEL[estado] : '—';
  }

  /** Clase de color por celda de fecha: gris para "—", azul para Indeterminado, rojo para el resto de estados (No se cuenta/Pendiente/No registrada), blanco para fecha real. */
  fechaCellClass(fecha: string | null, estado: FechaEstado | null): string {
    if (fecha) return 'bg-white text-gray-700';
    if (!estado) return 'bg-gray-50 text-gray-300';
    if (estado === 'Indeterminado') return 'bg-blue-50 text-blue-700 font-medium';
    return 'bg-red-50 text-red-700 font-medium';
  }

  semaforoClass(semaforo: string): string {
    switch (semaforo) {
      case 'rojo': return 'bg-red-50 text-red-700 border-red-200';
      case 'amarillo': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'verde': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  }

  semaforoLabel(semaforo: string): string {
    switch (semaforo) {
      case 'rojo': return 'Crítico';
      case 'amarillo': return 'Alerta';
      case 'verde': return 'OK';
      default: return 'No aplica';
    }
  }

  exportar(): void {
    if (!this.selectedProjectIds.length) return;
    this.exportando = true;
    this.service.exportDashboard(this.selectedProjectIds).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ControlLicencias_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.exportando = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Exportar PDF "organizador visual" (una página por obra, para presentar en comité) ──

  private fechaCeldaTexto(fecha: string | null, estado: FechaEstado | null): string {
    if (fecha) {
      const [y, m, d] = fecha.split('-');
      return `${d}/${m}/${y}`;
    }
    return this.estadoFechaLabel(estado);
  }

  /** Color de fondo por celda: blanco (fecha real), azul (Indeterminado), rojo (otros estados), gris (vacío). */
  private fechaCeldaColor(fecha: string | null, estado: FechaEstado | null): [number, number, number] {
    if (fecha) return [255, 255, 255];
    if (!estado) return [249, 250, 251];
    if (estado === 'Indeterminado') return [219, 234, 254];
    return [254, 226, 226];
  }

  exportarPdf(): void {
    if (!this.items.length || !this.resumen) return;

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageW = 297;
    const marginX = 10;

    const porObra = new Map<number, VecinoLicenciaDashboardItemDTO[]>();
    for (const item of this.items) {
      if (!porObra.has(item.projectId)) porObra.set(item.projectId, []);
      porObra.get(item.projectId)!.push(item);
    }

    let primera = true;
    for (const [, itemsObra] of porObra) {
      if (!primera) pdf.addPage();
      primera = false;
      this.dibujarPaginaObra(pdf, itemsObra, pageW, marginX);
    }

    pdf.save(`ControlLicencias_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private dibujarPaginaObra(pdf: jsPDF, itemsObra: VecinoLicenciaDashboardItemDTO[], pageW: number, marginX: number): void {
    const first = itemsObra[0];
    const usableW = pageW - marginX * 2;

    // ── Encabezado: Proyecto / Razón social / RUC (izquierda) + título (centro) ──
    let y = 14;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('PROYECTO:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(first.projectDescription, marginX + 22, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAZÓN SOCIAL:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(first.razonSocial ?? '—', marginX + 22, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RUC:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(first.ruc ?? '—', marginX + 22, y);

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 60, 110);
    pdf.text('DOCUMENTOS ADMINISTRATIVOS', pageW / 2, 14, { align: 'center' });
    pdf.setFillColor(15, 60, 110);
    pdf.roundedRect(pageW / 2 - 35, 17, 70, 7, 1.5, 1.5, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text('ORGANIZADOR VISUAL', pageW / 2, 21.5, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 110, 86);
    pdf.text('ABRIL', pageW - marginX, 14, { align: 'right' });
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text('GRUPO INMOBILIARIO', pageW - marginX, 18, { align: 'right' });
    pdf.setTextColor(0);

    // ── Tabla ────────────────────────────────────────────────────────────────
    const head = [['CONCEPTO', 'INSCRIPCIÓN', 'INICIO', 'FIN', 'RENOVACIÓN', 'MES ACTIVO']];
    const body = itemsObra.map((it) => [
      it.tipoDescripcion,
      this.fechaCeldaTexto(it.fechaInscripcion, it.fechaInscripcionEstado),
      this.fechaCeldaTexto(it.fechaInicio, it.fechaInicioEstado),
      this.fechaCeldaTexto(it.fechaVencimiento, it.fechaVencimientoEstado),
      this.fechaCeldaTexto(it.fechaRenovacion, it.fechaRenovacionEstado),
      it.mesActivo ? 'SI' : 'NO',
    ]);

    autoTable(pdf, {
      startY: 28,
      margin: { left: marginX, right: marginX },
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2, halign: 'center', lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [15, 60, 110], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const it = itemsObra[data.row.index];
        if (data.column.index === 1) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaInscripcion, it.fechaInscripcionEstado);
        if (data.column.index === 2) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaInicio, it.fechaInicioEstado);
        if (data.column.index === 3) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaVencimiento, it.fechaVencimientoEstado);
        if (data.column.index === 4) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaRenovacion, it.fechaRenovacionEstado);
        if (data.column.index === 5) data.cell.styles.fillColor = it.mesActivo ? [220, 252, 231] : [254, 226, 226];
      },
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 8;

    // ── Leyenda ──────────────────────────────────────────────────────────────
    const leyenda: [string, [number, number, number]][] = [
      ['Inscripción', [59, 130, 246]],
      ['Inicio', [34, 197, 94]],
      ['Fin', [239, 68, 68]],
      ['Renovación', [59, 130, 246]],
    ];
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30);
    pdf.text('LEYENDA', marginX, finalY);
    let lx = marginX;
    let ly = finalY + 5;
    pdf.setFont('helvetica', 'normal');
    for (const [label, color] of leyenda) {
      pdf.setFillColor(...color);
      pdf.circle(lx + 1.5, ly - 1, 1.5, 'F');
      pdf.setTextColor(80);
      pdf.text(label, lx + 5, ly);
      lx += pdf.getTextWidth(label) + 16;
    }

    // ── Resumen general ──────────────────────────────────────────────────────
    const resumenObra = {
      documentos: itemsObra.length,
      activos: itemsObra.filter((i) => i.estadoDescripcion === 'Cargado' || i.estadoDescripcion === 'Por vencer').length,
      pendientes: itemsObra.filter((i) => i.estadoDescripcion === 'Pendiente').length,
      noAplica: itemsObra.filter((i) => i.estadoDescripcion === 'No aplica').length,
      noTiene: itemsObra.filter((i) => i.estadoDescripcion === 'Vencido').length,
    };
    const cards: [string, number, [number, number, number]][] = [
      ['DOCUMENTOS', resumenObra.documentos, [241, 245, 249]],
      ['ACTIVOS', resumenObra.activos, [220, 252, 231]],
      ['PENDIENTES', resumenObra.pendientes, [241, 245, 249]],
      ['NO APLICA', resumenObra.noAplica, [254, 249, 195]],
      ['NO TIENE', resumenObra.noTiene, [254, 226, 226]],
    ];
    const cardW = 30, cardH = 16, gap = 3;
    const cardsX = pageW - marginX - cards.length * (cardW + gap) + gap;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30);
    pdf.text('RESUMEN GENERAL', cardsX, finalY - 2);
    cards.forEach(([label, value, color], i) => {
      const cx = cardsX + i * (cardW + gap);
      pdf.setFillColor(...color);
      pdf.roundedRect(cx, finalY, cardW, cardH, 1.5, 1.5, 'F');
      pdf.setFontSize(11);
      pdf.setTextColor(30);
      pdf.text(String(value), cx + cardW / 2, finalY + 8, { align: 'center' });
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(90);
      pdf.text(label, cx + cardW / 2, finalY + 13, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
    });

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text(`Revisado al: ${new Date().toLocaleDateString('es-PE')}`, pageW - marginX, finalY + cardH + 6, { align: 'right' });
    pdf.setTextColor(0);
  }
}
