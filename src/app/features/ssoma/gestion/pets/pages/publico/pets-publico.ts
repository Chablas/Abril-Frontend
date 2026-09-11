import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PetsService } from '../../pets.service';
import { PetPublicoListItemDto } from '../../pets.dtos';

@Component({
  selector: 'app-pets-publico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pets-publico.html',
  styleUrl: './pets-publico.css',
})
export class PetsPublico implements OnInit {
  lista: PetPublicoListItemDto[] = [];
  busqueda = '';
  cargando = true;
  error = false;
  abriendoId: number | null = null;

  constructor(private petsService: PetsService) {}

  ngOnInit(): void {
    this.petsService.getListaPublica().subscribe({
      next: (data) => {
        this.lista = data;
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      },
    });
  }

  get filtrada(): PetPublicoListItemDto[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.lista;
    return this.lista.filter(
      (p) => p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q),
    );
  }

  abrirPdf(pet: PetPublicoListItemDto): void {
    this.abriendoId = pet.id;
    this.petsService.exportarPdfPublico(pet.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.abriendoId = null;
      },
      error: () => {
        this.abriendoId = null;
      },
    });
  }
}
