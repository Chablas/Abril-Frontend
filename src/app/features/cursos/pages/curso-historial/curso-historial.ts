import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { CursoService } from '../../services/curso.service';
import { CursoDto, CursoIntentoDetalleDto, CursoIntentoHistorialDto } from '../../dtos/curso.dtos';

@Component({
  selector: 'app-curso-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-historial.html',
  styleUrl: './curso-historial.css',
})
export class CursoHistorial implements OnInit {
  cursos: CursoDto[] = [];
  intentos: CursoIntentoHistorialDto[] = [];
  cargando = true;
  errorMensaje = '';

  filtroCursoId: number | null = null;
  filtroDesde = '';
  filtroHasta = '';

  detalleAbierto: CursoIntentoDetalleDto | null = null;
  cargandoDetalle = false;

  constructor(
    private cursoService: CursoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cursoService.getCursosAdmin().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cdr.detectChanges();
      },
    });
    this.buscar();
  }

  buscar(): void {
    this.cargando = true;
    this.errorMensaje = '';
    const filtros = {
      cursoId: this.filtroCursoId ?? undefined,
      desde: this.filtroDesde ? new Date(this.filtroDesde).toISOString() : undefined,
      hasta: this.filtroHasta ? new Date(this.filtroHasta + 'T23:59:59').toISOString() : undefined,
    };
    this.cursoService.getHistorialIntentos(filtros).subscribe({
      next: (intentos) => {
        this.intentos = intentos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMensaje = err.error?.message ?? 'No se pudo cargar el historial.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroCursoId = null;
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.buscar();
  }

  etiquetaEstado(intento: CursoIntentoHistorialDto): string {
    if (intento.estado === 'en_progreso') return 'En progreso';
    return intento.aprobado ? 'Aprobado' : 'Desaprobado';
  }

  claseEstado(intento: CursoIntentoHistorialDto): string {
    if (intento.estado === 'en_progreso') return 'estado--en_progreso';
    return intento.aprobado ? 'estado--aprobado' : 'estado--desaprobado';
  }

  verDetalle(intento: CursoIntentoHistorialDto): void {
    this.cargandoDetalle = true;
    this.detalleAbierto = null;
    this.cursoService.getDetalle(intento.intentoId).subscribe({
      next: (detalle) => {
        this.detalleAbierto = detalle;
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleAbierto = null;
  }

  /** Exporta la tabla filtrada tal cual se ve (fila = un intento) a CSV — evidencia
   *  portátil para una inspección SUNAFIL sin depender de que abramos la app en el sitio. */
  exportarCsv(): void {
    const encabezado = [
      'Curso', 'Trabajador', 'Fecha inicio', 'Fecha fin', 'Nota', 'Estado', 'IP', 'Hash SHA-256', 'Sellado',
    ];
    const filas = this.intentos.map((i) => [
      i.cursoTitulo,
      i.trabajadorNombre,
      i.fechaInicio,
      i.fechaFin ?? '',
      i.notaFinal ?? '',
      this.etiquetaEstado(i),
      i.ipAddress ?? '',
      i.hashSha256 ?? '',
      i.selladoAt ?? '',
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-evaluaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
