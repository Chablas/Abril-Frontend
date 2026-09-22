import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { CursoService } from '../../services/curso.service';
import { CursoDto } from '../../dtos/curso.dtos';

@Component({
  selector: 'app-curso-lista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './curso-lista.html',
  styleUrl: './curso-lista.css',
})
export class CursoLista implements OnInit {
  cursos: CursoDto[] = [];
  cargando = true;
  errorMensaje = '';

  constructor(
    private cursoService: CursoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarCursos();
  }

  private cargarCursos(): void {
    this.cargando = true;
    this.cursoService.getCursos().subscribe({
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

  tomarCurso(curso: CursoDto): void {
    this.router.navigate(['/cursos', curso.id, 'tomar']);
  }
}
