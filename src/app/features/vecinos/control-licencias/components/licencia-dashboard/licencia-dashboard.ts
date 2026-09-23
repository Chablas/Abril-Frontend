import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
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

/** Imagen precargada como data URI + su relación de aspecto, para insertarla en el PDF sin deformarla. */
interface ImagenPdf {
  dataUrl: string;
  ratio: number; // alto / ancho
}

/** Dashboard gerencial: todas las obras (o las que se filtren), ordenadas de más a menos crítico. */
@Component({
  selector: 'app-licencia-dashboard',
  standalone: true,
  imports: [CommonModule, MultiSearchSelect],
  templateUrl: './licencia-dashboard.html',
})
export class LicenciaDashboard implements OnInit {
  @ViewChild('logoFileInput') logoFileInput?: ElementRef<HTMLInputElement>;

  proyectos: ProjectOptionDTO[] = [];
  selectedProjectIds: number[] = [];

  items: VecinoLicenciaDashboardItemDTO[] = [];
  resumen: VecinoLicenciaDashboardResumenDTO | null = null;
  loaded = false;
  exportando = false;
  exportandoPdf = false;
  subiendoLogo = false;

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
        this.avisarSiFaltaLogo();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Proyecto seleccionado, cuando hay exactamente una obra elegida. */
  get proyectoUnico(): ProjectOptionDTO | null {
    if (this.selectedProjectIds.length !== 1) return null;
    return this.proyectos.find((p) => p.projectId === this.selectedProjectIds[0]) ?? null;
  }

