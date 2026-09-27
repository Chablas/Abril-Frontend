import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';

interface PetarVerificacionPublicaDto {
  encontrado: boolean;
  valido: boolean;
  workerNombre?: string;
  proyectoNombre?: string;
  tipoNombre?: string;
  fecha?: string;
  estado?: string;
}

/// Página PÚBLICA (sin login) del QR impreso en el PDF del PETAR — mismo patrón que ats-verificar.
@Component({
  selector: 'app-petar-verificar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './petar-verificar.html',
  styleUrl: './petar-verificar.css',
})
export class PetarVerificar implements OnInit {
  cargando = true;
  resultado: PetarVerificacionPublicaDto | null = null;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const hash = this.route.snapshot.queryParamMap.get('hash') ?? '';
    if (!id) {
      this.cargando = false;
      this.error = true;
      this.cdr.detectChanges();
      return;
    }

    const url = `${environment.apiUrl}api/v1/ssoma/petar/${id}/verificar-publico?hash=${encodeURIComponent(hash)}`;
    this.http.get<PetarVerificacionPublicaDto>(url).subscribe({
      next: (res) => {
        this.resultado = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }
}
