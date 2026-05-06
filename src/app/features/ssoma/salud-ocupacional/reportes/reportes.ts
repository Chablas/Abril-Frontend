import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-salud-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
})
export class Reportes {
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  loading = false;

  readonly meses = [
    { v: 1, l: 'Enero' },
    { v: 2, l: 'Febrero' },
    { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' },
    { v: 5, l: 'Mayo' },
    { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' },
    { v: 8, l: 'Agosto' },
    { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' },
    { v: 11, l: 'Noviembre' },
    { v: 12, l: 'Diciembre' },
  ];
  readonly anios = [2024, 2025, 2026];

  exportar(): void {
    // TODO: conectar con backend
    alert('Endpoint de reporte pendiente de implementar en backend.');
  }
}