  /** Si la obra seleccionada no tiene logo, un modal simple lo avisa y ofrece subirlo. Si lo tiene, no hace nada. */
  private avisarSiFaltaLogo(): void {
    const proyecto = this.proyectoUnico;
    if (!proyecto || proyecto.logoUrl) return;

    Swal.fire({
      icon: 'warning',
      title: 'Falta el logo del proyecto',
      text: 'Este proyecto todavía no tiene logo para el PDF de Control de Licencias.',
      confirmButtonText: 'Subir logo',
      confirmButtonColor: '#0F6E56',
      showCancelButton: true,
      cancelButtonText: 'Más tarde',
    }).then((result) => {
      if (result.isConfirmed) this.logoFileInput?.nativeElement.click();
    });
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const proyecto = this.proyectoUnico;
    if (!proyecto) return;

    this.subiendoLogo = true;
    this.service.uploadLogo(proyecto.projectId, file).subscribe({
      next: (res) => {
        proyecto.logoUrl = res.logoUrl;
        this.items
          .filter((i) => i.projectId === proyecto.projectId)
          .forEach((i) => (i.logoUrl = res.logoUrl));
        this.subiendoLogo = false;
        Swal.fire({ icon: 'success', title: 'Logo actualizado', confirmButtonColor: '#0F6E56', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoLogo = false;
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

  /** URL del logo del proyecto servida por el propio backend (no la URL directa del storage: Azure Blob no tiene CORS habilitado y bloquea la carga en el navegador). */
  private logoProyectoUrl(projectId: number): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/api/v1/ControlLicencias/proyectos/${projectId}/logo`;
  }

  /** Carga una imagen (misma URL de la app o remota) como data URI + su relación de aspecto. Si falla (CORS, 404), resuelve null. */
  private cargarImagenPdf(url: string): Promise<ImagenPdf | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1;
          canvas.height = img.naturalHeight || 1;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), ratio: canvas.height / canvas.width });
        } catch {
          resolve(null); // canvas "tainted" por CORS: se cae al placeholder de texto.
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  /** Categoría visual de un tipo de licencia, por palabras clave en su descripción — para elegir el ícono de la fila. */
  private categoriaIcono(tipoDescripcion: string): 'grua' | 'via' | 'salud' | 'marketing' | 'documento' {
    const t = tipoDescripcion.toLowerCase();
    if (t.includes('grúa') || t.includes('grua')) return 'grua';
    if (t.includes('vía') || t.includes('via') || t.includes('interferencia')) return 'via';
    if (t.includes('sctr') || t.includes('vida ley') || t.includes('salud') || t.includes('emo')) return 'salud';
    if (t.includes('publicidad') || t.includes('marketing')) return 'marketing';
    return 'documento';
  }

  /**
   * Ícono simple (formas vectoriales, sin imágenes) por categoría, dentro de un círculo de fondo.
   * No son las ilustraciones a color de la plantilla de referencia (eso requiere assets de diseño
   * gráfico aparte); esto distingue cada fila con un glifo propio usando solo lo que jsPDF dibuja.
   */
  private dibujarIconoConcepto(
    pdf: jsPDF,
    categoria: ReturnType<LicenciaDashboard['categoriaIcono']>,
    cx: number,
    cy: number,
    r: number,
    fondo: [number, number, number],
    trazo: [number, number, number],
  ): void {
    pdf.setFillColor(...fondo);
    pdf.circle(cx, cy, r, 'F');
    pdf.setDrawColor(...trazo);
    pdf.setLineWidth(0.35);

    switch (categoria) {
      case 'grua':
        pdf.line(cx - r * 0.3, cy + r * 0.5, cx - r * 0.3, cy - r * 0.5);
        pdf.line(cx - r * 0.3, cy - r * 0.5, cx + r * 0.5, cy - r * 0.5);
        pdf.line(cx + r * 0.2, cy - r * 0.5, cx + r * 0.2, cy + r * 0.1);
        break;
      case 'via':
        pdf.line(cx - r * 0.5, cy + r * 0.45, cx + r * 0.5, cy - r * 0.45);
        pdf.circle(cx - r * 0.2, cy + r * 0.05, 0.25, 'F');
        pdf.circle(cx + r * 0.2, cy - r * 0.15, 0.25, 'F');
        break;
      case 'salud':
        pdf.line(cx, cy - r * 0.5, cx, cy + r * 0.5);
        pdf.line(cx - r * 0.5, cy, cx + r * 0.5, cy);
        break;
      case 'marketing':
        pdf.triangle(cx - r * 0.45, cy + r * 0.4, cx + r * 0.5, cy + r * 0.4, cx, cy - r * 0.5, 'S');
        break;
      default:
        pdf.rect(cx - r * 0.35, cy - r * 0.5, r * 0.7, r, 'S');
        pdf.line(cx - r * 0.2, cy - r * 0.15, cx + r * 0.2, cy - r * 0.15);
        pdf.line(cx - r * 0.2, cy + r * 0.15, cx + r * 0.2, cy + r * 0.15);
    }
    pdf.setDrawColor(0);
  }

  /** Dibuja un logo dentro de un ancho/alto máximo, respetando su relación de aspecto (nunca lo deforma ni lo corta). */
  private dibujarLogo(pdf: jsPDF, logo: ImagenPdf, x: number, y: number, maxW: number, maxH: number): void {
    let w = maxW;
    let h = w * logo.ratio;
    if (h > maxH) {
      h = maxH;
      w = h / logo.ratio;
    }
    pdf.addImage(logo.dataUrl, 'PNG', x, y, w, h);
  }

  async exportarPdf(): Promise<void> {
    if (!this.items.length || !this.resumen) return;

    this.exportandoPdf = true;
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageW = 297;
      const marginX = 10;

      const porObra = new Map<number, VecinoLicenciaDashboardItemDTO[]>();
      for (const item of this.items) {
        if (!porObra.has(item.projectId)) porObra.set(item.projectId, []);
        porObra.get(item.projectId)!.push(item);
      }

      const logoAbril = await this.cargarImagenPdf('/images/abril-logo.png');
      const logosProyecto = new Map<number, ImagenPdf | null>();
      for (const [projectId, itemsObra] of porObra) {
        const url = itemsObra[0].logoUrl;
        logosProyecto.set(projectId, url ? await this.cargarImagenPdf(this.logoProyectoUrl(projectId)) : null);
      }

      let primera = true;
      for (const [projectId, itemsObra] of porObra) {
        if (!primera) pdf.addPage();
        primera = false;
        this.dibujarPaginaObra(pdf, itemsObra, pageW, marginX, logoAbril, logosProyecto.get(projectId) ?? null);
      }

      pdf.save(`ControlLicencias_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      this.exportandoPdf = false;
    }
  }

  private dibujarPaginaObra(
    pdf: jsPDF,
    itemsObra: VecinoLicenciaDashboardItemDTO[],
    pageW: number,
    marginX: number,
    logoAbril: ImagenPdf | null,
    logoProyecto: ImagenPdf | null,
  ): void {
    const first = itemsObra[0];
    const usableW = pageW - marginX * 2;
    const logoMaxW = 30;
    const logoMaxH = 14;
    const colIzqAncho = 95; // ancho máximo del bloque Proyecto/Razón social/RUC, para que nunca choque con el título.
    const colDerAncho = 55; // ancho máximo reservado a la derecha (logo del proyecto o aviso de "logo pendiente").

    // ── Logo ABRIL (izquierda) ──────────────────────────────────────────────
    if (logoAbril) {
      this.dibujarLogo(pdf, logoAbril, marginX, 6, logoMaxW, logoMaxH);
    } else {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 110, 86);
      pdf.text('ABRIL', marginX, 12);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120);
      pdf.text('GRUPO INMOBILIARIO', marginX, 16);
    }

    // ── Logo del proyecto (derecha) o aviso de que falta subirlo ────────────
    const xDer = pageW - marginX - logoMaxW;
    if (logoProyecto) {
      this.dibujarLogo(pdf, logoProyecto, xDer, 6, logoMaxW, logoMaxH);
    } else {
      pdf.setDrawColor(217, 119, 6);
      pdf.setFillColor(255, 251, 235);
      pdf.roundedRect(pageW - marginX - colDerAncho, 6, colDerAncho, 10, 1.5, 1.5, 'FD');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(180, 83, 9);
      pdf.text('Falta subir el logo del proyecto', pageW - marginX - colDerAncho / 2, 12, { align: 'center', maxWidth: colDerAncho - 4 });
      pdf.setTextColor(0);
    }

    // ── Título (centro) ─────────────────────────────────────────────────────
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 60, 110);
    pdf.text('CONTROL DE LICENCIAS', pageW / 2, 13, { align: 'center' });
    pdf.setFillColor(15, 60, 110);
    pdf.roundedRect(pageW / 2 - 32, 16, 64, 6.5, 1.5, 1.5, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('ORGANIZADOR VISUAL', pageW / 2, 20.3, { align: 'center' });
    pdf.setTextColor(0);

    // ── Proyecto / Razón social / RUC (debajo del logo ABRIL, ancho acotado para no cortarse) ──
    // La columna de valores empieza después de la etiqueta más ancha ("RAZÓN SOCIAL:"), medida en
    // tiempo real: un offset fijo se quedaba corto y el valor tapaba la propia etiqueta.
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    const anchoEtiquetas = Math.max(
      pdf.getTextWidth('PROYECTO:'),
      pdf.getTextWidth('RAZÓN SOCIAL:'),
      pdf.getTextWidth('RUC:'),
    ) + 2;
    const valorX = marginX + anchoEtiquetas;
    const valorAncho = colIzqAncho - anchoEtiquetas;

    let y = 26;
    pdf.setTextColor(30, 41, 59);
    pdf.text('PROYECTO:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(first.projectDescription, valorAncho), valorX, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAZÓN SOCIAL:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(first.razonSocial ?? '—', valorAncho), valorX, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RUC:', marginX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(first.ruc ?? '—', valorX, y);
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
      startY: 42,
      margin: { left: marginX, right: marginX },
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2, halign: 'center', lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [15, 60, 110], textColor: 255, fontStyle: 'bold' },
      // Columnas de fecha con círculo-icono (como la leyenda): padding extra a la izquierda para que el texto no le pise el círculo.
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellPadding: { top: 2, bottom: 2, left: 9, right: 2 } },
        1: { cellPadding: { top: 2, bottom: 2, left: 6, right: 2 } },
        2: { cellPadding: { top: 2, bottom: 2, left: 6, right: 2 } },
        3: { cellPadding: { top: 2, bottom: 2, left: 6, right: 2 } },
        4: { cellPadding: { top: 2, bottom: 2, left: 6, right: 2 } },
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const it = itemsObra[data.row.index];
        if (data.column.index === 1) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaInscripcion, it.fechaInscripcionEstado);
        if (data.column.index === 2) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaInicio, it.fechaInicioEstado);
        if (data.column.index === 3) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaVencimiento, it.fechaVencimientoEstado);
        if (data.column.index === 4) data.cell.styles.fillColor = this.fechaCeldaColor(it.fechaRenovacion, it.fechaRenovacionEstado);
        if (data.column.index === 5) data.cell.styles.fillColor = it.mesActivo ? [220, 252, 231] : [254, 226, 226];
      },
      didDrawCell: (data) => {
        // Columna CONCEPTO: ícono por categoría del tipo de documento (grúa/vías/salud/marketing/documento genérico).
        if (data.column.index === 0) {
          const cx = data.cell.x + 4.2;
          const cy = data.cell.y + data.cell.height / 2;
          if (data.section === 'head') {
            this.dibujarIconoConcepto(pdf, 'documento', cx, cy, 2.6, [255, 255, 255], [15, 60, 110]);
          } else {
            const it = itemsObra[data.row.index];
            this.dibujarIconoConcepto(pdf, this.categoriaIcono(it.tipoDescripcion), cx, cy, 2.6, [15, 60, 110], [255, 255, 255]);
          }
          return;
        }

        // Círculo de color a la izquierda de la celda, en encabezado y en cada dato — mismo criterio que la leyenda.
        const colorPorColumna: Record<number, [number, number, number]> = {
          1: [59, 130, 246], // Inscripción — azul
          2: [34, 197, 94], // Inicio — verde
          3: [239, 68, 68], // Fin — rojo
          4: [59, 130, 246], // Renovación — azul
        };
        const color = colorPorColumna[data.column.index];
        if (!color) return;
        if (data.section === 'head') pdf.setFillColor(255, 255, 255); // sobre fondo navy, blanco da más contraste.
        else pdf.setFillColor(...color);
        pdf.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 1.3, 'F');
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
