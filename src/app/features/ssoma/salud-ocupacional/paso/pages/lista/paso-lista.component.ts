import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PasoService } from '../../services/paso.service';
import { PasoDto, CreatePasoDto } from '../../dtos/paso.dtos';
import { InstanciarModalComponent } from '../../components/instanciar-modal/instanciar-modal.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-paso-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, InstanciarModalComponent],
  templateUrl: './paso-lista.component.html',
  styleUrl: './paso-lista.component.css',
})
export class PasoListaComponent implements OnInit {
  items: PasoDto[] = [];
  loading = false;

  filtros = { anio: new Date().getFullYear(), proyectoId: '', estado: '', esPlantilla: '' };
  anios = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i);

  // Crear modal
  crearOpen = false;
  crearForm: CreatePasoDto = { nombre: '', anio: new Date().getFullYear(), esPlantilla: false };
  saving = false;

  // Instanciar modal
  instanciarOpen = false;
  instanciarPasoId: number | null = null;
  instanciarNombre = '';

  // Export dropdown
  exportDropdownId: number | null = null;

  constructor(
    private pasoService: PasoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const params: any = { anio: this.filtros.anio };
    if (this.filtros.estado) params.estado = this.filtros.estado;
    if (this.filtros.esPlantilla !== '') params.esPlantilla = this.filtros.esPlantilla === 'true';
    this.pasoService.getAll(params).subscribe({
      next: (res) => {
        this.items = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  verDetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/paso', id]);
  }

  aprobar(item: PasoDto): void {
    Swal.fire({ icon: 'question', title: '¿Aprobar programa?', text: item.nombre, showCancelButton: true, confirmButtonText: 'Aprobar' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.pasoService.aprobar(item.id).subscribe({
          next: () => { Swal.fire('Aprobado', '', 'success'); this.load(); },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      });
  }

  abrirInstanciar(item: PasoDto): void {
    this.instanciarPasoId = item.id;
    this.instanciarNombre = item.nombre;
    this.instanciarOpen = true;
  }

  onInstanciaCreada(): void {
    this.instanciarOpen = false;
    this.load();
  }

  exportar(id: number, format: 'excel' | 'pdf'): void {
    this.exportDropdownId = null;
    this.pasoService.exportReporte(id, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PASO-${id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  crear(): void {
    if (!this.crearForm.nombre.trim()) return;
    this.saving = true;
    this.pasoService.create(this.crearForm).subscribe({
      next: (paso) => {
        this.saving = false;
        this.crearOpen = false;
        Swal.fire('Creado', '', 'success');
        this.router.navigate(['/ssoma/gestion/paso', paso.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  estadoBadge(estado: string): string {
    const map: Record<string, string> = {
      Borrador: 'bg-gray-100 text-gray-600',
      Aprobado: 'bg-blue-100 text-blue-700',
      Activo: 'bg-green-100 text-green-700',
      Cerrado: 'bg-gray-200 text-gray-800',
    };
    return map[estado] ?? 'bg-gray-100 text-gray-500';
  }
}
