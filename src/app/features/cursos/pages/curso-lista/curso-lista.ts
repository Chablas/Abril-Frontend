import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { CursoService } from '../../services/curso.service';
import { MiCursoProgresoDto } from '../../dtos/curso.dtos';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-curso-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './curso-lista.html',
  styleUrl: './curso-lista.css',
})
export class CursoLista implements OnInit {
  cursos: MiCursoProgresoDto[] = [];
  cargando = true;
  errorMensaje = '';
  nombreUsuario: string | null = null;
  iniciales = '';

  filtroBusqueda = '';
  menuNotificacionesAbierto = false;
  menuCuentaAbierto = false;

  @ViewChild('grillaCursos') private grillaCursosRef?: ElementRef<HTMLElement>;

  constructor(
    private cursoService: CursoService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    const nombreCompleto = this.authService.getUserName() ?? '';
    this.nombreUsuario = nombreCompleto.split(' ')[0] || null;
    this.iniciales = nombreCompleto
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    this.cargarCursos();
  }

  /** Cierra los menús desplegables (notificaciones/cuenta) al hacer clic fuera. */
  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuNotificacionesAbierto = false;
      this.menuCuentaAbierto = false;
    }
  }

  toggleNotificaciones(event: Event): void {
    event.stopPropagation();
    this.menuNotificacionesAbierto = !this.menuNotificacionesAbierto;
    this.menuCuentaAbierto = false;
  }

  toggleCuenta(event: Event): void {
    event.stopPropagation();
    this.menuCuentaAbierto = !this.menuCuentaAbierto;
    this.menuNotificacionesAbierto = false;
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  /** Cursos pendientes/en progreso — la campana avisa de estos, es lo único real que hay
   *  que "notificar" en este dashboard (no hay backend de notificaciones para Cursos). */
  get cursosPendientesNotificacion(): MiCursoProgresoDto[] {
    return this.cursos.filter((c) => c.estado === 'no_iniciado' || c.estado === 'en_progreso');
  }

  get cursosFiltrados(): MiCursoProgresoDto[] {
    const q = this.filtroBusqueda.trim().toLowerCase();
    if (!q) return this.cursos;
    return this.cursos.filter(
      (c) => c.titulo.toLowerCase().includes(q) || (c.categoriaNombre ?? '').toLowerCase().includes(q),
    );
  }

  private cargarCursos(): void {
    this.cargando = true;
    this.cursoService.getMisCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMensaje = err.error?.message ?? 'No se pudieron cargar los cursos.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ---- Métricas reales del dashboard (nada inventado: todo sale de MiCursoProgresoDto) ----

  get completados(): number {
    return this.cursos.filter((c) => c.estado === 'aprobado').length;
  }

  get enProgreso(): number {
    return this.cursos.filter((c) => c.estado === 'en_progreso').length;
  }

  get pendientes(): number {
    return this.cursos.filter((c) => c.estado === 'no_iniciado' || c.estado === 'desaprobado').length;
  }

  /** Aproximación (ver nota en MiCursoProgresoDto.segundosInvertidos) — no es tiempo de
   *  sesión real, es la suma de lo que cada respuesta tardó en contestarse. */
  get horasCursadas(): number {
    const totalSeg = this.cursos.reduce((acc, c) => acc + (c.segundosInvertidos || 0), 0);
    return Math.round((totalSeg / 3600) * 10) / 10;
  }

  get porcentajeGeneral(): number {
    if (!this.cursos.length) return 0;
    const totalSlides = this.cursos.reduce((acc, c) => acc + c.totalSlides, 0);
    if (!totalSlides) return 0;
    const respondidas = this.cursos.reduce((acc, c) => {
      if (c.estado === 'aprobado' || c.estado === 'desaprobado') return acc + c.totalSlides;
      return acc + c.slidesRespondidas;
    }, 0);
    return Math.round((respondidas / totalSlides) * 100);
  }

  /** El curso "en progreso" más reciente (fechaInicio), para la fila "Continúa aprendiendo". */
  get cursoEnProgreso(): MiCursoProgresoDto | null {
    const enProgreso = this.cursos
      .filter((c) => c.estado === 'en_progreso')
      .sort((a, b) => (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? ''));
    return enProgreso[0] ?? null;
  }

  progresoPct(curso: MiCursoProgresoDto): number {
    if (curso.estado === 'aprobado' || curso.estado === 'desaprobado') return 100;
    if (!curso.totalSlides) return 0;
    return Math.round((curso.slidesRespondidas / curso.totalSlides) * 100);
  }

  etiquetaEstado(curso: MiCursoProgresoDto): string {
    switch (curso.estado) {
      case 'aprobado':
        return 'Completado';
      case 'desaprobado':
        return 'Repetir';
      case 'en_progreso':
        return 'Continuar';
      default:
        return 'Pendiente';
    }
  }

  irAGrillaCursos(): void {
    this.grillaCursosRef?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  tomarCurso(curso: MiCursoProgresoDto): void {
    this.router.navigate(['/cursos', curso.cursoId, 'tomar']);
  }

  editarCurso(curso: MiCursoProgresoDto, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/cursos/editor', curso.cursoId]);
  }
}
