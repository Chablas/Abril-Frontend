import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { ReunionAgendaDTO } from '../dtos/actas-reunion.dto';

/**
 * Página de acceso directo (desde el link del recordatorio) para cargar los temas a
 * tratar de una reunión. Sin menús ni pestañas: solo lo necesario para que el
 * convocado entre, escriba sus temas y guarde, lo más rápido posible.
 */
@Component({
  selector: 'app-reunion-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reunion-agenda.html',
})
export class ReunionAgenda implements OnInit {
  reunionId!: number;
  agenda: ReunionAgendaDTO | null = null;
  misTemasLista: string[] = [];
  nuevoTema = '';
  guardado = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.reunionId = Number(this.route.snapshot.paramMap.get('reunionId'));
    this.loaderService.show();
    this.service.getAgenda(this.reunionId).subscribe({
      next: (data) => {
        this.agenda = data;
        this.misTemasLista = data.items
          .filter((i) => i.workerId === data.workerIdActual)
          .map((i) => i.descripcion);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get otrosTemas() {
    if (!this.agenda) return [];
    return this.agenda.items.filter((i) => i.workerId !== this.agenda!.workerIdActual);
  }

  agregarTema(): void {
    const texto = this.nuevoTema.trim();
    if (!texto) return;
    this.misTemasLista.push(texto);
    this.nuevoTema = '';
  }

  removerTema(index: number): void {
    this.misTemasLista.splice(index, 1);
  }

  guardar(): void {
    if (this.misTemasLista.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin temas',
        text: 'Agrega al menos un tema a tratar.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }
    const temas = this.misTemasLista.map((descripcion) => ({ descripcion }));

    this.loaderService.show();
    this.service.guardarMisTemas(this.reunionId, { temas }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.guardado = true;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  irAReunion(): void {
    this.router.navigate(['/projects/actas-reunion', this.reunionId]);
  }
}
